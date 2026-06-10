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

// stable-options.js — Security Ops v3.7.0
(() => {
  'use strict';
  const browser = self.browser || self.chrome;

  // v5.0: dynamic version label in header
  function setOptionsVersion() {
    try {
      const m = browser.runtime.getManifest();
      const el = document.getElementById('opt-version');
      if (el && m && m.version) el.textContent = 'v' + m.version;
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setOptionsVersion);
  else setOptionsVersion();

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Render SVG icons immediately
  if (typeof window.applyIcons === 'function') {
    window.applyIcons();
  }

  function send(msg) {
    return new Promise((resolve) => {
      let resolved = false;
      const finish = (v) => { if (!resolved) { resolved = true; resolve(v); } };
      try {
        const maybeP = browser.runtime.sendMessage(msg, (response) => {
          if (browser.runtime.lastError) finish(null);
          else finish(response);
        });
        if (maybeP && typeof maybeP.then === 'function') {
          maybeP.then(finish).catch(() => finish(null));
        }
        setTimeout(() => finish(null), 5000);
      } catch (e) { finish(null); }
    });
  }

  let userInteractingUntil = 0;
  function markInteraction(ms) { userInteractingUntil = Date.now() + (ms || 2500); }
  function isInteracting() { return Date.now() < userInteractingUntil; }

  let bannerTimer;
  function showStatus(msg, kind, ms) {
    kind = kind || 'info';
    ms = ms || 1800;
    const b = $('#status-banner'); if (!b) return;
    clearTimeout(bannerTimer);
    b.textContent = msg;
    b.classList.remove('is-success', 'is-error', 'is-info');
    b.classList.add('is-visible', 'is-' + kind);
    bannerTimer = setTimeout(() => b.classList.remove('is-visible'), ms);
  }

  // FIX v10.1: list was missing the six soft-* colors and white, so picking
  // one of them in the dropdown silently fell back to cyan on this page.
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
  }

  function reflectWhitelist(list) {
    const ul = $('#whitelist-list'); if (!ul) return;
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    const items = list || [];
    if (items.length === 0) {
      const li = document.createElement('li');
      li.style.fontStyle = 'italic';
      li.style.color = 'var(--text-3)';
      li.style.fontFamily = 'var(--font-stack)';
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

  function prettify(k) {
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
  }

  $$('.switch-input[data-setting]').forEach(input => {
    input.addEventListener('change', async () => {
      markInteraction();
      const k = input.dataset.setting;
      const obj = {}; obj[k] = input.checked;
      const r = await send({ action: 'updateSettings', settings: obj });
      if (r && r.success) showStatus(prettify(k) + ' ' + (input.checked ? 'enabled' : 'disabled'), 'success');
      else { input.checked = !input.checked; showStatus('Failed', 'error'); }
    });
  });
  $$('select[data-setting]').forEach(sel => {
    sel.addEventListener('change', async () => {
      markInteraction();
      const k = sel.dataset.setting;
      if (k === 'fontColor') applyAccent(sel.value);
      const obj = {}; obj[k] = sel.value;
      const r = await send({ action: 'updateSettings', settings: obj });
      if (r && r.success) showStatus(prettify(k) + ' updated', 'success');
    });
  });

  const btnClearStats = $('#btn-clear-stats');
  if (btnClearStats) btnClearStats.addEventListener('click', async () => {
    if (!confirm('Clear all statistics?')) return;
    const r = await send({ action: 'clearStats' });
    if (r && r.success) showStatus('Stats cleared', 'success');
  });
  const btnClearLogs = $('#btn-clear-logs');
  if (btnClearLogs) btnClearLogs.addEventListener('click', async () => {
    if (!confirm('Clear all logs?')) return;
    const r = await send({ action: 'clearLogs' });
    if (r && r.success) showStatus('Logs cleared', 'success');
  });
  const btnUpdate = $('#btn-update-filters');
  if (btnUpdate) btnUpdate.addEventListener('click', async () => {
    showStatus('Refreshing blocklists...', 'info', 4000);
    const r = await send({ action: 'updateFilters' });
    if (r && r.success) showStatus('Blocklists refreshed', 'success');
  });
  const btnPanic = $('#btn-panic');
  if (btnPanic) btnPanic.addEventListener('click', async () => {
    if (!confirm('PANIC: Clear ALL browsing data and close ALL tabs?')) return;
    await send({ action: 'panic' });
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

  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, select, textarea')) markInteraction(3500);
  });
  document.addEventListener('input', () => markInteraction());

  async function refreshAll() {
    if (isInteracting()) return;
    const r = await send({ action: 'getStats' });
    if (!r) return;
    reflectSettings(r.settings);
    reflectWhitelist(r.whitelist);
  }

  function init() {
    refreshAll();
    setInterval(() => { if (!document.hidden) refreshAll(); }, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
