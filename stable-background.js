const browser = self.browser || self.chrome || {};

let currentSettings = {
    blockAds: true,
    blockTrackers: true,
    blockMalware: true,
    blockGambling: false,
    blockAdult: false,
    blockSocial: false,
    blockBadJS: false,
    blockMedia: false,
    blockGigachad: false,
    stripTrackingParams: true,
    enforceHttps: true,
    blackThemeEnabled: true,
    fontColor: 'soft-green',
    redirectGoogle: true,
    redirectYouTube: true,
    redirectReddit: true
};

let currentBlocklists = {
    ads: [],
    trackers: [],
    malware: [],
    gambling: [],
    adult: [],
    social: [],
    gigachad: []
};

let extensionState = {
    proxySettings: {
        enabled: false,
        scheme: 'socks5',
        host: '127.0.0.1',
        port: 9050
    },
    blockedRequestsCount: 0,
    blockingStats: {
        ads: 0,
        trackers: 0,
        malware: 0,
        gambling: 0,
        adult: 0,
        social: 0,
        scripts: 0,
        media: 0,
        gigachad: 0
    },
    blockLogs: [],
    whitelist: ['securityops.co', '*.securityops.co','redlib.catsarch.com', 'invidious.nerdvpn.de', 'cristiancezarmoises.com'],
    userIP: null,
    ipLastFetched: null
};

async function init() {
    try {
        console.log('Security Ops background script initializing...');
        await loadSettings();
        const storedIP = await browser.storage.local.get(['userIP', 'ipLastFetched']);
        extensionState.userIP = storedIP.userIP || null;
        extensionState.ipLastFetched = storedIP.ipLastFetched || null;
        if (!extensionState.userIP) {
            await fetchIP(true);
        }
        if (browser.runtime && browser.runtime.onMessage) {
            setupMessageListeners();
        } else {
            console.warn('Security Ops: browser.runtime.onMessage not available');
        }
        if (browser.declarativeNetRequest) {
            setupDeclarativeNetRequestRules();
            setupDeclarativeNetRequestListeners();
        } else {
            console.warn('Security Ops: browser.declarativeNetRequest not available');
        }
        if (browser.proxy && browser.proxy.onError) {
            setupProxyListeners();
        }
        if (browser.omnibox) {
            setupOmniboxHandler();
        }
        await fetchBlocklists();
        applySettings();
        setupWebNavigationListener();
        console.log('Security Ops background script initialized successfully');
    } catch (error) {
        console.error('Security Ops background script initialization failed:', error);
    }
}

async function fetchIP(force = false) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    if (!force && extensionState.userIP && extensionState.ipLastFetched && (now - extensionState.ipLastFetched) < oneHour) {
        return extensionState.userIP;
    } else {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            extensionState.userIP = data.ip;
            extensionState.ipLastFetched = now;
            await browser.storage.local.set({
                userIP: extensionState.userIP,
                ipLastFetched: extensionState.ipLastFetched
            });
            return data.ip;
        } catch (error) {
            console.error('Security Ops: Failed to fetch IP:', error);
            return 'Unable to fetch';
        }
    }
}

init();

function setupWebNavigationListener() {
    browser.webNavigation.onCompleted.addListener((details) => {
        if (details.frameId === 0) {
            extensionState.blockLogs.push({
                url: details.url,
                reason: 'visited',
                timestamp: new Date().toISOString()
            });
            if (extensionState.blockLogs.length > 1000) {
                extensionState.blockLogs.shift();
            }
        }
    }, { url: [{ schemes: ["http", "https"] }] });
}

async function loadSettings() {
    try {
        const result = await browser.storage.sync.get([
            'blockAds', 'blockTrackers', 'blockMalware', 'blockGambling',
            'blockAdult', 'blockSocial', 'blockBadJS', 'blockMedia', 'blockGigachad',
            'stripTrackingParams', 'enforceHttps', 'blackThemeEnabled', 'fontColor',
            'redirectGoogle', 'redirectYouTube', 'redirectReddit', 'proxySettings', 'whitelist'
        ]);
        currentSettings = { ...currentSettings, ...result };
        extensionState.proxySettings = { ...extensionState.proxySettings, ...result.proxySettings };
        extensionState.whitelist = result.whitelist || ['securityops.co', '*.securityops.co' , 'redlib.catsarch.com', 'invidious.nerdvpn.de', 'cristiancezarmoises.com'];
        await browser.storage.local.set({ 'librejs.enabled': currentSettings.blockBadJS || false });
        console.log('Security Ops: Settings loaded successfully:', currentSettings);
        setupDeclarativeNetRequestRules();
    } catch (error) {
        console.error('Security Ops: Failed to load settings:', error);
    }
}

async function fetchBlocklists() {
    try {
        const safeDomains = [
            'securityops.co', '*.securityops.co' , 'redlib.catsarch.com', 'invidious.nerdvpn.de', 'cristiancezarmoises.com'
        ];
        const mullvadResponse = await fetch('https://raw.githubusercontent.com/mullvad/dns-blocklists/main/output/dnsblocklist.txt');
        const mullvadText = await mullvadResponse.text();
        const mullvadDomains = mullvadText.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        const uBlockLists = {
            ads: 'https://ublockorigin.github.io/uAssets/filters/filters.txt',
            trackers: 'https://ublockorigin.github.io/uAssets/filters/privacy.txt',
            malware: 'https://ublockorigin.github.io/uAssets/filters/badware.txt',
            annoyances: 'https://ublockorigin.github.io/uAssets/filters/annoyances.txt'
        };

        const uBlockDomains = {};
        for (const [category, url] of Object.entries(uBlockLists)) {
            const response = await fetch(url);
            const text = await response.text();
            const domains = [];
            text.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('!') && !line.startsWith('[') && !line.includes('#')) {
                    const match = line.match(/^\|\|([^\/^]+)\^/);
                    if (match) {
                        domains.push(match[1]);
                    }
                }
            });
            uBlockDomains[category] = domains;
        }

        const gamblingResponse = await fetch('https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/adblock/gambling.txt');
        const gamblingText = await gamblingResponse.text();
        const gamblingDomains = [];
        gamblingText.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('!') && !line.startsWith('[') && !line.includes('#')) {
                const match = line.match(/^\|\|([^\/^]+)\^/);
                if (match) {
                    gamblingDomains.push(match[1]);
                }
            }
        });

        const adultResponse = await fetch('https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/adblock/nsfw.txt');
        const adultText = await adultResponse.text();
        const adultDomains = [];
        adultText.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('!') && !line.startsWith('[') && !line.includes('#')) {
                const match = line.match(/^\|\|([^\/^]+)\^/);
                if (match) {
                    adultDomains.push(match[1]);
                }
            }
        });

        const socialResponse = await fetch('https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/adblock/social.txt');
        const socialText = await socialResponse.text();
        const socialDomains = [];
        socialText.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('!') && !line.startsWith('[') && !line.includes('#')) {
                const match = line.match(/^\|\|([^\/^]+)\^/);
                if (match && !extensionState.whitelist.includes(match[1])) {
                    socialDomains.push(match[1]);
                }
            }
        });

        currentBlocklists.ads = [...new Set([...(uBlockDomains.ads || []), ...(uBlockDomains.annoyances || []), ...mullvadDomains.filter(d => d.includes('ad') || d.includes('banner') || d.includes('doubleclick'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
        currentBlocklists.trackers = [...new Set([...(uBlockDomains.trackers || []), ...mullvadDomains.filter(d => d.includes('track') || d.includes('analytics') || d.includes('pixel'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
        currentBlocklists.malware = [...new Set([...(uBlockDomains.malware || []), ...mullvadDomains.filter(d => d.includes('malware') || d.includes('virus'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
        currentBlocklists.gambling = [...new Set([...gamblingDomains, ...mullvadDomains.filter(d => d.includes('casino') || d.includes('bet') || d.includes('poker'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
        currentBlocklists.adult = [...new Set([...adultDomains, ...mullvadDomains.filter(d => d.includes('adult') || d.includes('porn') || d.includes('xxx'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
        currentBlocklists.social = [...new Set([...socialDomains, ...mullvadDomains.filter(d => d.includes('social'))])].filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));

        if (currentSettings.blockGigachad) {
            try {
                const gigachadResponse = await fetch('https://codeberg.org/berkeley/hostban/raw/branch/main/hosts');
                const gigachadText = await gigachadResponse.text();
                const gigachadDomains = gigachadText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(line => {
                        const parts = line.split(/\s+/);
                        return parts[1] || parts[0];
                    })
                    .filter(d => !safeDomains.some(s => d.includes(s)) && !extensionState.whitelist.includes(d));
                currentBlocklists.gigachad = gigachadDomains;
                console.log('Security Ops: Gigachad AdBlock list fetched successfully:', gigachadDomains.length);
            } catch (gigachadError) {
                console.error('Security Ops: Failed to fetch Gigachad AdBlock list:', gigachadError);
            }
        }

        console.log('Security Ops: Blocklists fetched successfully');
    } catch (error) {
        console.error('Security Ops: Failed to fetch blocklists:', error);
    }
}

function applySettings() {
    if (extensionState.proxySettings.enabled) {
        setupProxy();
    }
    setupDeclarativeNetRequestRules();
}

function setupProxy() {
    try {
        const proxyConfig = {
            mode: 'fixed_servers',
            rules: {
                singleProxy: {
                    scheme: extensionState.proxySettings.scheme,
                    host: extensionState.proxySettings.host,
                    port: extensionState.proxySettings.port
                },
                bypassList: extensionState.whitelist
            }
        };
        browser.proxy.settings.set({
            value: proxyConfig,
            scope: 'regular'
        });
        console.log('Security Ops: Proxy setup successfully:', proxyConfig);
    } catch (error) {
        console.error('Security Ops: Failed to setup proxy:', error);
        extensionState.proxySettings.enabled = false;
        browser.storage.sync.set({ proxySettings: extensionState.proxySettings });
    }
}

function setupMessageListeners() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.action) {
            case 'getStats':
                sendResponse({
                    blockedRequestsCount: extensionState.blockedRequestsCount,
                    blockingStats: extensionState.blockingStats,
                    proxySettings: extensionState.proxySettings,
                    settings: currentSettings,
                    blockLogs: extensionState.blockLogs,
                    whitelist: extensionState.whitelist
                });
                return true;
            case 'updateSettings':
                currentSettings = { ...currentSettings, ...message.settings };
                browser.storage.sync.set(currentSettings);
                setupDeclarativeNetRequestRules();
                browser.tabs.query({}).then(tabs => {
                    tabs.forEach(tab => {
                        browser.tabs.sendMessage(tab.id, { action: 'updateTheme' }).catch(() => {});
                    });
                });
                sendResponse({ success: true });
                return true;
            case 'toggleProxy':
                extensionState.proxySettings.enabled = message.enabled;
                if (extensionState.proxySettings.enabled) {
                    setupProxy();
                } else {
                    browser.proxy.settings.clear({ scope: 'regular' });
                }
                browser.storage.sync.set({ proxySettings: extensionState.proxySettings });
                sendResponse({ success: true });
                return true;
            case 'toggleTorando':
                extensionState.proxySettings = {
                    enabled: true,
                    scheme: 'socks5',
                    host: '127.0.0.1',
                    port: 9050
                };
                setupProxy();
                browser.storage.sync.set({ proxySettings: extensionState.proxySettings });
                sendResponse({ success: true });
                return true;
            case 'disconnectProxy':
                extensionState.proxySettings.enabled = false;
                browser.proxy.settings.clear({ scope: 'regular' });
                browser.storage.sync.set({ proxySettings: extensionState.proxySettings });
                sendResponse({ success: true });
                return true;
            case 'updateFilters':
                fetchBlocklists().then(() => {
                    setupDeclarativeNetRequestRules();
                    sendResponse({ success: true });
                });
                return true;
            case 'clearStats':
                extensionState.blockedRequestsCount = 0;
                extensionState.blockingStats = {
                    ads: 0, trackers: 0, malware: 0, gambling: 0, adult: 0, social: 0, scripts: 0, media: 0, gigachad: 0
                };
                browser.storage.sync.set({
                    blockedRequestsCount: extensionState.blockedRequestsCount,
                    blockingStats: extensionState.blockingStats
                });
                sendResponse({ success: true });
                return true;
            case 'updateWhitelist':
                extensionState.whitelist = [...new Set([...(message.whitelist || []), 'securityops.co', '*.securityops.co' , 'redlib.catsarch.com', 'invidious.nerdvpn.de', 'cristiancezarmoises.com'])];
                browser.storage.sync.set({ whitelist: extensionState.whitelist });
                setupDeclarativeNetRequestRules();
                if (extensionState.proxySettings.enabled) {
                    setupProxy();
                }
                sendResponse({ success: true });
                return true;
            case 'panic':
                browser.browsingData.remove({
                    since: 0
                }, {
                    cache: true,
                    cookies: true,
                    downloads: true,
                    formData: true,
                    history: true,
                    indexedDB: true,
                    localStorage: true,
                    pluginData: true,
                    serviceWorkers: true
                }).then(() => {
                    browser.tabs.query({}).then(tabs => {
                        tabs.forEach(tab => browser.tabs.remove(tab.id));
                    });
                    sendResponse({ success: true });
                });
                return true;
            case 'clearLogs':
                extensionState.blockLogs = [];
                sendResponse({ success: true });
                return true;
            case 'getIP':
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                if (!message.force && extensionState.userIP && extensionState.ipLastFetched && (now - extensionState.ipLastFetched) < oneHour) {
                    sendResponse({ ip: extensionState.userIP });
                } else {
                    fetch('https://ipapi.co/json/')
                        .then(res => res.json())
                        .then(data => {
                            extensionState.userIP = data.ip;
                            extensionState.ipLastFetched = now;
                            browser.storage.local.set({
                                userIP: extensionState.userIP,
                                ipLastFetched: extensionState.ipLastFetched
                            });
                            sendResponse({ ip: data.ip });
                        })
                        .catch(error => {
                            console.error('Security Ops: Failed to fetch IP:', error);
                            sendResponse({ ip: 'Unable to fetch' });
                        });
                }
                return true;
            default:
                sendResponse({ success: false, message: 'Unknown action' });
        }
    });
}

async function setupDeclarativeNetRequestRules() {
    try {
        let ruleId = 1;
        const rules = [];

        const categories = [
            { setting: 'blockAds', list: 'ads', includeMain: false },
            { setting: 'blockTrackers', list: 'trackers', includeMain: false },
            { setting: 'blockMalware', list: 'malware', includeMain: true },
            { setting: 'blockGambling', list: 'gambling', includeMain: true },
            { setting: 'blockAdult', list: 'adult', includeMain: true },
            { setting: 'blockSocial', list: 'social', includeMain: true }
        ];

        categories.forEach(cat => {
            if (currentSettings[cat.setting] && currentBlocklists[cat.list]?.length > 0) {
                let resourceTypes = ['script', 'xmlhttprequest', 'image', 'sub_frame'];
                if (cat.includeMain) {
                    resourceTypes.push('main_frame');
                }
                rules.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        requestDomains: currentBlocklists[cat.list],
                        resourceTypes: resourceTypes,
                        excludedRequestDomains: extensionState.whitelist
                    }
                });
            }
        });

        if (currentSettings.blockBadJS) {
            rules.push({
                id: ruleId++,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    resourceTypes: ['script'],
                    urlFilter: '*',
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.blockMedia) {
            rules.push({
                id: ruleId++,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    resourceTypes: ['image', 'media'],
                    urlFilter: '*',
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.blockGigachad && currentBlocklists.gigachad?.length > 0) {
            rules.push({
                id: ruleId++,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    requestDomains: currentBlocklists.gigachad,
                    resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest', 'image'],
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.stripTrackingParams) {
            const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
            trackingParams.forEach(param => {
                rules.push({
                    id: ruleId++,
                    priority: 2,
                    action: {
                        type: 'redirect',
                        redirect: { transform: { queryTransform: { removeParams: [param] } } }
                    },
                    condition: {
                        urlFilter: `*${param}=*`,
                        resourceTypes: ['main_frame', 'sub_frame'],
                        excludedRequestDomains: extensionState.whitelist
                    }
                });
            });
        }

        if (currentSettings.enforceHttps) {
            rules.push({
                id: ruleId++,
                priority: 3,
                action: { type: 'upgradeScheme' },
                condition: {
                    urlFilter: 'http://*',
                    resourceTypes: ['main_frame', 'sub_frame'],
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.redirectGoogle) {
            rules.push({
                id: ruleId++,
                priority: 2,
                action: {
                    type: 'redirect',
                    redirect: { regexSubstitution: 'https://securityops.co/web?s=\\2' }
                },
                condition: {
                    regexFilter: '^https?://(www\\.)?google\\.[a-z.]+/search\\?q=([^&]*)',
                    resourceTypes: ['main_frame'],
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.redirectYouTube) {
            rules.push({
                id: ruleId++,
                priority: 2,
                action: {
                    type: 'redirect',
                    redirect: { transform: { host: 'invidious.nerdvpn.de', scheme: 'https' } }
                },
                condition: {
                    regexFilter: '^https?://(www\\.)?youtube\\.com/watch.*',
                    resourceTypes: ['main_frame'],
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        if (currentSettings.redirectReddit) {
            rules.push({
                id: ruleId++,
                priority: 2,
                action: {
                    type: 'redirect',
                    redirect: { transform: { host: 'redlib.catsarch.com', scheme: 'https' } }
                },
                condition: {
                    regexFilter: '^https?://(www\\.)?reddit\\.com/r/.*',
                    resourceTypes: ['main_frame'],
                    excludedRequestDomains: extensionState.whitelist
                }
            });
        }

        await browser.declarativeNetRequest.updateDynamicRules({
            addRules: rules,
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
        });
        console.log('Security Ops: DeclarativeNetRequest rules updated:', rules.length);
    } catch (error) {
        console.error('Security Ops: Failed to update declarativeNetRequest rules:', error);
    }
}

function setupDeclarativeNetRequestListeners() {
    if (browser.declarativeNetRequest && browser.declarativeNetRequest.onRuleMatchedDebug) {
        browser.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
            const url = info.request.url.toLowerCase();
            if (extensionState.whitelist.some(domain => url.includes(domain))) {
                return;
            }
            extensionState.blockedRequestsCount++;
            let reason = 'unknown';
            if (currentBlocklists.adult.some(d => url.includes(d))) reason = 'adult';
            else if (currentSettings.blockSocial && currentBlocklists.social.some(d => url.includes(d))) reason = 'social';
            else if (currentBlocklists.ads.some(d => url.includes(d))) reason = 'ads';
            else if (currentBlocklists.trackers.some(d => url.includes(d))) reason = 'trackers';
            else if (currentBlocklists.malware.some(d => url.includes(d))) reason = 'malware';
            else if (currentBlocklists.gambling.some(d => url.includes(d))) reason = 'gambling';
            else if (info.request.type === 'script' && currentSettings.blockBadJS) reason = 'scripts';
            else if (['image', 'media'].includes(info.request.type) && currentSettings.blockMedia) reason = 'media';
            else if (currentBlocklists.gigachad.some(d => url.includes(d))) reason = 'gigachad';
            if (reason !== 'unknown') {
                extensionState.blockingStats[reason]++;
            }
            extensionState.blockLogs.push({
                url: info.request.url,
                reason: reason,
                timestamp: new Date().toISOString()
            });
            if (extensionState.blockLogs.length > 1000) {
                extensionState.blockLogs.shift();
            }
            browser.storage.sync.set({
                blockedRequestsCount: extensionState.blockedRequestsCount,
                blockingStats: extensionState.blockingStats
            });
        });
    }
}

function setupProxyListeners() {
    browser.proxy.onError.addListener((error) => {
        console.error('Security Ops: Proxy error:', error);
        extensionState.proxySettings.enabled = false;
        browser.storage.sync.set({ proxySettings: extensionState.proxySettings });
    });
}

browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        Object.keys(changes).forEach(key => {
            if (currentSettings.hasOwnProperty(key)) {
                currentSettings[key] = changes[key].newValue;
            } else if (key === 'proxySettings') {
                extensionState.proxySettings = { ...extensionState.proxySettings, ...changes[key].newValue };
            } else if (key === 'whitelist') {
                extensionState.whitelist = [...new Set([...(changes[key].newValue || []), 'securityops.co', '*.securityops.co', 'redlib.catsarch.com', 'invidious.nerdvpn.de', 'cristiancezarmoises.com'])];
                setupDeclarativeNetRequestRules();
            }
        });
        setupDeclarativeNetRequestRules();
        applySettings();
        browser.tabs.query({}).then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, { action: 'updateTheme' }).catch(() => {});
            });
        });
    }
});

console.log('Security Ops background script v3.4.0 loaded');
