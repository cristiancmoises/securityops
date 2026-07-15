# Security Ops

Privacy-first browser hardening extension (Manifest V3) for Chrome, Edge and
Firefox: ad/tracker/malware blocking via declarativeNetRequest, site-wide dark
theme, YouTube ad skipping, search-engine redirects, tracking-parameter
stripping, HTTPS enforcement, and SOCKS/HTTP proxy with one-click Tor.

**License:** GPL-3.0-or-later · **Homepage:** <https://extension.securityops.co>

## Features

- **Category blocking** — ads, trackers, malware, gambling, adult, social,
  scripts, media and the extra-aggressive "Gigachad" list. Powered by
  [hagezi/dns-blocklists](https://github.com/hagezi/dns-blocklists) and
  chadmayfield's NSFW list, refreshed every 24 h, with a hardcoded
  high-priority seed so popular domains are blocked immediately at install.
- **YouTube ad blocking** — a page-world (`world: MAIN`) script patches
  `JSON.parse`, `fetch` and `XMLHttpRequest` before YouTube's own code runs,
  stripping ad placements from player responses; an isolated-world companion
  clicks skip buttons, fast-forwards unskippables and prunes ad DOM nodes.
- **Dark theme everywhere** — injected at `document_start` with a chosen
  accent color (12 palettes); YouTube uses its native dark mode for
  compatibility. Fully reversible: deactivation walks the DOM and removes
  every inline style the extension set.
- **Privacy utilities** — strip `utm_*`/`fbclid`/`gclid`/… parameters,
  upgrade HTTP→HTTPS, optional redirects (Google/Bing → SecurityOps Search,
  YouTube → Invidious, Reddit → Redlib).
- **Proxy & Tor** — fixed-server proxy on Chromium, `proxy.onRequest` on
  Firefox; the TORANDO button points traffic at a local Tor daemon
  (`127.0.0.1:9050`).
- **Panic button** — clears all DNR rules, wipes browsing data and closes
  every tab in one click.
- **No telemetry.** The extension makes no network requests other than
  blocklist downloads (jsDelivr/GitHub) and the opt-in IP lookup
  (api.ipify.org). See `src/privacy-policy.html`.

## Install (development)

Chrome / Edge:

1. `./build.sh`
2. Open `chrome://extensions` (or `edge://extensions`), enable *Developer mode*.
3. *Load unpacked* → select `dist/chrome` (or `dist/edge`).

Firefox:

1. `./build.sh`
2. Open `about:debugging#/runtime/this-firefox`.
3. *Load Temporary Add-on* → select `dist/firefox/manifest.json`.

## Build & release

```sh
./build.sh          # builds dist/{chrome,edge,firefox}/ + store zips + SHA256SUMS
./build.sh clean    # removes dist/
```

The only build dependencies are `bash`, `python3`, `zip` and `sha256sum`.
All targets are built from the single source tree in `src/`; the Firefox
manifest (event-page background, gecko ID) is derived from `src/manifest.json`
at build time. Verify downloaded artifacts with:

```sh
sha256sum -c SHA256SUMS
```

## Repository layout

```
src/                    extension source (loadable as unpacked after build)
  manifest.json         Chromium MV3 manifest (Firefox variant is generated)
  stable-background.js  service worker: DNR rules, blocklists, proxy, stats
  stable-content.js     dark theme + accent color content script
  secops-reporter.js    blocked-resource detector (logs view)
  youtube-adblock.js    YouTube isolated-world: skip/prune/dark mode
  youtube-adblock-page.js  YouTube page-world: JSON.parse/fetch/XHR patches
  stable-popup.*        toolbar popup (dashboard / settings / logs)
  stable-options.*      full settings page
  rules.json            static DNR rules (common ad/tracker hosts)
  rules-youtube.json    static DNR rules for YouTube ad endpoints
  css/, icons/          shared styles, SVG icon factory, app icons
build.sh                multi-target release builder
SECURITY.md             vulnerability reporting policy
LICENSE                 GPL-3.0
```

## Architecture notes

- **State of truth** lives in the background worker (`currentSettings`,
  `currentWhitelist`, `currentProxy`), mirrored to `storage.sync`. UI pages
  poll `getStats` and push patches through `updateSettings`; three fallback
  channels (runtime message, `storage.onChanged`, 1 s poll) keep content
  scripts converged even if the worker sleeps.
- **Blocking** uses dynamic DNR rules chunked at 1000 domains/rule inside
  per-category ID ranges (see `RULE_RANGES`), so a category toggle only
  touches its own range. Whitelisted domains get explicit `allow` rules plus
  `excludedRequestDomains` on every block rule.
- **Hardening** — message action allowlist + sender validation, per-key
  settings validation, domain regex on every blocklist/whitelist insertion,
  HTTPS-only fetches with timeout/retry/size caps, URL shape validation
  before logging, prototype-free hot maps, no `innerHTML`/`eval`.

## Security

See [SECURITY.md](SECURITY.md). Report vulnerabilities to
**ethicalhacker@riseup.net**.

## Permissions

Every permission below maps to a specific user-facing feature; the extension
requests nothing it does not use. These justifications are the text supplied to
the Chrome Web Store, Edge Add-ons and Firefox AMO review dashboards.

| Permission | Why it is needed |
|------------|------------------|
| `storage` | Persist the user's settings, whitelist and proxy configuration locally and via `storage.sync`. |
| `declarativeNetRequest` | Block ads, trackers and malware with static + dynamic rules. The browser matches rules itself; the extension never reads request contents. |
| `declarativeNetRequestFeedback` | Populate the logs view with which rule blocked a request, for user-visible transparency and debugging. |
| `proxy` | Route traffic through a user-configured SOCKS/HTTP proxy, and the one-click Tor (`127.0.0.1:9050`) button. |
| `tabs` / `activeTab` | Apply theming and redirects to the current tab and, for the panic button, close open tabs. |
| `browsingData` | The panic button wipes browsing data (cache, cookies, history) in one click. |
| `webNavigation` | Detect navigations early so the dark theme and redirects apply at `document_start`. |
| `alarms` | Schedules the periodic blocklist refresh. The extension re-downloads its domain blocklists every 24 hours. Because a Manifest V3 service worker is terminated when idle, `chrome.alarms` is the only reliable way to run that refresh on schedule. A single repeating alarm is created at install and triggers the update job. It is used for nothing else: no polling of user activity, no tracking, no network requests other than the blocklist download itself. |
| `<all_urls>` (host) | Content scripts (dark theme, tracking-parameter stripping, YouTube ad blocking) and site-wide DNR blocking must run on every site the user visits. |

No permission is used for analytics or telemetry. See `src/privacy-policy.html`.

## Changelog

### v10.1.1 — 2026-07-15

- **Docs:** documented every requested permission and its store-submission
  justification in the new [Permissions](#permissions) section — including the
  `alarms` permission, which schedules the 24-hour blocklist refresh (the only
  reliable way to run it on an idle-terminated MV3 service worker).
- **Build:** `build.sh` now excludes Chrome's generated `_metadata/` ruleset
  cache from packaged artifacts; repackaged Chrome, Edge and Firefox zips.
- No functional code changes — the `alarms` refresh job shipped in 10.1.0.

### v10.1.0 — 2026-06-10

- **Fixed:** "Hide" button on the IP card (and any `hidden` element) had no
  effect — `.ip-card { display:flex }` overrode the `hidden` attribute.
- **Fixed:** accent swatch click handlers were re-registered on every popup
  refresh tick, firing duplicate settings updates per click.
- **Fixed:** options page rendered without icons for 11 of its labels/buttons
  (`film`, `filter`, `zap`, `https`, `redirect`, `play`, `message`, `paint`,
  `check`, `database`, `alert` were missing from the icon factory).
- **Fixed:** soft accent colors and white fell back to cyan on the options
  page (incomplete `ACCENT_VALUES` list).
- **Fixed:** background message handler could throw on malformed messages
  (shape validated before `msg.action` is read).
- **Fixed:** `window.applyIcons()` early-hydration entry point now exists.
- **Fixed:** IP lookup help text named the wrong service (api.ipify.org).
- Repository restructured into a buildable `src/` tree with `manifest.json`
  under version control and a reproducible multi-browser `build.sh`.

### v10.0.0

- Initial public source drop.
