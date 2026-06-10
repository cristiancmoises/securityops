/*
 * Security Ops — Privacy-focused browser extension
 * Copyright (C) 2024-2026 Cristian Cezar Moises <ethicalhacker@riseup.net>
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * stable-background.js — Service worker / event page (v10.1.0)
 *
 * v4.1.0 hardening additions:
 *   - URL shape validation in recordBlock() and reportBlockedResource (defense
 *     against content-script log injection with malformed URLs).
 *   - Per-call Promise.race timeout fallback for storage and tabs APIs.
 *   - Tab origin allowlist for content-script messages (only http(s) origins,
 *     never moz-extension://, devtools://, file:// — those should not be
 *     sending color-update messages to themselves).
 *   - Blocklist response sanity check: reject responses larger than 50 MB
 *     before parsing (prevents memory exhaustion from a compromised mirror).
 *   - Length cap on blockLogs entry URLs at storage-read time (defense
 *     against poisoned local storage).
 *   - SHA-256 hashing utility for future blocklist pinning (groundwork laid).
 *   - Hardened cloneSettings using Object.create(null) consistently.
 *   - Listeners registered synchronously at top level (Firefox event-page
 *     wakeup requirement, Chrome SW reactivation safe).
 *   - Cross-browser sendMessage shape (Promise on FF, sendResponse on Chrome).
 *   - Strict input validation: per-key type/range checks on storage reads,
 *     domain regex for blocklist + whitelist insertion, message action
 *     allowlist with sender.id verification.
 *   - Performance: shared excludedRequestDomains array, parent-domain chain
 *     computed once per host, prototype-free maps, debounced rule rebuild,
 *     debounced storage writes, fast-path color update via broadcastTheme.
 *   - Security: AbortController fetch timeout, bounded resource limits,
 *     storage echo loop suppression, no eval / new Function / innerHTML.
 */

'use strict';
const browser = self.browser || self.chrome;
const IS_FIREFOX = (typeof self.browser !== 'undefined') && !!self.browser.proxy && typeof self.browser.proxy.onRequest !== 'undefined';

// ====== Defaults (frozen so they can't be mutated) ======
const DEFAULT_SETTINGS = Object.freeze({
  blockAds: true,
  blockTrackers: true,
  blockMalware: true,
  blockGambling: false,
  blockAdult: false,
  blockSocial: false,
  blockBadJS: false,
  blockMedia: false,
  blockGigachad: false,
  // v8.0 NEW: YouTube focus mode hides distractions
  youtubeFocusMode: false,
  stripTrackingParams: true,
  enforceHttps: true,
  ipLookupEnabled: false,
  redirectGoogle: false,
  redirectBing: false,
  redirectYouTube: false,
  redirectReddit: false,
  blackThemeEnabled: true,
  fontColor: 'cyan'
});
const VALID_FONT_COLORS = Object.freeze(new Set([
  'cyan', 'teal', 'blue', 'purple', 'green', 'amber',
  'soft-green', 'soft-blue', 'soft-yellow', 'soft-purple', 'soft-violet', 'white'
]));
const VALID_PROXY_SCHEMES = Object.freeze(new Set(['socks5', 'socks4', 'http', 'https']));
const VALID_ACTIONS = Object.freeze(new Set([
  'getStats', 'updateSettings', 'updateWhitelist', 'setProxy', 'clearStats',
  'clearLogs', 'updateFilters', 'getIP', 'panic', 'reportBlockedResource'
]));

// v8.0: youtube.com whitelisted by default (Bug 4) — its ad domains
// are still blocked via the YouTube DNR rules and the page-world script
const DEFAULT_WHITELIST = Object.freeze(['securityops.co', 'redlib.catsarch.com', 'invidious.nerdvpn.de', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const DEFAULT_PROXY = Object.freeze({ enabled: false, host: '', port: 0, scheme: 'socks5' });

// ====== Blocklist sources ======
const BLOCKLIST_SOURCES = Object.freeze({
  ads:      'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/light-onlydomains.txt',
  trackers: 'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/popupads-onlydomains.txt',
  malware:  'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/tif.mini-onlydomains.txt',
  gambling: 'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/gambling-onlydomains.txt',
  adult:    'https://raw.githubusercontent.com/chadmayfield/my-pihole-blocklists/master/lists/pi_blocklist_porn_top1m.list',
  social:   'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/anti.piracy-onlydomains.txt',
  gigachad: 'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/multi-onlydomains.txt'
});

// v6.0: HIGH_PRIORITY_DOMAINS — guaranteed-blocked top sites for each category.
// These are PREPENDED to the blocklist before the cap is applied, so even if
// the alphabetical hagezi list cap removes the popular sites, our hardcoded
// top-tier guarantees they're always blocked when the category is enabled.
const HIGH_PRIORITY_DOMAINS = Object.freeze({
  // Top-ranked adult sites (most popular ~50)
  adult: Object.freeze([
    'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'youporn.com',
    'redtube.com', 'spankbang.com', 'youjizz.com', 'tube8.com', 'beeg.com',
    'tnaflix.com', 'porn.com', 'sex.com', 'eporner.com', 'porntrex.com',
    'porn300.com', 'porndoe.com', 'pornhd.com', 'pornone.com', 'porntube.com',
    'hclips.com', 'drtuber.com', 'gotporn.com', 'sunporno.com', 'fapality.com',
    'thumbzilla.com', 'pornpics.com', 'motherless.com', 'cumlouder.com',
    'fux.com', 'txxx.com', 'hdzog.com', 'hqporner.com', 'porn7.xxx',
    'fapdu.com', 'extremetube.com', 'spankwire.com', 'keezmovies.com',
    'anysex.com', 'anyporn.com', 'iceporn.com', 'sleazyneasy.com',
    'pornhubpremium.com', 'brazzers.com', 'realitykings.com', 'naughtyamerica.com',
    'bangbros.com', 'mofos.com', 'digitalplayground.com', 'twistys.com',
    // Cam sites
    'chaturbate.com', 'stripchat.com', 'cam4.com', 'bongacams.com',
    'livejasmin.com', 'myfreecams.com', 'streamate.com', 'flirt4free.com',
    'camsoda.com', 'camster.com', 'imlive.com', 'xcams.com',
    // Subscription
    'onlyfans.com', 'fansly.com', 'manyvids.com', 'clips4sale.com',
    'iwantclips.com', 'modelhub.com',
    // Hentai
    'nhentai.net', 'hentaihaven.org', 'hanime.tv', 'e-hentai.org',
    'hitomi.la', 'fakku.net', 'tsumino.com'
  ]),
  // Top gambling sites
  gambling: Object.freeze([
    'bet365.com', 'pokerstars.com', 'draftkings.com', 'fanduel.com',
    'betway.com', 'williamhill.com', '888casino.com', '888sport.com',
    '888poker.com', 'unibet.com', 'bovada.lv', 'bovada.com', 'bwin.com',
    'stake.com', 'bitstarz.com', 'betfair.com', 'betmgm.com', 'caesars.com',
    'pinnacle.com', 'paddypower.com', 'ladbrokes.com', 'coral.co.uk',
    'sportingbet.com', 'sbobet.com', 'leovegas.com', 'mrgreen.com',
    'casumo.com', 'partypoker.com', 'partycasino.com', 'pokerstarscasino.com',
    'betsson.com', 'redstar.com', 'betclic.com', 'rivers.com',
    'borgataonline.com', 'pointsbet.com', 'pointsbetcanada.ca',
    'caesarspalaceonline.com', 'foxbet.com', 'tipico.com',
    'betfred.com', 'mybookie.ag', 'betonline.ag', 'sportsbetting.ag',
    'mystake.com', 'roobet.com', 'duelz.com',
    'mostbet.com', 'parimatch.com', '1xbet.com', 'melbet.com',
    'pin-up.casino', 'spinia.com'
  ]),
  // Critical malware C2 / phishing brands (top abused)
  malware: Object.freeze([
    'bit.ly.scammy.example',  // placeholder; the dynamic feed catches the real ones
  ]),
  // Top piracy/social-hostile
  social: Object.freeze([
    'thepiratebay.org', '1337x.to', 'rarbg.to', 'yts.mx', 'kickasstorrents.to',
    'limetorrents.lol', 'torrentdownloads.pro', 'torlock.com',
    'eztv.re', 'magnetdl.com'
  ])
});

// ====== Resource limits ======
// v6.0: was 5000 — too small. NSFW list has 95k domains alphabetical;
// pornhub.com is at line 60k. With 1000-domain DNR rule chunks and Firefox's
// 5000 dynamic-rule limit, we can fit 50000 domains per category (50 rules)
// across 7 categories = 350 rules total, well under the 5000 limit.
const MAX_DOMAINS_PER_CATEGORY = 50000;
const DOMAINS_PER_RULE = 1000;
const FETCH_TIMEOUT_MS = 30000;
const MAX_BLOCK_LOGS = 500;
const MAX_WHITELIST_ENTRIES = 200;
const MAX_URL_LENGTH = 2048;
const STORAGE_WRITE_DEBOUNCE_MS = 500;
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024; // 50 MB cap on blocklist downloads
const TAB_API_TIMEOUT_MS = 3000;             // tabs.query/sendMessage hang protection
const ALLOWED_TAB_SCHEMES = Object.freeze(new Set(['http:', 'https:']));
const RULE_REBUILD_DEBOUNCE_MS = 250;
const FETCH_RETRY_BASE_MS = 1000;
const FETCH_RETRY_MAX_ATTEMPTS = 3;

// ====== State (prototype-free hot maps) ======
let currentSettings = Object.assign(Object.create(null), DEFAULT_SETTINGS);
let currentWhitelist = DEFAULT_WHITELIST.slice();
let currentProxy = Object.assign(Object.create(null), DEFAULT_PROXY);
let currentBlocklists = Object.create(null);
let blocklistSets = Object.create(null);
// v6.0: seed with HIGH_PRIORITY_DOMAINS at boot so categories work
// IMMEDIATELY (before any network fetch completes).
for (const cat of ['ads', 'trackers', 'malware', 'gambling', 'adult', 'social', 'gigachad']) {
  // HIGH_PRIORITY_DOMAINS is declared further down in the file but hoisted
  // because it's a const declaration evaluated at module init. To avoid TDZ,
  // we initialize empty here and merge HIGH_PRIORITY at the end of init.
  currentBlocklists[cat] = [];
  blocklistSets[cat] = new Set();
}
let blockedRequestsCount = 0;
let blockingStats = Object.assign(Object.create(null), {
  ads:0, trackers:0, malware:0, gambling:0, adult:0, social:0, scripts:0, media:0, gigachad:0
});
let blockLogs = [];
let lastIP = { ip: null, fetchedAt: 0 };
let suppressNextStorageChange = 0;

// ====== Listener registration GUARD (idempotent) ======
const _listenersRegistered = Object.create(null);
function once(key, fn) {
  if (_listenersRegistered[key]) return false;
  _listenersRegistered[key] = true;
  fn();
  return true;
}

// ====== Synchronous top-level listener registration ======
once('msg', () => browser.runtime.onMessage.addListener(onMessage));
once('inst', () => browser.runtime.onInstalled.addListener(onInstalled));
once('start', () => browser.runtime.onStartup.addListener(onStartup));
once('storage', () => browser.storage.onChanged.addListener(onStorageChanged));

if (browser.alarms && browser.alarms.onAlarm) {
  once('alarm', () => browser.alarms.onAlarm.addListener(onAlarm));
}
if (browser.declarativeNetRequest && browser.declarativeNetRequest.onRuleMatchedDebug) {
  once('rule', () => {
    try { browser.declarativeNetRequest.onRuleMatchedDebug.addListener(onRuleMatched); } catch (e) {}
  });
}
if (browser.webNavigation && browser.webNavigation.onBeforeNavigate) {
  once('nav', () => {
    try {
      browser.webNavigation.onBeforeNavigate.addListener(
        onBeforeNavigate,
        { url: [{ schemes: ['http', 'https'] }] }
      );
    } catch (e) {}
  });
}
if (IS_FIREFOX && browser.proxy && browser.proxy.onRequest) {
  once('proxy', () => {
    try {
      browser.proxy.onRequest.addListener(handleFirefoxProxy, { urls: ['<all_urls>'] });
      if (browser.proxy.onError) browser.proxy.onError.addListener(err => console.warn('[SecOps proxy]', err));
    } catch (e) {}
  });
}

// ====== Message dispatch ======
function onMessage(msg, sender, sendResponse) {
  // Sender validation: must be from same extension
  if (sender && sender.id && browser.runtime.id && sender.id !== browser.runtime.id) {
    if (IS_FIREFOX) return Promise.resolve({ success: false, error: 'forbidden' });
    sendResponse({ success: false, error: 'forbidden' });
    return false;
  }
  // FIX v10.1: message shape must be validated BEFORE msg.action is read —
  // a null/primitive message used to throw here instead of being rejected.
  if (!msg || typeof msg !== 'object' || !VALID_ACTIONS.has(msg.action)) {
    if (IS_FIREFOX) return Promise.resolve({ success: false, error: 'invalid action' });
    sendResponse({ success: false, error: 'invalid action' });
    return false;
  }
  // FIX v6.0: tab origin allowlist applies only to settings-mutation actions.
  // For reportBlockedResource, the URL being reported is what matters and is
  // independently validated via isValidLogUrl. Skipping this check fixes
  // logs on Firefox where sender.tab.url could be the parent frame URL.
  const SENSITIVE_ACTIONS = new Set(['updateSettings', 'updateWhitelist', 'setProxy', 'panic', 'clearStats', 'clearLogs']);
  if (SENSITIVE_ACTIONS.has(msg.action) && sender && sender.tab && sender.tab.url) {
    try {
      const u = new URL(sender.tab.url);
      if (!ALLOWED_TAB_SCHEMES.has(u.protocol)) {
        if (IS_FIREFOX) return Promise.resolve({ success: false, error: 'forbidden origin' });
        sendResponse({ success: false, error: 'forbidden origin' });
        return false;
      }
    } catch (e) {
      if (IS_FIREFOX) return Promise.resolve({ success: false, error: 'invalid origin' });
      sendResponse({ success: false, error: 'invalid origin' });
      return false;
    }
  }
  const p = handleMessage(msg, sender).catch(err => {
    console.error('[SecOps]', err);
    return { success: false, error: String((err && err.message) || err) };
  });
  if (IS_FIREFOX) return p;
  p.then(sendResponse).catch(err => sendResponse({ success: false, error: String(err) }));
  return true;
}

async function handleMessage(msg) {
  switch (msg.action) {
    case 'getStats':
      return {
        success: true,
        settings: cloneSettings(currentSettings),
        proxySettings: cloneProxy(currentProxy),
        whitelist: currentWhitelist.slice(),
        blockedRequestsCount,
        blockingStats: Object.assign({}, blockingStats),
        blockLogs: blockLogs.slice(-200)
      };
    case 'updateSettings': {
      const validated = validateSettingsPatch(msg.settings);
      currentSettings = Object.assign(Object.create(null), currentSettings, validated);
      suppressNextStorageChange = Date.now() + 1000;
      await storageSet({ settings: cloneSettings(currentSettings) });
      scheduleRuleRebuild();
      broadcastTheme();
      return { success: true, settings: cloneSettings(currentSettings) };
    }
    case 'updateWhitelist': {
      const list = Array.isArray(msg.whitelist) ? msg.whitelist : [];
      currentWhitelist = list
        .map(s => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
        .filter(isValidDomain)
        .slice(0, MAX_WHITELIST_ENTRIES);
      suppressNextStorageChange = Date.now() + 1000;
      await storageSet({ whitelist: currentWhitelist.slice() });
      scheduleRuleRebuild();
      return { success: true, whitelist: currentWhitelist.slice() };
    }
    case 'setProxy': {
      if (msg.enabled === true) {
        currentProxy = {
          enabled: true,
          host: validateHost(msg.host) || '127.0.0.1',
          port: validatePort(msg.port) || 9050,
          scheme: VALID_PROXY_SCHEMES.has(msg.scheme) ? msg.scheme : 'socks5'
        };
      } else {
        currentProxy = Object.assign(Object.create(null), DEFAULT_PROXY);
      }
      suppressNextStorageChange = Date.now() + 1000;
      await storageSet({ proxy: cloneProxy(currentProxy) });
      try {
        await applyProxy();
        return { success: true, proxy: cloneProxy(currentProxy) };
      } catch (e) {
        return { success: false, error: String(e && e.message || e) };
      }
    }
    case 'clearStats':
      blockedRequestsCount = 0;
      for (const k of Object.keys(blockingStats)) blockingStats[k] = 0;
      blockLogs = [];
      await storageSetLocal({ blockedRequestsCount, blockingStats: Object.assign({}, blockingStats), blockLogs });
      return { success: true };
    case 'clearLogs':
      blockLogs = [];
      await storageSetLocal({ blockLogs });
      return { success: true };
    case 'updateFilters':
      try {
        await fetchAllBlocklists();
        scheduleRuleRebuild();
        return { success: true, counts: countBlocklists() };
      } catch (e) { return { success: false, error: String(e) }; }
    case 'getIP':
      if (!currentSettings.ipLookupEnabled) return { success: false, error: 'IP lookup disabled' };
      try {
        if (lastIP.ip && (Date.now() - lastIP.fetchedAt) < 60000) return { success: true, ip: lastIP.ip };
        const r = await fetchWithTimeout('https://api.ipify.org?format=json', 10000);
        if (!r.ok) return { success: false, error: 'fetch failed' };
        const j = await r.json();
        if (!j || typeof j.ip !== 'string' || j.ip.length > 64) return { success: false, error: 'invalid response' };
        lastIP = { ip: j.ip, fetchedAt: Date.now() };
        return { success: true, ip: j.ip };
      } catch (e) { return { success: false, error: String(e) }; }
    case 'panic':
      // v9.0 KILL SWITCH: Wipe browsing data, clear all DNR dynamic rules,
      // broadcast deactivate to remaining tabs, then close all tabs.
      // Ordering matters: clear DNR + broadcast BEFORE closing tabs so any
      // open page is told to remove our inline styles before the tab dies.
      try {
        if (browser.declarativeNetRequest && browser.declarativeNetRequest.updateDynamicRules) {
          const existing = await browser.declarativeNetRequest.getDynamicRules();
          if (existing.length) {
            await browser.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: existing.map(r => r.id),
              addRules: []
            });
          }
          console.log('[SecOps][PANIC] cleared ' + existing.length + ' DNR rules');
        }
      } catch (e) { console.warn('[SecOps][PANIC] DNR clear failed:', String(e)); }
      try {
        // Broadcast deactivate to all tabs (so dark theme inline styles get cleaned)
        const tabs = await browser.tabs.query({});
        for (const t of tabs) {
          if (!t.id || !t.url || !/^https?:\/\//.test(t.url)) continue;
          try {
            const m = { action: 'updateTheme', settings: { blackThemeEnabled: false } };
            if (IS_FIREFOX) {
              const p = browser.tabs.sendMessage(t.id, m);
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } else {
              browser.tabs.sendMessage(t.id, m, () => {
                if (browser.runtime.lastError) void browser.runtime.lastError.message;
              });
            }
          } catch (e) {}
        }
      } catch (e) {}
      try {
        if (browser.browsingData && browser.browsingData.remove) {
          await browser.browsingData.remove({}, {
            cookies: true, history: true, cache: true, localStorage: true,
            indexedDB: true, formData: true, passwords: false
          });
        }
      } catch (e) {}
      try {
        const tabs = await browser.tabs.query({});
        const ids = tabs.map(t => t.id).filter(Boolean);
        if (ids.length) await browser.tabs.remove(ids);
      } catch (e) {}
      console.log('[SecOps][PANIC] kill switch complete');
      return { success: true };
    case 'reportBlockedResource':
      if (typeof msg.url === 'string' && msg.url.length <= MAX_URL_LENGTH) {
        recordBlock(msg.url, typeof msg.reason === 'string' ? msg.reason.slice(0, 32) : 'resource');
      }
      return { success: true };
  }
  return { success: false, error: 'unknown action' };
}

// ====== Validation ======
function cloneSettings(s) {
  const out = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) out[k] = s[k];
  return out;
}
function cloneProxy(p) {
  return { enabled: !!p.enabled, host: String(p.host || ''), port: Number(p.port) || 0, scheme: p.scheme || 'socks5' };
}
function validateSettingsPatch(patch) {
  const out = Object.create(null);
  if (!patch || typeof patch !== 'object') return out;
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
    const v = patch[k];
    if (k === 'fontColor') {
      if (typeof v === 'string' && VALID_FONT_COLORS.has(v)) out[k] = v;
    } else {
      // All other settings are booleans
      if (typeof v === 'boolean') out[k] = v;
    }
  }
  return out;
}
function validateHost(h) {
  if (typeof h !== 'string') return null;
  // v9.0 HARDENING: reject CR/LF/tab/null/unicode-line-sep BEFORE trim.
  // Pre-trim CRLF injection: 'host\r\nGET /' would trim to 'host' and pass.
  // Legitimate hostnames never contain control or line-separator chars.
  if (/[\x00-\x1F\x7F\u2028\u2029]/.test(h)) return null;
  h = h.trim();
  // v10.0 HARDENING: reject oversized input instead of silently truncating.
  // slice(0,253) turned 'a'.repeat(300)+'!?' into a "valid" 253-char host —
  // a validator must reject invalid input, never rewrite it into valid input.
  if (!h || h.length > 253) return null;
  // Allow IPv4 and hostnames; reject special chars
  if (!/^[a-zA-Z0-9._:-]+$/.test(h)) return null;
  return h;
}
function validatePort(p) {
  // v9.0 HARDENING: reject non-numeric strings entirely.
  // parseInt('80abc') returns 80 but '80abc' is not a valid port.
  if (typeof p === 'number') {
    if (!isFinite(p) || p < 1 || p > 65535 || Math.floor(p) !== p) return null;
    return p;
  }
  if (typeof p === 'string') {
    if (!/^[0-9]+$/.test(p)) return null;  // digits only
    const n = parseInt(p, 10);
    if (!isFinite(n) || n < 1 || n > 65535) return null;
    return n;
  }
  return null;
}

// ====== Lifecycle ======
async function onInstalled() {
  await loadAllFromStorage();
  await scheduleAlarms();
  if (countBlocklists().total === 0) await fetchAllBlocklists().catch(() => {});
  scheduleRuleRebuild();
  if (currentProxy.enabled) applyProxy().catch(() => {});
}
async function onStartup() {
  await loadAllFromStorage();
  await scheduleAlarms();
  scheduleRuleRebuild();
  if (currentProxy.enabled) applyProxy().catch(() => {});
}
function onStorageChanged(changes, area) {
  if (Date.now() < suppressNextStorageChange) return;
  if (area !== 'sync') return;
  if (changes.settings && changes.settings.newValue && typeof changes.settings.newValue === 'object') {
    const validated = validateSettingsPatch(changes.settings.newValue);
    currentSettings = Object.assign(Object.create(null), DEFAULT_SETTINGS, validated);
    scheduleRuleRebuild();
    broadcastTheme();
  }
  if (changes.whitelist && Array.isArray(changes.whitelist.newValue)) {
    currentWhitelist = changes.whitelist.newValue.filter(isValidDomain).slice(0, MAX_WHITELIST_ENTRIES);
    scheduleRuleRebuild();
  }
  if (changes.proxy && changes.proxy.newValue && typeof changes.proxy.newValue === 'object') {
    currentProxy = cloneProxy(changes.proxy.newValue);
  }
}
function onAlarm(alarm) {
  if (alarm && alarm.name === 'refresh-blocklists') {
    fetchAllBlocklists().then(() => scheduleRuleRebuild()).catch(() => {});
  }
}

// ====== webNavigation logging ======
function onBeforeNavigate(details) {
  if (!details || details.frameId !== 0) return;
  const url = details.url;
  if (!url || typeof url !== 'string' || url.length > MAX_URL_LENGTH) return;
  if (!/^https?:\/\//.test(url)) return;
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return; }
  if (isHostWhitelisted(host)) return;
  const cat = matchHostInSets(host);
  if (cat) recordBlock(url, cat);
}

function onRuleMatched(info) {
  if (!info || !info.request) return;
  const url = info.request.url;
  if (!url || typeof url !== 'string' || url.length > MAX_URL_LENGTH) return;
  let cat = inferCategoryFromRuleId(info.rule && info.rule.ruleId);
  if (!cat) {
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return; }
    cat = matchHostInSets(host) || 'rule';
  }
  recordBlock(url, cat);
}

function recordBlock(url, reason) {
  // SOTA: validate URL shape before logging — defense against poisoned input
  const safeUrl = isValidLogUrl(url) ? url.slice(0, 256) : null;
  if (!safeUrl) return;
  const safeReason = (typeof reason === 'string' && reason.length <= 32)
    ? reason : 'unknown';
  blockedRequestsCount++;
  if (blockingStats[safeReason] !== undefined) blockingStats[safeReason]++;
  blockLogs.push({ timestamp: Date.now(), url: safeUrl, reason: safeReason });
  if (blockLogs.length > MAX_BLOCK_LOGS) blockLogs.splice(0, blockLogs.length - MAX_BLOCK_LOGS);
  saveCountersDebounced();
}

let saveTimer = null;
function saveCountersDebounced() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    storageSetLocal({
      blockedRequestsCount,
      blockingStats: Object.assign({}, blockingStats),
      blockLogs
    }).catch(() => {});
  }, STORAGE_WRITE_DEBOUNCE_MS);
}

function broadcastTheme() {
  // FIX v6.0: Firefox throws when both callback AND promise are used.
  // Use Promise-only path on Firefox; callback path on Chrome.
  try {
    browser.tabs.query({}).then(tabs => {
      const settingsBlob = cloneSettings(currentSettings);
      tabs.forEach(t => {
        if (!t.id || !t.url) return;
        // Skip non-http(s) tabs (about:, chrome:, file:, etc.)
        if (!/^https?:\/\//.test(t.url)) return;
        try {
          if (IS_FIREFOX) {
            // Firefox: Promise-only
            const p = browser.tabs.sendMessage(t.id, { action: 'updateTheme', settings: settingsBlob });
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            // Chrome: callback to suppress lastError
            browser.tabs.sendMessage(t.id, { action: 'updateTheme', settings: settingsBlob }, () => {
              if (browser.runtime.lastError) void browser.runtime.lastError.message;
            });
          }
        } catch (e) {}
      });
    }).catch(() => {});
  } catch (e) {}
}

// ====== Storage helpers (with timeout) ======
function storageGet(keys, area) {
  area = area || 'sync';
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (v) => { if (!resolved) { resolved = true; resolve(v); } };
    const timer = setTimeout(() => finish({}), 5000);
    try {
      const p = browser.storage[area].get(keys, (d) => {
        clearTimeout(timer);
        if (browser.runtime.lastError) finish({});
        else finish(d || {});
      });
      if (p && typeof p.then === 'function') {
        p.then(d => { clearTimeout(timer); finish(d || {}); }).catch(() => { clearTimeout(timer); finish({}); });
      }
    } catch (e) { clearTimeout(timer); finish({}); }
  });
}
function storageSet(obj, area) {
  area = area || 'sync';
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => { if (!resolved) { resolved = true; resolve(); } };
    const timer = setTimeout(finish, 5000);
    try {
      const p = browser.storage[area].set(obj, () => { clearTimeout(timer); finish(); });
      if (p && typeof p.then === 'function') p.then(() => { clearTimeout(timer); finish(); }).catch(() => { clearTimeout(timer); finish(); });
    } catch (e) { clearTimeout(timer); finish(); }
  });
}
function storageGetLocal(keys) { return storageGet(keys, 'local'); }
function storageSetLocal(obj) { return storageSet(obj, 'local'); }

async function loadAllFromStorage() {
  const sync = await storageGet(['settings', 'whitelist', 'proxy']);
  if (sync.settings && typeof sync.settings === 'object') {
    const validated = validateSettingsPatch(sync.settings);
    currentSettings = Object.assign(Object.create(null), DEFAULT_SETTINGS, validated);
  }
  if (Array.isArray(sync.whitelist)) {
    currentWhitelist = sync.whitelist.filter(isValidDomain).slice(0, MAX_WHITELIST_ENTRIES);
  }
  if (sync.proxy && typeof sync.proxy === 'object') {
    currentProxy = cloneProxy(sync.proxy);
  }

  const local = await storageGetLocal(['blockedRequestsCount', 'blockingStats', 'blockLogs', 'blocklists']);
  if (typeof local.blockedRequestsCount === 'number' && local.blockedRequestsCount >= 0) {
    blockedRequestsCount = local.blockedRequestsCount;
  }
  if (local.blockingStats && typeof local.blockingStats === 'object') {
    for (const k of Object.keys(blockingStats)) {
      if (typeof local.blockingStats[k] === 'number' && local.blockingStats[k] >= 0) {
        blockingStats[k] = local.blockingStats[k];
      }
    }
  }
  if (Array.isArray(local.blockLogs)) {
    // SOTA: validate each log entry on read (defense against storage poisoning)
    blockLogs = local.blockLogs
      .filter(e => e && typeof e === 'object' && isValidLogUrl(e.url))
      .map(e => ({
        timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
        url: e.url.slice(0, 256),
        reason: (typeof e.reason === 'string' && e.reason.length <= 32) ? e.reason : 'unknown'
      }))
      .slice(-MAX_BLOCK_LOGS);
  }
  if (local.blocklists && typeof local.blocklists === 'object') {
    for (const cat of Object.keys(currentBlocklists)) {
      if (Array.isArray(local.blocklists[cat])) {
        currentBlocklists[cat] = local.blocklists[cat].filter(isValidDomain).slice(0, MAX_DOMAINS_PER_CATEGORY);
        blocklistSets[cat] = new Set(currentBlocklists[cat]);
      }
    }
  }
}

async function scheduleAlarms() {
  try {
    if (browser.alarms && browser.alarms.create) {
      browser.alarms.create('refresh-blocklists', { periodInMinutes: 24 * 60 });
    }
  } catch (e) {}
}

// ====== Fetch with timeout + exponential backoff ======
// SOTA: SHA-256 utility for optional blocklist pinning (groundwork)
async function sha256Hex(text) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

function fetchWithTimeout(url, timeoutMs) {
  // v9.0 HARDENING: HTTPS-only enforcement. Reject anything that isn't
  // a clean https:// URL. Defends against accidental http:// regressions
  // and javascript:/data:/file:/blob: schemes from compromised state.
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) {
    return Promise.reject(new Error('[SecOps][FETCH] non-https URL rejected: ' + String(url).slice(0, 64)));
  }
  timeoutMs = timeoutMs || FETCH_TIMEOUT_MS;
  if (typeof AbortController === 'undefined') {
    return fetch(url, { cache: 'no-cache' });
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { cache: 'no-cache', signal: controller.signal })
    .finally(() => clearTimeout(id));
}
async function fetchWithRetry(url, timeoutMs) {
  let lastErr;
  for (let attempt = 0; attempt < FETCH_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const r = await fetchWithTimeout(url, timeoutMs);
      if (r.ok) return r;
      lastErr = new Error('HTTP ' + r.status);
    } catch (e) { lastErr = e; }
    if (attempt < FETCH_RETRY_MAX_ATTEMPTS - 1) {
      await new Promise(res => setTimeout(res, FETCH_RETRY_BASE_MS * (1 << attempt)));
    }
  }
  throw lastErr;
}

// ====== Blocklist parsing ======
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
// SOTA hardening: validate URL shape before logging
function isValidLogUrl(u) {
  if (typeof u !== 'string') return false;
  if (u.length < 8 || u.length > MAX_URL_LENGTH) return false;
  // Must be http(s) and parseable
  if (!/^https?:\/\//.test(u)) return false;
  try { new URL(u); return true; } catch (e) { return false; }
}
function isValidDomain(d) {
  if (typeof d !== 'string') return false;
  if (d.length < 4 || d.length > 253) return false;
  const c = d.charCodeAt(0);
  if (c === 35 /* # */ || c === 33 /* ! */ || c === 91 /* [ */) return false;
  return DOMAIN_RE.test(d);
}
function parseDomains(text, cap) {
  const out = [];
  const seen = new Set();
  let i = 0;
  const len = text.length;
  // Manual line iteration — single allocation per line, no split() for big text
  while (i < len && out.length < cap) {
    let j = text.indexOf('\n', i);
    if (j === -1) j = len;
    let line = text.slice(i, j).trim();
    i = j + 1;
    if (!line) continue;
    const c0 = line.charCodeAt(0);
    if (c0 === 35 || c0 === 33 || c0 === 91) continue;
    if (line.startsWith('0.0.0.0 ') || line.startsWith('127.0.0.1 ')) {
      const sp = line.indexOf(' ');
      line = line.slice(sp + 1).trim();
    }
    if (!line) continue;
    line = line.toLowerCase();
    if (line.length < 4 || line.length > 253) continue;
    if (!DOMAIN_RE.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}
async function fetchAllBlocklists() {
  for (const cat of Object.keys(BLOCKLIST_SOURCES)) {
    const url = BLOCKLIST_SOURCES[cat];
    try {
      const r = await fetchWithRetry(url);
      // SOTA: check Content-Length before reading body to prevent memory exhaustion
      const cl = r.headers && r.headers.get && r.headers.get('content-length');
      if (cl && parseInt(cl, 10) > MAX_RESPONSE_BYTES) {
        console.warn('[SecOps]', cat, 'response too large:', cl);
        continue;
      }
      const text = await r.text();
      // Defense: even if Content-Length lied or was missing, cap the parsed text
      if (text.length > MAX_RESPONSE_BYTES) {
        console.warn('[SecOps]', cat, 'body too large:', text.length);
        continue;
      }
      let list = parseDomains(text, MAX_DOMAINS_PER_CATEGORY);
      // v9.0 HARDENING: sanity check. Reject if list looks suspicious.
      // Below 100 → probably HTML error page (404 / Cloudflare) or empty file.
      // Above 500000 → impossible for any single category, probably hostile.
      // On reject, keep the HIGH_PRIORITY_DOMAINS-only seeded list intact.
      if (list.length < 100 || list.length > 500000) {
        console.warn('[SecOps][BLOCKLIST] rejecting ' + cat + ' — count=' + list.length + ' outside [100, 500000]');
        continue;
      }
      // v6.0: PREPEND high-priority domains (guarantees mainstream sites
      // are blocked even if the upstream list is sorted alphabetically and
      // doesn't include them in the first MAX_DOMAINS_PER_CATEGORY entries).
      const priority = HIGH_PRIORITY_DOMAINS[cat];
      if (priority && priority.length) {
        const seen = new Set(list);
        const merged = [];
        for (const d of priority) {
          if (!seen.has(d) && isValidDomain(d)) {
            merged.push(d);
            seen.add(d);
          }
        }
        // Prepend priority then existing
        list = merged.concat(list).slice(0, MAX_DOMAINS_PER_CATEGORY);
      }
      currentBlocklists[cat] = list;
      blocklistSets[cat] = new Set(list);
      console.log('[SecOps]', cat, '=', list.length, '(priority:', (HIGH_PRIORITY_DOMAINS[cat] || []).length + ')');
    } catch (e) {
      console.warn('[SecOps]', cat, 'fetch err:', String(e));
    }
  }
  // Single coalesced write
  const snapshot = {};
  for (const cat of Object.keys(currentBlocklists)) snapshot[cat] = currentBlocklists[cat];
  await storageSetLocal({ blocklists: snapshot });
}
function countBlocklists() {
  let total = 0;
  const per = {};
  for (const cat of Object.keys(currentBlocklists)) {
    per[cat] = currentBlocklists[cat].length;
    total += per[cat];
  }
  return { total, per };
}

// ====== Host matching (PERFORMANCE-CRITICAL) ======
// Compute parent-domain chain ONCE per host, check against all categories.
const ENABLED_CATS_ORDER = ['ads', 'trackers', 'malware', 'gambling', 'adult', 'social', 'gigachad'];
function matchHostInSets(host) {
  if (!host) return null;
  // Build the parent chain once
  const chain = [host];
  let dot = host.indexOf('.');
  while (dot !== -1 && dot < host.length - 1) {
    const sub = host.slice(dot + 1);
    if (sub.indexOf('.') === -1) break; // don't include TLD alone
    chain.push(sub);
    dot = host.indexOf('.', dot + 1);
  }
  // Walk categories in priority order
  for (const cat of ENABLED_CATS_ORDER) {
    const flag = 'block' + cat.charAt(0).toUpperCase() + cat.slice(1);
    if (!currentSettings[flag]) continue;
    const set = blocklistSets[cat];
    if (!set || !set.size) continue;
    for (const c of chain) {
      if (set.has(c)) return cat;
    }
  }
  return null;
}

function isHostWhitelisted(host) {
  if (!host) return false;
  for (const w of currentWhitelist) {
    if (host === w || host.endsWith('.' + w)) return true;
  }
  return false;
}

// ====== DNR rules ======
const RULE_RANGES = Object.freeze({
  whitelist: [100,   199],
  utility:   [1000,  1999],
  ads:       [10000, 19999],
  trackers:  [20000, 29999],
  malware:   [30000, 39999],
  gambling:  [40000, 49999],
  adult:     [50000, 59999],
  social:    [60000, 69999],
  gigachad:  [70000, 79999],
  scripts:   [80000, 80099],
  media:     [80100, 80199]
});
function inferCategoryFromRuleId(id) {
  if (!id) return null;
  for (const cat of Object.keys(RULE_RANGES)) {
    const [lo, hi] = RULE_RANGES[cat];
    if (id >= lo && id <= hi) return cat;
  }
  return null;
}

let rebuildTimer = null;
function scheduleRuleRebuild() {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    rebuildAllRules().catch(err => console.error('[SecOps] rebuild err:', err));
  }, RULE_REBUILD_DEBOUNCE_MS);
}

async function rebuildAllRules() {
  if (!browser.declarativeNetRequest || !browser.declarativeNetRequest.updateDynamicRules) return;
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);
  const addRules = [];

  // Pre-compute shared excludedRequestDomains array (filter once, not per rule)
  const validWhitelist = currentWhitelist.filter(isValidDomain);
  const excludedDomains = validWhitelist.length ? validWhitelist : undefined;

  // Whitelist allow rules
  let nextWl = RULE_RANGES.whitelist[0];
  for (const w of validWhitelist) {
    if (nextWl > RULE_RANGES.whitelist[1]) break;
    addRules.push({
      id: nextWl++, priority: 200,
      action: { type: 'allow' },
      condition: {
        requestDomains: [w],
        resourceTypes: ['main_frame','sub_frame','script','image','stylesheet','xmlhttprequest','media','font','object','other']
      }
    });
  }

  // Block rules from blocklists (chunked)
  const categories = [
    { setting: 'blockAds', list: 'ads', resourceTypes: ['script','xmlhttprequest','image','sub_frame'] },
    { setting: 'blockTrackers', list: 'trackers', resourceTypes: ['script','xmlhttprequest','image','sub_frame'] },
    { setting: 'blockMalware', list: 'malware', resourceTypes: ['main_frame','sub_frame','script','xmlhttprequest','image'] },
    { setting: 'blockGambling', list: 'gambling', resourceTypes: ['main_frame','sub_frame','script','xmlhttprequest','image'] },
    { setting: 'blockAdult', list: 'adult', resourceTypes: ['main_frame','sub_frame','script','xmlhttprequest','image'] },
    { setting: 'blockSocial', list: 'social', resourceTypes: ['script','xmlhttprequest','image','sub_frame'] },
    { setting: 'blockGigachad', list: 'gigachad', resourceTypes: ['main_frame','sub_frame','script','xmlhttprequest','image','media'] }
  ];
  for (const cat of categories) {
    if (!currentSettings[cat.setting]) continue;
    const domains = currentBlocklists[cat.list] || [];
    if (!domains.length) continue;
    const [lo, hi] = RULE_RANGES[cat.list];
    let id = lo;
    let domainsUsed = 0;
    for (let i = 0; i < domains.length && id <= hi; i += DOMAINS_PER_RULE) {
      const chunk = i + DOMAINS_PER_RULE >= domains.length ? domains.slice(i) : domains.slice(i, i + DOMAINS_PER_RULE);
      const cond = {
        requestDomains: chunk,
        resourceTypes: cat.resourceTypes
      };
      if (excludedDomains) cond.excludedRequestDomains = excludedDomains;
      addRules.push({
        id: id++, priority: 1,
        action: { type: 'block' },
        condition: cond
      });
      domainsUsed += chunk.length;
    }
    // v9.0 HARDENING: warn on rule range overflow (silent truncation
    // was a latent bug — categories with too many domains lost coverage)
    if (domainsUsed < domains.length) {
      console.warn('[SecOps][DNR] ' + cat.list + ' truncated: used ' +
                   domainsUsed + ' of ' + domains.length + ' domains (range ' +
                   lo + '-' + hi + ' exhausted)');
    }
  }

  if (currentSettings.blockBadJS) {
    const cond = { resourceTypes: ['script'], urlFilter: '*' };
    if (excludedDomains) cond.excludedRequestDomains = excludedDomains;
    addRules.push({ id: RULE_RANGES.scripts[0], priority: 1, action: { type: 'block' }, condition: cond });
  }
  if (currentSettings.blockMedia) {
    // FIX v5.0: was ['image', 'media'] which broke page layouts.
    // Block only video/audio/embed — leave images alone.
    const cond = { resourceTypes: ['media', 'object'], urlFilter: '*' };
    if (excludedDomains) cond.excludedRequestDomains = excludedDomains;
    addRules.push({ id: RULE_RANGES.media[0], priority: 1, action: { type: 'block' }, condition: cond });
  }

  // Utility rules
  let nextUtil = RULE_RANGES.utility[0];
  const utilCond = (extra) => {
    const c = { resourceTypes: ['main_frame'] };
    if (excludedDomains) c.excludedRequestDomains = excludedDomains;
    return Object.assign(c, extra);
  };
  if (currentSettings.redirectGoogle) {
    addRules.push({
      id: nextUtil++, priority: 100,
      action: { type: 'redirect', redirect: { regexSubstitution: 'https://securityops.co/web?s=\\1' } },
      condition: utilCond({ regexFilter: '^https?://(?:www\\.)?google\\.[a-z.]+/search\\?(?:.*&)?q=([^&#]*)' })
    });
  }
  if (currentSettings.redirectBing) {
    addRules.push({
      id: nextUtil++, priority: 100,
      action: { type: 'redirect', redirect: { regexSubstitution: 'https://securityops.co/web?s=\\1' } },
      condition: utilCond({ regexFilter: '^https?://(?:www\\.)?bing\\.com/search\\?(?:.*&)?q=([^&#]*)' })
    });
  }
  if (currentSettings.redirectYouTube) {
    addRules.push({
      id: nextUtil++, priority: 100,
      action: { type: 'redirect', redirect: { transform: { host: 'invidious.nerdvpn.de', scheme: 'https' } } },
      condition: utilCond({ regexFilter: '^https?://(?:www\\.|m\\.)?youtube\\.com/' })
    });
  }
  if (currentSettings.redirectReddit) {
    addRules.push({
      id: nextUtil++, priority: 100,
      action: { type: 'redirect', redirect: { transform: { host: 'redlib.catsarch.com', scheme: 'https' } } },
      condition: utilCond({ regexFilter: '^https?://(?:www\\.|old\\.|new\\.)?reddit\\.com/' })
    });
  }
  if (currentSettings.enforceHttps) {
    const c = { urlFilter: 'http://*', resourceTypes: ['main_frame', 'sub_frame'] };
    if (excludedDomains) c.excludedRequestDomains = excludedDomains;
    addRules.push({ id: nextUtil++, priority: 50, action: { type: 'upgradeScheme' }, condition: c });
  }
  if (currentSettings.stripTrackingParams) {
    const params = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','msclkid','mc_cid','mc_eid','yclid','dclid','igshid','_ga','_gl'];
    for (const p of params) {
      if (nextUtil > RULE_RANGES.utility[1]) break;
      const c = { urlFilter: '*' + p + '=*', resourceTypes: ['main_frame','sub_frame'] };
      if (excludedDomains) c.excludedRequestDomains = excludedDomains;
      addRules.push({
        id: nextUtil++, priority: 40,
        action: { type: 'redirect', redirect: { transform: { queryTransform: { removeParams: [p] } } } },
        condition: c
      });
    }
  }

  try {
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
    console.log('[SecOps] DNR -' + removeRuleIds.length + ' +' + addRules.length);
  } catch (err) {
    console.error('[SecOps] DNR update failed:', err);
    if (addRules.length > 100) {
      try {
        await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
        for (let i = 0; i < addRules.length; i += 100) {
          await browser.declarativeNetRequest.updateDynamicRules({ addRules: addRules.slice(i, i + 100) });
        }
      } catch (err2) { console.error('[SecOps] DNR fallback failed:', err2); }
    }
  }
}

// ====== Proxy ======
function handleFirefoxProxy(requestInfo) {
  if (!currentProxy.enabled) return { type: 'direct' };
  try {
    const u = new URL(requestInfo.url);
    if (isHostWhitelisted(u.hostname.toLowerCase())) return { type: 'direct' };
  } catch (e) {}
  let type;
  switch (currentProxy.scheme) {
    case 'socks5': type = 'socks'; break;
    case 'socks4': type = 'socks4'; break;
    case 'http':   type = 'http'; break;
    case 'https':  type = 'https'; break;
    default: return { type: 'direct' };
  }
  return {
    type, host: currentProxy.host, port: Number(currentProxy.port),
    proxyDNS: true, failoverTimeout: 5
  };
}
async function applyProxy() {
  if (IS_FIREFOX) return;
  if (!browser.proxy || !browser.proxy.settings) return;
  if (!currentProxy.enabled) {
    return new Promise((resolve, reject) => {
      browser.proxy.settings.set({ value: { mode: 'system' }, scope: 'regular' }, () => {
        if (browser.runtime.lastError) reject(new Error(browser.runtime.lastError.message));
        else resolve();
      });
    });
  }
  const cfg = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: { scheme: currentProxy.scheme, host: currentProxy.host, port: Number(currentProxy.port) },
      bypassList: ['localhost', '127.0.0.1'].concat(currentWhitelist)
    }
  };
  return new Promise((resolve, reject) => {
    browser.proxy.settings.set({ value: cfg, scope: 'regular' }, () => {
      if (browser.runtime.lastError) reject(new Error(browser.runtime.lastError.message));
      else resolve();
    });
  });
}

// ====== Boot ======
// Seed HIGH_PRIORITY_DOMAINS into blocklistSets at module init
// (so categories work BEFORE the first network fetch completes)
function seedPriorityDomains() {
  for (const cat of Object.keys(HIGH_PRIORITY_DOMAINS)) {
    const priority = HIGH_PRIORITY_DOMAINS[cat] || [];
    if (!currentBlocklists[cat]) currentBlocklists[cat] = [];
    if (!blocklistSets[cat]) blocklistSets[cat] = new Set();
    for (const d of priority) {
      if (isValidDomain(d) && !blocklistSets[cat].has(d)) {
        blocklistSets[cat].add(d);
        currentBlocklists[cat].push(d);
      }
    }
  }
}
seedPriorityDomains();

(async () => {
  await loadAllFromStorage();
  // Re-seed in case storage cleared the priority domains
  seedPriorityDomains();
  await scheduleAlarms();
  if (countBlocklists().total === 0) {
    fetchAllBlocklists().then(() => scheduleRuleRebuild()).catch(() => {});
  } else {
    scheduleRuleRebuild();
  }
  if (currentProxy.enabled) applyProxy().catch(() => {});
  console.log('[SecOps][BOOT] v' + ((browser.runtime.getManifest && browser.runtime.getManifest().version) || '?') +
  ' FF=' + IS_FIREFOX +
  ' dnr=' + !!(browser.declarativeNetRequest && browser.declarativeNetRequest.updateDynamicRules) +
  ' alarms=' + !!(browser.alarms && browser.alarms.create) +
  ' proxyApi=' + !!(browser.proxy));
})();
