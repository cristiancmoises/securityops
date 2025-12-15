const browser = this.browser || this.chrome || {};

let elements = {};

let currentSettings = {
    blockAds: true,
    blockTrackers: true,
    blockMalware: true,
    blockGambling: false,
    blockAdult: false,
    blockSocial: false,
    blockBadJS: false,
    blockMedia: false,
    stripTrackingParams: true,
    enforceHttps: true,
    blackThemeEnabled: true,
    fontColor: 'soft-green',
    redirectGoogle: true,
    redirectYouTube: true,
    redirectReddit: true
};

let currentStats = {
    blockedRequestsCount: 0,
    blockingStats: {
        ads: 0, trackers: 0, malware: 0, gambling: 0, adult: 0, social: 0, scripts: 0
    }
};

let proxySettings = {
    enabled: false,
    scheme: 'socks5',
    host: '127.0.0.1',
    port: 9050
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Security Ops options page initializing...');
    try {
        elements = {
            blackThemeToggle: document.getElementById('black-theme-toggle'),
            fontColorSelect: document.getElementById('font-color-select'),
            blockAdsToggle: document.getElementById('block-ads-toggle'),
            blockTrackersToggle: document.getElementById('block-trackers-toggle'),
            blockMalwareToggle: document.getElementById('block-malware-toggle'),
            blockGamblingToggle: document.getElementById('block-gambling-toggle'),
            blockAdultToggle: document.getElementById('block-adult-toggle'),
            blockSocialToggle: document.getElementById('block-social-toggle'),
            blockBadJSToggle: document.getElementById('block-bad-js-toggle'),
            blockMediaToggle: document.getElementById('block-media-toggle'),
            stripTrackingParamsToggle: document.getElementById('strip-tracking-params-toggle'),
            enforceHttpsToggle: document.getElementById('enforce-https-toggle'),
            redirectGoogleToggle: document.getElementById('redirect-google-toggle'),
            redirectYouTubeToggle: document.getElementById('redirect-youtube-toggle'),
            redirectRedditToggle: document.getElementById('redirect-reddit-toggle'),
            proxyToggle: document.getElementById('proxy-toggle'),
            proxySchemeSelect: document.getElementById('proxy-scheme-select'),
            proxyHostInput: document.getElementById('proxy-host-input'),
            proxyPortInput: document.getElementById('proxy-port-input'),
            proxyStatus: document.getElementById('proxy-status'),
            torandoBtn: document.getElementById('torando-btn'),
            torandoStatus: document.getElementById('torando-status'),
            connectProxyBtn: document.getElementById('connect-proxy-btn'),
            disconnectProxyBtn: document.getElementById('disconnect-proxy-btn'),
            blockedCount: document.getElementById('blocked-count'),
            adsBlocked: document.getElementById('ads-blocked'),
            trackersBlocked: document.getElementById('trackers-blocked'),
            malwareBlocked: document.getElementById('malware-blocked'),
            clearStatsBtn: document.getElementById('clear-stats-btn'),
            updateFiltersBtn: document.getElementById('update-filters-btn'),
            exportSettingsBtn: document.getElementById('export-settings-btn'),
            importSettingsBtn: document.getElementById('import-settings-btn'),
            importFileInput: document.getElementById('import-file-input'),
            statusMessage: document.getElementById('status-message'),
            whitelistInput: document.getElementById('whitelist-input'),
            addWhitelistBtn: document.getElementById('add-whitelist-btn'),
            whitelistList: document.getElementById('whitelist-list')
        };

        await loadSettings();
        await loadStats();
        setupEventListeners();
        updateUI();
        console.log('Security Ops options page initialized successfully');
    } catch (error) {
        console.error('Security Ops options page initialization failed:', error);
        showStatus('Failed to initialize options page: ' + error.message, 'error');
    }
});

async function loadSettings() {
    try {
        console.log('Security Ops: Loading settings...');
        const result = await browser.storage.sync.get([
            'blockAds', 'blockTrackers', 'blockMalware', 'blockGambling',
            'blockAdult', 'blockSocial', 'blockBadJS', 'blockMedia',
            'stripTrackingParams', 'enforceHttps', 'blackThemeEnabled', 'fontColor',
            'redirectGoogle', 'redirectYouTube', 'redirectReddit', 'whitelist'
        ]);
        currentSettings = { ...currentSettings, ...result };
        proxySettings = { ...proxySettings, ...result.proxySettings };
        console.log('Security Ops: Settings loaded successfully:', currentSettings);
        await browser.runtime.sendMessage({
            action: 'updateSettings',
            settings: currentSettings
        });
    } catch (error) {
        console.error('Security Ops: Failed to load settings:', error);
        showStatus('Failed to load settings: ' + error.message, 'error');
    }
}

async function loadStats() {
    try {
        console.log('Security Ops: Loading stats...');
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'getStats' }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response) {
            currentStats = {
                blockedRequestsCount: response.blockedRequestsCount || 0,
                blockingStats: { ...currentStats.blockingStats, ...response.blockingStats }
            };
            proxySettings = { ...proxySettings, ...response.proxySettings };
            console.log('Security Ops: Stats loaded successfully');
        }
    } catch (error) {
        console.error('Security Ops: Failed to load stats:', error);
        showStatus('Failed to load statistics: ' + error.message, 'error');
        try {
            const storageData = await browser.storage.sync.get(['blockedRequestsCount', 'blockingStats', 'proxySettings']);
            if (storageData) {
                currentStats.blockedRequestsCount = storageData.blockedRequestsCount || 0;
                currentStats.blockingStats = { ...currentStats.blockingStats, ...storageData.blockingStats };
                proxySettings = { ...proxySettings, ...storageData.proxySettings };
                console.log('Security Ops: Loaded stats from storage as fallback');
            }
        } catch (storageError) {
            console.error('Security Ops: Failed to load from storage:', storageError);
        }
    }
}

function setupEventListeners() {
    try {
        const settings = [
            'blockAds', 'blockTrackers', 'blockMalware', 'blockGambling', 'blockAdult',
            'blockSocial', 'blockBadJS', 'blockMedia', 'stripTrackingParams', 'enforceHttps',
            'blackThemeEnabled', 'redirectGoogle', 'redirectYouTube', 'redirectReddit'
        ];
        settings.forEach(setting => {
            if (elements[setting + 'Toggle']) {
                elements[setting + 'Toggle'].addEventListener('change', async (e) => {
                    await updateSetting(setting, e.target.checked);
                });
            }
        });

        if (elements.fontColorSelect) {
            elements.fontColorSelect.addEventListener('change', async (e) => {
                await updateSetting('fontColor', e.target.value);
            });
        }

        if (elements.proxyToggle) {
            elements.proxyToggle.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await setProxy();
                } else {
                    await disconnectProxy();
                }
            });
        }

        if (elements.proxySchemeSelect) {
            elements.proxySchemeSelect.addEventListener('change', (e) => {
                proxySettings.scheme = e.target.value;
            });
        }

        if (elements.proxyHostInput) {
            elements.proxyHostInput.addEventListener('change', (e) => {
                proxySettings.host = e.target.value;
            });
        }

        if (elements.proxyPortInput) {
            elements.proxyPortInput.addEventListener('change', (e) => {
                proxySettings.port = parseInt(e.target.value) || 9050;
            });
        }

        if (elements.torandoBtn) {
            elements.torandoBtn.addEventListener('click', async () => {
                await activateTorando();
            });
        }

        if (elements.connectProxyBtn) {
            elements.connectProxyBtn.addEventListener('click', async () => {
                await setProxy();
            });
        }

        if (elements.disconnectProxyBtn) {
            elements.disconnectProxyBtn.addEventListener('click', async () => {
                await disconnectProxy();
            });
        }

        if (elements.clearStatsBtn) {
            elements.clearStatsBtn.addEventListener('click', async () => {
                await clearStats();
            });
        }

        if (elements.updateFiltersBtn) {
            elements.updateFiltersBtn.addEventListener('click', async () => {
                await updateFilters();
            });
        }

        if (elements.exportSettingsBtn) {
            elements.exportSettingsBtn.addEventListener('click', () => {
                exportSettings();
            });
        }

        if (elements.importSettingsBtn) {
            elements.importSettingsBtn.addEventListener('click', () => {
                if (elements.importFileInput) {
                    elements.importFileInput.click();
                }
            });
        }

        if (elements.importFileInput) {
            elements.importFileInput.addEventListener('change', async (e) => {
                await importSettings(e);
            });
        }

        if (elements.addWhitelistBtn) {
            elements.addWhitelistBtn.addEventListener('click', async () => {
                const domain = elements.whitelistInput.value.trim();
                if (domain && !currentSettings.whitelist.includes(domain)) {
                    currentSettings.whitelist = currentSettings.whitelist || [];
                    currentSettings.whitelist.push(domain);
                    await browser.storage.sync.set({ whitelist: currentSettings.whitelist });
                    await browser.runtime.sendMessage({ action: 'updateWhitelist', whitelist: currentSettings.whitelist });
                    elements.whitelistInput.value = '';
                    updateUI();
                    showStatus('Domain added to whitelist', 'success');
                } else {
                    showStatus('Invalid or duplicate domain', 'error');
                }
            });
        }

        console.log('Security Ops: Event listeners setup complete');
    } catch (error) {
        console.error('Security Ops: Failed to setup event listeners:', error);
        showStatus('Failed to setup event listeners: ' + error.message, 'error');
    }
}

async function updateSetting(key, value) {
    try {
        console.log(`Security Ops: Updating ${key} to ${value}`);
        currentSettings[key] = value;
        await browser.storage.sync.set({ [key]: value });
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({
                    action: 'updateSettings',
                    settings: { [key]: value }
                }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            updateUI();
            showStatus(`${key} updated successfully`, 'success');
            console.log(`Security Ops: Successfully updated ${key}`);
        } else {
            throw new Error(response?.error || 'Unknown error');
        }
    } catch (error) {
        console.error(`Security Ops: Failed to update ${key}:`, error);
        showStatus(`Failed to update ${key}: ${error.message}`, 'error');
        currentSettings[key] = !value;
        if (elements[key + 'Toggle']) {
            elements[key + 'Toggle'].checked = !value;
        } else if (elements[key + 'Select']) {
            elements[key + 'Select'].value = currentSettings[key];
        }
    }
}

async function setProxy() {
    try {
        console.log('Security Ops: Setting proxy...');
        showStatus('Connecting to proxy...', 'info');
        const proxyConfig = {
            mode: 'fixed_servers',
            rules: {
                singleProxy: {
                    scheme: proxySettings.scheme,
                    host: proxySettings.host,
                    port: parseInt(proxySettings.port)
                },
                bypassList: []
            }
        };
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({
                    action: 'setProxy',
                    proxySettings: proxyConfig
                }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            proxySettings.enabled = true;
            await browser.storage.sync.set({ proxySettings });
            updateUI();
            showStatus('Proxy connected successfully', 'success');
            console.log('Security Ops: Proxy connected successfully');
        } else {
            throw new Error(response?.message || 'Failed to connect proxy');
        }
    } catch (error) {
        console.error('Security Ops: Proxy connection error:', error);
        showStatus('Proxy connection failed: ' + error.message, 'error');
        proxySettings.enabled = false;
        if (elements.proxyToggle) {
            elements.proxyToggle.checked = false;
        }
    }
}

async function disconnectProxy() {
    try {
        console.log('Security Ops: Disconnecting proxy...');
        showStatus('Disconnecting proxy...', 'info');
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'disconnectProxy' }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            proxySettings.enabled = false;
            await browser.storage.sync.set({ proxySettings });
            updateUI();
            showStatus('Proxy disconnected successfully', 'success');
            console.log('Security Ops: Proxy disconnected successfully');
        } else {
            throw new Error(response?.message || 'Failed to disconnect proxy');
        }
    } catch (error) {
        console.error('Security Ops: Proxy disconnection error:', error);
        showStatus('Proxy disconnection failed: ' + error.message, 'error');
        proxySettings.enabled = true;
        if (elements.proxyToggle) {
            elements.proxyToggle.checked = true;
        }
    }
}

async function activateTorando() {
    try {
        console.log('Security Ops: Activating TORANDO...');
        showStatus('Activating TORANDO...', 'info');
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'torando' }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            proxySettings = {
                enabled: true,
                scheme: 'socks5',
                host: '127.0.0.1',
                port: 9050
            };
            await browser.storage.sync.set({ proxySettings });
            updateUI();
            showStatus('TORANDO activated successfully!', 'success');
            console.log('Security Ops: TORANDO activated successfully');
        } else {
            throw new Error(response?.message || 'Failed to activate TORANDO');
        }
    } catch (error) {
        console.error('Security Ops: TORANDO activation error:', error);
        showStatus('TORANDO activation failed: ' + error.message, 'error');
    }
}

async function clearStats() {
    try {
        console.log('Security Ops: Clearing statistics...');
        showStatus('Clearing statistics...', 'info');
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'clearStats' }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            currentStats.blockedRequestsCount = 0;
            currentStats.blockingStats = {
                ads: 0,
                trackers: 0,
                malware: 0,
                gambling: 0,
                adult: 0,
                social: 0,
                scripts: 0
            };
            updateUI();
            showStatus('Statistics cleared successfully', 'success');
            console.log('Security Ops: Statistics cleared successfully');
        } else {
            throw new Error(response?.message || 'Failed to clear statistics');
        }
    } catch (error) {
        console.error('Security Ops: Clear stats error:', error);
        showStatus('Failed to clear statistics: ' + error.message, 'error');
    }
}

async function updateFilters() {
    try {
        console.log('Security Ops: Updating filter lists...');
        showStatus('Updating filter lists...', 'info');
        if (elements.updateFiltersBtn) {
            elements.updateFiltersBtn.disabled = true;
            elements.updateFiltersBtn.textContent = 'Updating...';
        }
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'updateFilters' }, (response) => {
                    if (browser.runtime.lastError) {
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendMessage not available'));
            }
        });

        if (response && response.success) {
            showStatus('Filter lists updated successfully', 'success');
            console.log('Security Ops: Filter lists updated successfully');
        } else {
            throw new Error(response?.message || 'Failed to update filter lists');
        }
    } catch (error) {
        console.error('Security Ops: Update filters error:', error);
        showStatus('Failed to update filter lists: ' + error.message, 'error');
    } finally {
        if (elements.updateFiltersBtn) {
            elements.updateFiltersBtn.disabled = false;
            elements.updateFiltersBtn.textContent = 'Update Filters';
        }
    }
}

function exportSettings() {
    try {
        console.log('Security Ops: Exporting settings...');
        const settingsToExport = {
            ...currentSettings,
            proxySettings,
            exportDate: '2025-07-13 18:50:00-03' // Current date and time
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settingsToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'security_ops_settings.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showStatus('Settings exported successfully', 'success');
        console.log('Security Ops: Settings exported successfully');
    } catch (error) {
        console.error('Security Ops: Export settings error:', error);
        showStatus('Failed to export settings: ' + error.message, 'error');
    }
}

async function importSettings(event) {
    try {
        console.log('Security Ops: Importing settings...');
        showStatus('Importing settings...', 'info');
        const file = event.target.files[0];
        if (!file) {
            showStatus('No file selected', 'error');
            return;
        }
        const text = await file.text();
        const importedSettings = JSON.parse(text);
        await browser.storage.sync.set(importedSettings);
        Object.assign(currentSettings, importedSettings);
        proxySettings = { ...proxySettings, ...importedSettings.proxySettings };
        await browser.runtime.sendMessage({
            action: 'updateSettings',
            settings: currentSettings
        });
        updateUI();
        showStatus('Settings imported successfully', 'success');
        console.log('Security Ops: Settings imported successfully');
    } catch (error) {
        console.error('Security Ops: Import settings error:', error);
        showStatus('Failed to import settings: ' + error.message, 'error');
    } finally {
        if (elements.importFileInput) {
            elements.importFileInput.value = '';
        }
    }
}

function updateUI() {
    try {
        if (elements.blockedCount) {
            elements.blockedCount.textContent = currentStats.blockedRequestsCount.toLocaleString();
        }
        if (elements.adsBlocked) {
            elements.adsBlocked.textContent = currentStats.blockingStats.ads.toLocaleString();
        }
        if (elements.trackersBlocked) {
            elements.trackersBlocked.textContent = currentStats.blockingStats.trackers.toLocaleString();
        }
        if (elements.malwareBlocked) {
            elements.malwareBlocked.textContent = currentStats.blockingStats.malware.toLocaleString();
        }
        if (elements.blockAdsToggle) {
            elements.blockAdsToggle.checked = currentSettings.blockAds;
        }
        if (elements.blockTrackersToggle) {
            elements.blockTrackersToggle.checked = currentSettings.blockTrackers;
        }
        if (elements.blockMalwareToggle) {
            elements.blockMalwareToggle.checked = currentSettings.blockMalware;
        }
        if (elements.blockGamblingToggle) {
            elements.blockGamblingToggle.checked = currentSettings.blockGambling;
        }
        if (elements.blockAdultToggle) {
            elements.blockAdultToggle.checked = currentSettings.blockAdult;
        }
        if (elements.blockSocialToggle) {
            elements.blockSocialToggle.checked = currentSettings.blockSocial;
        }
        if (elements.blockBadJSToggle) {
            elements.blockBadJSToggle.checked = currentSettings.blockBadJS;
        }
        if (elements.blockMediaToggle) {
            elements.blockMediaToggle.checked = currentSettings.blockMedia;
        }
        if (elements.stripTrackingParamsToggle) {
            elements.stripTrackingParamsToggle.checked = currentSettings.stripTrackingParams;
        }
        if (elements.enforceHttpsToggle) {
            elements.enforceHttpsToggle.checked = currentSettings.enforceHttps;
        }
        if (elements.blackThemeToggle) {
            elements.blackThemeToggle.checked = currentSettings.blackThemeEnabled;
        }
        if (elements.fontColorSelect) {
            elements.fontColorSelect.value = currentSettings.fontColor || 'soft-green';
        }
        if (elements.redirectGoogleToggle) {
            elements.redirectGoogleToggle.checked = currentSettings.redirectGoogle;
        }
        if (elements.redirectYouTubeToggle) {
            elements.redirectYouTubeToggle.checked = currentSettings.redirectYouTube;
        }
        if (elements.redirectRedditToggle) {
            elements.redirectRedditToggle.checked = currentSettings.redirectReddit;
        }
        if (elements.proxyStatus && elements.proxyToggle) {
            elements.proxyStatus.textContent = proxySettings.enabled ? 'Connected' : 'Disconnected';
            elements.proxyStatus.className = proxySettings.enabled ? 'text-green-500' : 'text-red-500';
            elements.proxyToggle.checked = proxySettings.enabled;
            elements.connectProxyBtn.classList.toggle('hidden', proxySettings.enabled);
            elements.disconnectProxyBtn.classList.toggle('hidden', !proxySettings.enabled);
            elements.proxySchemeSelect.value = proxySettings.scheme;
            elements.proxyHostInput.value = proxySettings.host;
            elements.proxyPortInput.value = proxySettings.port;
        }
        if (elements.torandoStatus) {
            elements.torandoStatus.textContent = proxySettings.enabled && proxySettings.host === '127.0.0.1' && proxySettings.port === 9050 ? 'Status: ACTIVE' : 'Status: INACTIVE';
            elements.torandoStatus.className = proxySettings.enabled && proxySettings.host === '127.0.0.1' && proxySettings.port === 9050 ? 'text-green-500' : 'text-red-500';
        }

        if (elements.whitelistList) {
            elements.whitelistList.innerHTML = '';
            (currentSettings.whitelist || []).forEach(domain => {
                const li = document.createElement('li');
                li.textContent = domain;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', async () => {
                    currentSettings.whitelist = currentSettings.whitelist.filter(d => d !== domain);
                    await browser.storage.sync.set({ whitelist: currentSettings.whitelist });
                    await browser.runtime.sendMessage({ action: 'updateWhitelist', whitelist: currentSettings.whitelist });
                    updateUI();
                    showStatus('Domain removed from whitelist', 'success');
                });
                li.appendChild(removeBtn);
                elements.whitelistList.appendChild(li);
            });
        }

        console.log('Security Ops: UI updated successfully');
    } catch (error) {
        console.error('Security Ops: Failed to update UI:', error);
        showStatus('Failed to update UI: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    if (elements.statusMessage) {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message mt-4 status-${type}`;
        elements.statusMessage.style.display = 'block';
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 3000);
    }
}

console.log('Security Ops options script loaded');
