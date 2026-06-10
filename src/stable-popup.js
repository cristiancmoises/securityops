/*
 * Security Ops — Privacy-focused browser extension
 * Copyright (C) 2024-2026 Cristian Cezar Moises <ethicalhacker@riseup.net>
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// stable-popup.js — Security Ops v10.1.0
// FIXES from v3.6 user feedback:
//  - Settings disappearing: pause refresh while user is interacting with controls.
//  - Cross-browser sendMessage: Firefox returns Promise, Chrome uses callback. Handle both.
//  - Real-time accent application without round-trip wait.

(() => {
  'use strict';
  const browser = self.browser || self.chrome;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function send(msg) {
    return new Promise((resolve) => {
      let resolved = false;
      const finish = (v) => { if (!resolved) { resolved = true; resolve(v); } };
      try {
        const maybeP = browser.runtime.sendMessage(msg, (response) => {
          if (browser.runtime.lastError) {
            console.warn('[SecOps popup] sendMessage cb err:', browser.runtime.lastError.message);
            finish(null);
          } else {
            finish(response);
          }
        });
        if (maybeP && typeof maybeP.then === 'function') {
          maybeP.then(finish).catch((e) => {
            console.warn('[SecOps popup] sendMessage promise err:', e);
            finish(null);
          });
        }
        setTimeout(() => finish(null), 5000);
      } catch (e) {
        console.warn('[SecOps popup] sendMessage threw:', e);
        finish(null);
      }
    });
  }

  let userInteractingUntil = 0;
  function markInteraction(ms) { userInteractingUntil = Date.now() + (ms || 1500); }

  // Render SVG icons immediately from window.ICONS (loaded by css/icons.js)
  if (typeof window.applyIcons === 'function') {
    window.applyIcons();
  }
  function isInteracting() { return Date.now() < userInteractingUntil; }

  let bannerTimer;
  function showStatus(msg, kind, ms) {
    kind = kind || 'info';
    ms = ms || 1800;
    const b = $('#status-banner');
    if (!b) return;
    clearTimeout(bannerTimer);
    b.textContent = msg;
    b.classList.remove('is-success', 'is-error', 'is-info');
    b.classList.add('is-visible', 'is-' + kind);
    bannerTimer = setTimeout(() => b.classList.remove('is-visible'), ms);
  }

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab;
      $$('.tab-btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('.tab-panel').forEach(p => p.classList.toggle('is-active', p.id === id));
    });
  });

  const ACCENT_VALUES = ['cyan', 'teal', 'blue', 'purple', 'green', 'amber',
    'soft-green', 'soft-blue', 'soft-yellow', 'soft-purple', 'soft-violet', 'white'];
  function applyAccent(color) {
    const c = ACCENT_VALUES.indexOf(color) >= 0 ? color : 'cyan';
    document.documentElement.classList.remove.apply(
      document.documentElement.classList,
      ACCENT_VALUES.map(v => 'accent-' + v)
    );
    document.documentElement.classList.add('accent-' + c);
  }

  // Swatch click handlers — registered ONCE at startup.
  // FIX v10.1: this block previously lived inside reflectSettings(), which
  // runs on every 1.5 s poll, so each refresh stacked another click listener
  // on every swatch. One click then fired N duplicate updateSettings calls.
  $$('.swatch[data-color]').forEach(sw => {
    sw.addEventListener('click', async () => {
      markInteraction(2500);
      const c = sw.dataset.color;
      applyAccent(c);
      $$('.swatch[data-color]').forEach(s => s.classList.toggle('is-selected', s === sw));
      const r = await send({ action: 'updateSettings', settings: { fontColor: c } });
      if (r && r.success) showStatus('Accent updated', 'success');
      else showStatus('Failed to update accent', 'error');
    });
  });

  function reflectSettings(settings) {
    if (!settings) return;
    $$('.switch-input[data-setting]').forEach(input => {
      if (document.activeElement === input) return;
      const k = input.dataset.setting;
      if (k in settings) input.checked = !!settings[k];
    });
    $$('select[data-setting]').forEach(sel => {
      if (document.activeElement === sel) return;
      const k = sel.dataset.setting;
      if (k in settings) sel.value = settings[k];
    });
    if (settings.fontColor) applyAccent(settings.fontColor);
    $$('.swatch[data-color]').forEach(s => {
      s.classList.toggle('is-selected', s.dataset.color === settings.fontColor);
      s.setAttribute('aria-checked', s.dataset.color === settings.fontColor ? 'true' : 'false');
    });
    const dot = $('#shield-dot');
    if (dot) {
      const protecting = !!(settings.blockAds || settings.blockTrackers || settings.blockMalware);
      dot.classList.toggle('is-on', protecting);
      dot.title = protecting ? 'Protection active' : 'Protection off';
    }

    const flagMap = {
      ads: 'blockAds', trackers: 'blockTrackers', malware: 'blockMalware',
      gambling: 'blockGambling', adult: 'blockAdult', social: 'blockSocial',
      scripts: 'blockBadJS', media: 'blockMedia', gigachad: 'blockGigachad'
    };
    $$('.cat-card').forEach(card => {
      const flag = flagMap[card.dataset.cat];
      card.dataset.on = settings[flag] ? 'true' : 'false';
    });
  }

  function reflectStats(stats) {
    if (!stats) return;
    const t = $('#total-blocked');
    if (t) t.textContent = (stats.blockedRequestsCount || 0).toLocaleString();
    const m = stats.blockingStats || {};
    ['ads','trackers','malware','gambling','adult','social','scripts','media','gigachad'].forEach(cat => {
      const el = $('#cat-' + cat);
      if (el) el.textContent = (m[cat] || 0).toLocaleString();
    });
  }

  function reflectProxy(proxy) {
    if (!proxy) return;
    const t = $('#t-proxy');
    if (t && document.activeElement !== t) t.checked = !!proxy.enabled;
    const host = $('#proxy-host'), port = $('#proxy-port'), scheme = $('#proxy-scheme');
    if (host && document.activeElement !== host) host.value = proxy.host || '';
    if (port && document.activeElement !== port) port.value = proxy.port || '';
    if (scheme && document.activeElement !== scheme) scheme.value = proxy.scheme || 'socks5';

    const status = $('#proxy-status');
    if (status) {
      status.textContent = proxy.enabled
        ? 'Connected - ' + proxy.scheme + '://' + proxy.host + ':' + proxy.port
        : 'Disconnected';
      status.classList.toggle('is-on', !!proxy.enabled);
    }
    const torando = $('#torando-status');
    if (torando) {
      const isTor = proxy.enabled && proxy.host === '127.0.0.1' && Number(proxy.port) === 9050;
      torando.textContent = 'Tor: ' + (isTor ? 'ACTIVE' : 'INACTIVE');
      torando.classList.toggle('is-on', isTor);
    }
  }

  function reflectWhitelist(list) {
    const ul = $('#whitelist-list');
    if (!ul) return;
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    const items = list || [];
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No domains whitelisted';
      ul.appendChild(li);
      return;
    }
    items.forEach(d => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = d;
      const btn = document.createElement('button');
      btn.className = 'remove-btn';
      btn.textContent = '\u00D7';
      btn.title = 'Remove ' + d;
      btn.addEventListener('click', () => removeFromWhitelist(d));
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function reflectLogs(logs) {
    const root = $('#log-entries');
    if (!root) return;
    if (!logs || logs.length === 0) {
      {
        while (root.firstChild) root.removeChild(root.firstChild);
        const empty = document.createElement('div');
        empty.className = 'log-empty';
        empty.textContent = 'No blocked requests yet.';
        root.appendChild(empty);
      }
      return;
    }
    const last = logs.slice(-100).reverse();
    const frag = document.createDocumentFragment();
    last.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'log-row';
      const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false });
      const t = document.createElement('div'); t.className = 'log-time'; t.textContent = time;
      const u = document.createElement('div'); u.className = 'log-url'; u.title = entry.url; u.textContent = entry.url;
      const r = document.createElement('div'); r.className = 'log-reason'; r.textContent = entry.reason || '-';
      row.appendChild(t); row.appendChild(u); row.appendChild(r);
      frag.appendChild(row);
    });
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(frag);
  }

  function prettify(k) {
    const map = {
      blockAds: 'Ad Blocking', blockTrackers: 'Tracker Blocking',
      blockMalware: 'Malware Blocking', blockGambling: 'Gambling Blocking',
      blockAdult: 'Adult Blocking', blockSocial: 'Social Blocking',
      blockBadJS: 'JS Blocking', blockMedia: 'Media Blocking',
      blockGigachad: 'Gigachad', stripTrackingParams: 'Param Stripping',
      enforceHttps: 'HTTPS Upgrade', ipLookupEnabled: 'IP Lookup',
      redirectGoogle: 'Google Redirect', redirectBing: 'Bing Redirect',
      redirectYouTube: 'YouTube Redirect', redirectReddit: 'Reddit Redirect',
      blackThemeEnabled: 'Dark Theme', youtubeFocusMode: 'YT Distraction-Free', fontColor: 'Accent Color'
    };
    return map[k] || k;
  }

  $$('.switch-input[data-setting]').forEach(input => {
    input.addEventListener('change', async () => {
      markInteraction(2500);
      const k = input.dataset.setting;
      const obj = {}; obj[k] = input.checked;
      const r = await send({ action: 'updateSettings', settings: obj });
      if (r && r.success) {
        showStatus(prettify(k) + ' ' + (input.checked ? 'enabled' : 'disabled'), 'success');
      } else {
        input.checked = !input.checked;
        showStatus('Failed to update', 'error');
      }
    });
  });

  $$('select[data-setting]').forEach(sel => {
    sel.addEventListener('change', async () => {
      markInteraction(2500);
      const k = sel.dataset.setting;
      if (k === 'fontColor') applyAccent(sel.value);
      const obj = {}; obj[k] = sel.value;
      const r = await send({ action: 'updateSettings', settings: obj });
      if (r && r.success) showStatus(prettify(k) + ' updated', 'success');
    });
  });

  const btnClearStats = $('#btn-clear-stats');
  if (btnClearStats) btnClearStats.addEventListener('click', async () => {
    const r = await send({ action: 'clearStats' });
    if (r && r.success) { showStatus('Stats cleared', 'success'); refreshAll(); }
  });
  const btnUpdateFilters = $('#btn-update-filters');
  if (btnUpdateFilters) btnUpdateFilters.addEventListener('click', async () => {
    showStatus('Refreshing blocklists...', 'info', 4000);
    const r = await send({ action: 'updateFilters' });
    if (r && r.success) showStatus('Filters updated', 'success');
    else showStatus('Update failed', 'error');
  });
  const btnPanic = $('#btn-panic');
  if (btnPanic) btnPanic.addEventListener('click', async () => {
    if (!confirm('PANIC: This will clear ALL browsing data and close ALL tabs. Continue?')) return;
    await send({ action: 'panic' });
  });
  const btnDownload = $('#btn-download-logs');
  if (btnDownload) btnDownload.addEventListener('click', async () => {
    const r = await send({ action: 'getStats' });
    if (!r || !r.blockLogs) return showStatus('No logs', 'error');
    const blob = new Blob([JSON.stringify(r.blockLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'securityops-logs-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Logs downloaded', 'success');
  });
  const btnClearLogs = $('#btn-clear-logs');
  if (btnClearLogs) btnClearLogs.addEventListener('click', async () => {
    const r = await send({ action: 'clearLogs' });
    if (r && r.success) { showStatus('Logs cleared', 'success'); reflectLogs([]); }
  });

  const btnShowIp = $('#btn-show-ip');
  if (btnShowIp) btnShowIp.addEventListener('click', async () => {
    $('#ip-card').hidden = false;
    $('#ip-value').textContent = 'Loading...';
    const r = await send({ action: 'getIP' });
    $('#ip-value').textContent = (r && r.ip) ? r.ip : 'Unavailable (enable IP Lookup in Settings)';
  });
  const ipHide = $('#ip-hide-btn');
  if (ipHide) ipHide.addEventListener('click', () => { $('#ip-card').hidden = true; });

  const tProxy = $('#t-proxy');
  if (tProxy) tProxy.addEventListener('change', async (e) => {
    markInteraction(2500);
    const enabled = e.target.checked;
    if (enabled) {
      const host = ($('#proxy-host').value || '').trim() || '127.0.0.1';
      const port = parseInt($('#proxy-port').value, 10) || 9050;
      const scheme = $('#proxy-scheme').value || 'socks5';
      const r = await send({ action: 'setProxy', enabled: true, host: host, port: port, scheme: scheme });
      if (r && r.success) { showStatus('Proxy enabled', 'success'); refreshAll(); }
      else { e.target.checked = false; showStatus('Proxy failed: ' + ((r && r.error) || 'unknown'), 'error', 4000); }
    } else {
      const r = await send({ action: 'setProxy', enabled: false });
      if (r && r.success) { showStatus('Proxy disabled', 'success'); refreshAll(); }
    }
  });
  const btnTorando = $('#btn-torando');
  if (btnTorando) btnTorando.addEventListener('click', async () => {
    const r = await send({ action: 'setProxy', enabled: true, host: '127.0.0.1', port: 9050, scheme: 'socks5' });
    if (r && r.success) { showStatus('TORANDO active - Tor must be running on 127.0.0.1:9050', 'success', 3500); refreshAll(); }
    else showStatus('TORANDO failed: ' + ((r && r.error) || 'unknown'), 'error', 4000);
  });
  const btnPdc = $('#btn-proxy-disconnect');
  if (btnPdc) btnPdc.addEventListener('click', async () => {
    const r = await send({ action: 'setProxy', enabled: false });
    if (r && r.success) { showStatus('Proxy disconnected', 'success'); refreshAll(); }
  });

  async function addToWhitelist(domain) {
    domain = (domain || '').trim().toLowerCase();
    if (!domain) return;
    const r0 = await send({ action: 'getStats' });
    const list = (r0 && r0.whitelist) ? r0.whitelist.slice() : [];
    if (list.indexOf(domain) >= 0) { showStatus('Already whitelisted', 'info'); return; }
    list.push(domain);
    const r = await send({ action: 'updateWhitelist', whitelist: list });
    if (r && r.success) { showStatus('Whitelisted ' + domain, 'success'); refreshAll(); }
  }
  async function removeFromWhitelist(domain) {
    const r0 = await send({ action: 'getStats' });
    const list = (r0 && r0.whitelist) ? r0.whitelist.filter(d => d !== domain) : [];
    const r = await send({ action: 'updateWhitelist', whitelist: list });
    if (r && r.success) { showStatus('Removed ' + domain, 'success'); refreshAll(); }
  }
  const btnAddWl = $('#btn-add-whitelist');
  if (btnAddWl) btnAddWl.addEventListener('click', () => {
    addToWhitelist($('#whitelist-input').value);
    $('#whitelist-input').value = '';
  });
  const wlInput = $('#whitelist-input');
  if (wlInput) wlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#btn-add-whitelist').click(); }
  });

  const btnOpts = $('#btn-open-options');
  if (btnOpts) btnOpts.addEventListener('click', () => {
    if (browser.runtime.openOptionsPage) browser.runtime.openOptionsPage();
    else window.open(browser.runtime.getURL('stable-options.html'));
  });

  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, select, textarea')) markInteraction(3500);
  });
  document.addEventListener('input', () => markInteraction(2500));

  async function refreshAll() {
    if (isInteracting()) return;
    const r = await send({ action: 'getStats' });
    if (!r) return;
    reflectSettings(r.settings);
    reflectStats(r);
    reflectProxy(r.proxySettings);
    reflectWhitelist(r.whitelist);
    reflectLogs(r.blockLogs);
  }

  let pollTimer = null;
  function startPolling() {
    refreshAll();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshAll, 1500);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    } else {
      startPolling();
    }
  });

  // Populate version from manifest (FIX: was hardcoded in HTML)
  function setVersion() {
    try {
      const m = browser && browser.runtime && browser.runtime.getManifest && browser.runtime.getManifest();
      if (m && typeof m.version === 'string') {
        const el = document.getElementById('app-version');
        if (el) el.textContent = 'v' + m.version;
      }
    } catch (e) {}
  }

  function init() { setVersion(); startPolling(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
