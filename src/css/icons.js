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

// css/icons.js — Security Ops v3.8.0 — SVG icons (no emoji, no innerHTML)
// SVGs are built via createElementNS to satisfy Firefox addon-linter (no innerHTML).
(() => {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Each entry: array of [tagName, attrs] for child elements.
  const ICONS = {
    shield: [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }]],
    eye: [
      ['path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z' }],
      ['circle', { cx: '12', cy: '12', r: '3' }]
    ],
    bug: [
      ['rect', { x: '8', y: '6', width: '8', height: '14', rx: '4' }],
      ['path', { d: 'M12 6V3' }], ['path', { d: 'M9 3l1 2' }], ['path', { d: 'M15 3l-1 2' }],
      ['path', { d: 'M3 13h5' }], ['path', { d: 'M16 13h5' }]
    ],
    dice: [
      ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }],
      ['circle', { cx: '8.5', cy: '8.5', r: '1' }],
      ['circle', { cx: '15.5', cy: '8.5', r: '1' }],
      ['circle', { cx: '15.5', cy: '15.5', r: '1' }],
      ['circle', { cx: '8.5', cy: '15.5', r: '1' }]
    ],
    eyeoff: [
      ['path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }],
      ['path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }],
      ['path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }],
      ['line', { x1: '2', y1: '2', x2: '22', y2: '22' }]
    ],
    users: [
      ['path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }],
      ['circle', { cx: '9', cy: '7', r: '4' }],
      ['path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }],
      ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]
    ],
    code: [
      ['polyline', { points: '16 18 22 12 16 6' }],
      ['polyline', { points: '8 6 2 12 8 18' }]
    ],
    music: [
      ['path', { d: 'M9 18V5l12-2v13' }],
      ['circle', { cx: '6', cy: '18', r: '3' }],
      ['circle', { cx: '18', cy: '16', r: '3' }]
    ],
    flame: [['path', { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }]],
    broom: [
      ['path', { d: 'M19.4 6.6L8 18l-4-4' }],
      ['path', { d: 'M14 11.4L19.4 6 22 8.6 16.6 14' }],
      ['path', { d: 'M3 21l4-4' }]
    ],
    lock: [
      ['rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }],
      ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]
    ],
    globe: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['line', { x1: '2', y1: '12', x2: '22', y2: '12' }],
      ['path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }]
    ],
    search: [
      ['circle', { cx: '11', cy: '11', r: '8' }],
      ['line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }]
    ],
    chat: [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
    moon: [['path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }]],
    proxy: [
      ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
      ['path', { d: 'M9 12l2 2 4-4' }]
    ],
    youtube: [
      ['path', { d: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z' }],
      ['polygon', { points: '9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02' }]
    ],
    gear: [
      ['circle', { cx: '12', cy: '12', r: '3' }],
      ['path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }]
    ],
    list: [
      ['line', { x1: '8', y1: '6', x2: '21', y2: '6' }],
      ['line', { x1: '8', y1: '12', x2: '21', y2: '12' }],
      ['line', { x1: '8', y1: '18', x2: '21', y2: '18' }],
      ['line', { x1: '3', y1: '6', x2: '3.01', y2: '6' }],
      ['line', { x1: '3', y1: '12', x2: '3.01', y2: '12' }],
      ['line', { x1: '3', y1: '18', x2: '3.01', y2: '18' }]
    ],
    refresh: [
      ['polyline', { points: '23 4 23 10 17 10' }],
      ['polyline', { points: '1 20 1 14 7 14' }],
      ['path', { d: 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' }]
    ],
    download: [
      ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
      ['polyline', { points: '7 10 12 15 17 10' }],
      ['line', { x1: '12', y1: '15', x2: '12', y2: '3' }]
    ],
    warn: [
      ['path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }],
      ['line', { x1: '12', y1: '9', x2: '12', y2: '13' }],
      ['line', { x1: '12', y1: '17', x2: '12.01', y2: '17' }]
    ],
    onion: [
      ['ellipse', { cx: '12', cy: '13', rx: '7', ry: '8' }],
      ['ellipse', { cx: '12', cy: '13', rx: '4', ry: '5' }],
      ['path', { d: 'M9 4c1-1.5 2-2 3-2s2 0.5 3 2' }]
    ],
    // FIX v10.1: icons below were referenced by stable-options.html but never
    // defined, so the options page rendered empty icon slots.
    filter: [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
    film: [
      ['rect', { x: '2', y: '2', width: '20', height: '20', rx: '2.18', ry: '2.18' }],
      ['line', { x1: '7', y1: '2', x2: '7', y2: '22' }],
      ['line', { x1: '17', y1: '2', x2: '17', y2: '22' }],
      ['line', { x1: '2', y1: '12', x2: '22', y2: '12' }],
      ['line', { x1: '2', y1: '7', x2: '7', y2: '7' }],
      ['line', { x1: '2', y1: '17', x2: '7', y2: '17' }],
      ['line', { x1: '17', y1: '17', x2: '22', y2: '17' }],
      ['line', { x1: '17', y1: '7', x2: '22', y2: '7' }]
    ],
    zap: [['polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }]],
    redirect: [
      ['polyline', { points: '15 14 20 9 15 4' }],
      ['path', { d: 'M4 20v-7a4 4 0 0 1 4-4h12' }]
    ],
    play: [['polygon', { points: '5 3 19 12 5 21 5 3' }]],
    paint: [['path', { d: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' }]],
    check: [['polyline', { points: '20 6 9 17 4 12' }]],
    database: [
      ['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }],
      ['path', { d: 'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' }],
      ['path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' }]
    ]
  };

  // Aliases: alternate names used in markup that map to an existing glyph.
  const ICON_ALIASES = { https: 'lock', message: 'chat', alert: 'warn' };

  function buildSVG(name) {
    const parts = ICONS[name] || ICONS[ICON_ALIASES[name]];
    if (!parts) return null;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const [tag, attrs] of parts) {
      const child = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) {
        child.setAttribute(k, v);
      }
      svg.appendChild(child);
    }
    return svg;
  }

  function hydrate(root) {
    root = root || document;
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.iconHydrated) return;
      const svg = buildSVG(el.dataset.icon);
      if (!svg) return;
      // Clear any existing children safely (no innerHTML)
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(svg);
      el.dataset.iconHydrated = '1';
    });
  }

  self.SecOpsIcons = { hydrate, buildSVG };
  // FIX v10.1: stable-popup.js / stable-options.js call window.applyIcons()
  // for immediate hydration, but only SecOpsIcons.hydrate existed. Expose the
  // expected entry point so early hydration actually runs.
  self.applyIcons = hydrate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrate());
  else hydrate();
})();
