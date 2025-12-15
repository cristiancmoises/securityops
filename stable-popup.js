const browser = this.browser || this.chrome || {};

let elements = {};
let currentStats = {
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
    proxySettings: {
        enabled: false,
        scheme: 'socks5',
        host: '127.0.0.1',
        port: 9050
    },
    settings: {
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
        redirectReddit: true,
        showIP: false // New setting for IP display
    },
    blockLogs: [],
    whitelist: [],
    userIP: null // Store user's IP address
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Security Ops popup initializing...');
    try {
        elements = {
            blockedCount: document.getElementById('blocked-count'),
            adsBlocked: document.getElementById('ads-blocked'),
            trackersBlocked: document.getElementById('trackers-blocked'),
            malwareBlocked: document.getElementById('malware-blocked'),
            gamblingBlocked: document.getElementById('gambling-blocked'),
            adultBlocked: document.getElementById('adult-blocked'),
            socialBlocked: document.getElementById('social-blocked'),
            scriptsBlocked: document.getElementById('scripts-blocked'),
            mediaBlocked: document.getElementById('media-blocked'),
            gigachadBlocked: document.getElementById('gigachad-blocked'),
            blockAdsToggle: document.getElementById('block-ads-toggle'),
            blockTrackersToggle: document.getElementById('block-trackers-toggle'),
            blockMalwareToggle: document.getElementById('block-malware-toggle'),
            blockGamblingToggle: document.getElementById('block-gambling-toggle'),
            blockAdultToggle: document.getElementById('block-adult-toggle'),
            blockSocialToggle: document.getElementById('block-social-toggle'),
            blockBadJSToggle: document.getElementById('block-bad-js-toggle'),
            blockMediaToggle: document.getElementById('block-media-toggle'),
            blockGigachadToggle: document.getElementById('block-gigachad-toggle'),
            stripTrackingParamsToggle: document.getElementById('strip-tracking-params-toggle'),
            enforceHttpsToggle: document.getElementById('enforce-https-toggle'),
            blackThemeToggle: document.getElementById('black-theme-toggle'),
            fontColorSelect: document.getElementById('font-color-select'),
            redirectGoogleToggle: document.getElementById('redirect-google-toggle'),
            redirectYouTubeToggle: document.getElementById('redirect-youtube-toggle'),
            redirectRedditToggle: document.getElementById('redirect-reddit-toggle'),
            torandoBtn: document.getElementById('torando-btn'),
            torandoStatus: document.getElementById('torando-status'),
            proxyToggle: document.getElementById('proxy-toggle'),
            proxyStatus: document.getElementById('proxy-status'),
            disconnectProxyBtn: document.getElementById('disconnect-proxy-btn'),
            clearStatsBtn: document.getElementById('clear-stats-btn'),
            updateFiltersBtn: document.getElementById('update-filters-btn'),
            openSettingsBtn: document.getElementById('open-settings-btn'),
            statusMessage: document.getElementById('status-message'),
            logTableBody: document.getElementById('log-table-body'),
            logEntries: document.getElementById('log-entries'),
            downloadLogsBtn: document.getElementById('download-logs-btn'),
            clearLogsBtn: document.getElementById('clear-logs-btn'),
            tabButtons: document.querySelectorAll('.tab-button'),
            tabContents: document.querySelectorAll('.tab-content'),
            whitelistInput: document.getElementById('whitelist-input'),
            addWhitelistBtn: document.getElementById('add-whitelist-btn'),
            whitelistList: document.getElementById('whitelist-list'),
            panicButton: document.getElementById('panic-button'),
            // IP Address elements
            ipSection: document.getElementById('ip-section'),
            userIPElement: document.getElementById('user-ip'),
            showIPBtn: document.getElementById('show-ip-btn'),
            toggleIPBtn: document.getElementById('toggle-ip-btn')
        };

        await loadStats();
        await loadUserIP();
        setupEventListeners();
        updateUI();
        updateLogDisplay();
        console.log('Security Ops popup initialized successfully');
    } catch (error) {
        console.error('Security Ops popup initialization failed:', error);
        showStatus('Failed to initialize popup: ' + error.message, 'error');
    }
});

async function loadUserIP(force = false) {
    try {
        console.log('Security Ops: Fetching IP address...');
        const response = await new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ action: 'getIP', force: force }, (response) => {
                if (browser.runtime.lastError) {
                    reject(new Error(browser.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        if (response.ip) {
            currentStats.userIP = response.ip;
            console.log('Security Ops: IP address fetched successfully');
        } else {
            currentStats.userIP = 'Unable to fetch';
        }
    } catch (error) {
        console.error('Security Ops: Failed to fetch IP address:', error);
        currentStats.userIP = 'Unable to fetch';
    }
}

async function loadStats() {
    try {
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
                ...currentStats,
                blockedRequestsCount: response.blockedRequestsCount || 0,
                blockingStats: { ...currentStats.blockingStats, ...response.blockingStats },
                proxySettings: { ...currentStats.proxySettings, ...response.proxySettings },
                settings: { ...currentStats.settings, ...response.settings },
                blockLogs: response.blockLogs || [],
                whitelist: response.whitelist || []
            };
            console.log('Security Ops: Stats loaded successfully');
        }
    } catch (error) {
        console.error('Security Ops: Failed to load stats:', error);
        showStatus('Failed to load statistics: ' + error.message, 'error');
    }
}

function setupEventListeners() {
    try {
        // Tab switching
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                elements.tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });

        // Toggle listeners
        const toggles = [
            'blockAds', 'blockTrackers', 'blockMalware', 'blockGambling',
            'blockAdult', 'blockSocial', 'blockBadJS', 'blockMedia', 'blockGigachad',
            'stripTrackingParams', 'enforceHttps', 'blackThemeEnabled',
            'redirectGoogle', 'redirectYouTube', 'redirectReddit'
        ];

        toggles.forEach(key => {
            const toggle = elements[key + 'Toggle'];
            if (toggle) {
                toggle.addEventListener('change', async () => {
                    currentStats.settings[key] = toggle.checked;
                    try {
                        const response = await new Promise((resolve, reject) => {
                            browser.runtime.sendMessage({
                                action: 'updateSettings',
                                settings: { [key]: toggle.checked }
                            }, (response) => {
                                if (browser.runtime.lastError) {
                                    reject(new Error(browser.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            });
                        });
                        if (response && response.success) {
                            showStatus('Settings updated', 'success');
                            console.log(`Security Ops: ${key} toggled to ${toggle.checked}`);
                        } else {
                            throw new Error(response?.message || 'Failed to update settings');
                        }
                    } catch (error) {
                        console.error(`Security Ops: Failed to toggle ${key}:`, error);
                        showStatus(`Failed to update: ${error.message}`, 'error');
                        toggle.checked = !toggle.checked;
                    }
                });
            }
        });

        // Font color select
        if (elements.fontColorSelect) {
            elements.fontColorSelect.addEventListener('change', async () => {
                currentStats.settings.fontColor = elements.fontColorSelect.value;
                try {
                    const response = await new Promise((resolve, reject) => {
                        browser.runtime.sendMessage({
                            action: 'updateSettings',
                            settings: { fontColor: currentStats.settings.fontColor }
                        }, (response) => {
                            if (browser.runtime.lastError) {
                                reject(new Error(browser.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    if (response && response.success) {
                        showStatus('Font color updated', 'success');
                        console.log('Security Ops: Font color updated to', currentStats.settings.fontColor);
                    } else {
                        throw new Error(response?.message || 'Failed to update font color');
                    }
                } catch (error) {
                    console.error('Security Ops: Failed to update font color:', error);
                    showStatus(`Failed to update: ${error.message}`, 'error');
                    elements.fontColorSelect.value = currentStats.settings.fontColor;
                }
            });
        }

        // Proxy toggle
        if (elements.proxyToggle) {
            elements.proxyToggle.addEventListener('change', async () => {
                try {
                    const response = await new Promise((resolve, reject) => {
                        browser.runtime.sendMessage({
                            action: 'toggleProxy',
                            enabled: elements.proxyToggle.checked
                        }, (response) => {
                            if (browser.runtime.lastError) {
                                reject(new Error(browser.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    if (response && response.success) {
                        currentStats.proxySettings.enabled = elements.proxyToggle.checked;
                        await loadUserIP(true); // Force refetch IP
                        updateUI();
                        showStatus('Proxy toggled', 'success');
                        console.log('Security Ops: Proxy toggled to', elements.proxyToggle.checked);
                    } else {
                        throw new Error(response?.message || 'Failed to toggle proxy');
                    }
                } catch (error) {
                    console.error('Security Ops: Proxy toggle error:', error);
                    showStatus('Proxy toggle failed: ' + error.message, 'error');
                    elements.proxyToggle.checked = !elements.proxyToggle.checked;
                }
            });
        }

        // TORANDO button
        if (elements.torandoBtn) {
            elements.torandoBtn.addEventListener('click', async () => {
                try {
                    console.log('Security Ops: Toggling TORANDO...');
                    showStatus('Connecting to TORANDO...', 'info');
                    const response = await new Promise((resolve, reject) => {
                        if (browser.runtime && browser.runtime.sendMessage) {
                            browser.runtime.sendMessage({ action: 'toggleTorando' }, (response) => {
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
                        currentStats.proxySettings.enabled = true;
                        await loadUserIP(true); // Force refetch IP
                        await loadStats();
                        updateUI();
                        showStatus('TORANDO connected!', 'success');
                        console.log('Security Ops: TORANDO toggled successfully');
                    } else {
                        throw new Error(response?.message || 'Failed to toggle TORANDO');
                    }
                } catch (error) {
                    console.error('Security Ops: TORANDO toggle error:', error);
                    showStatus('TORANDO toggle failed: ' + error.message, 'error');
                }
            });
        }

        // Disconnect proxy button
        if (elements.disconnectProxyBtn) {
            elements.disconnectProxyBtn.addEventListener('click', async () => {
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
                        currentStats.proxySettings.enabled = false;
                        await loadUserIP(true); // Force refetch IP
                        await loadStats();
                        updateUI();
                        showStatus('Proxy disconnected', 'success');
                        console.log('Security Ops: Proxy disconnected successfully');
                    } else {
                        throw new Error(response?.message || 'Failed to disconnect proxy');
                    }
                } catch (error) {
                    console.error('Security Ops: Disconnect proxy error:', error);
                    showStatus('Disconnect failed: ' + error.message, 'error');
                }
            });
        }

        // Clear stats button
        if (elements.clearStatsBtn) {
            elements.clearStatsBtn.addEventListener('click', async () => {
                try {
                    console.log('Security Ops: Clearing stats...');
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
                            ads: 0, trackers: 0, malware: 0, gambling: 0, adult: 0, social: 0, scripts: 0, media: 0, gigachad: 0
                        };
                        updateUI();
                        showStatus('Statistics cleared', 'success');
                        console.log('Security Ops: Stats cleared successfully');
                    } else {
                        throw new Error(response?.message || 'Failed to clear stats');
                    }
                } catch (error) {
                    console.error('Security Ops: Clear stats error:', error);
                    showStatus('Clear stats failed: ' + error.message, 'error');
                }
            });
        }

        // Update filters button
        if (elements.updateFiltersBtn) {
            elements.updateFiltersBtn.addEventListener('click', async () => {
                try {
                    console.log('Security Ops: Updating filters...');
                    showStatus('Updating filters...', 'info');
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
                        showStatus('Filters updated', 'success');
                        console.log('Security Ops: Filters updated successfully');
                    } else {
                        throw new Error(response?.message || 'Failed to update filters');
                    }
                } catch (error) {
                    console.error('Security Ops: Update filters error:', error);
                    showStatus('Update failed: ' + error.message, 'error');
                }
            });
        }

        // Open settings button
        if (elements.openSettingsBtn) {
            elements.openSettingsBtn.addEventListener('click', () => {
                browser.runtime.openOptionsPage();
                window.close();
            });
        }

        // Add to whitelist
        if (elements.addWhitelistBtn && elements.whitelistInput) {
            elements.addWhitelistBtn.addEventListener('click', async () => {
                const domain = elements.whitelistInput.value.trim();
                if (domain) {
                    currentStats.whitelist.push(domain);
                    try {
                        const response = await new Promise((resolve, reject) => {
                            browser.runtime.sendMessage({
                                action: 'updateWhitelist',
                                whitelist: currentStats.whitelist
                            }, (response) => {
                                if (browser.runtime.lastError) {
                                    reject(new Error(browser.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            });
                        });
                        if (response && response.success) {
                            elements.whitelistInput.value = '';
                            updateWhitelistDisplay();
                            showStatus('Domain added to whitelist', 'success');
                        } else {
                            throw new Error(response?.message || 'Failed to add to whitelist');
                        }
                    } catch (error) {
                        console.error('Security Ops: Whitelist add error:', error);
                        showStatus('Failed to add: ' + error.message, 'error');
                        currentStats.whitelist.pop();
                    }
                }
            });
        }

        // Download logs
        if (elements.downloadLogsBtn) {
            elements.downloadLogsBtn.addEventListener('click', () => {
                const logs = currentStats.blockLogs.map(log => 
                    `${new Date(log.timestamp).toISOString()} - ${log.reason}: ${log.url}`
                ).join('\n');
                const blob = new Blob([logs], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'security_ops_logs.txt';
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Clear logs
        if (elements.clearLogsBtn) {
            elements.clearLogsBtn.addEventListener('click', async () => {
                try {
                    const response = await new Promise((resolve, reject) => {
                        browser.runtime.sendMessage({ action: 'clearLogs' }, (response) => {
                            if (browser.runtime.lastError) {
                                reject(new Error(browser.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    if (response.success) {
                        currentStats.blockLogs = [];
                        updateLogDisplay();
                        showStatus('Logs cleared', 'success');
                    }
                } catch (error) {
                    console.error('Security Ops: Clear logs error:', error);
                    showStatus('Failed to clear logs', 'error');
                }
            });
        }

        // Panic button
        if (elements.panicButton) {
            elements.panicButton.addEventListener('click', triggerPanicMode);
        }

        // Show IP button
        if (elements.showIPBtn) {
            elements.showIPBtn.addEventListener('click', async () => {
                currentStats.settings.showIP = true;
                await loadUserIP(true);
                elements.ipSection.style.display = 'block';
                elements.showIPBtn.style.display = 'none';
                updateIPDisplay();
            });
        }

        // Toggle IP visibility
        if (elements.toggleIPBtn) {
            elements.toggleIPBtn.addEventListener('click', () => {
                currentStats.settings.showIP = false;
                elements.ipSection.style.display = 'none';
                elements.showIPBtn.style.display = 'inline-block';
            });
        }

        // Keyboard shortcut for panic
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
                triggerPanicMode();
            }
        });

        console.log('Security Ops: Event listeners setup successfully');
    } catch (error) {
        console.error('Security Ops: Failed to setup event listeners:', error);
        showStatus('Failed to setup listeners: ' + error.message, 'error');
    }
}

function updateIPDisplay() {
    if (elements.userIPElement) {
        elements.userIPElement.textContent = currentStats.userIP || 'Loading...';
    }
}

async function triggerPanicMode() {
    try {
        console.log('Security Ops: Triggering panic mode...');
        showStatus('Activating panic mode...', 'info');
        const response = await new Promise((resolve, reject) => {
            if (browser.runtime && browser.runtime.sendMessage) {
                browser.runtime.sendMessage({ action: 'panic' }, (response) => {
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
            showStatus('Panic mode activated!', 'success');
            console.log('Security Ops: Panic mode activated successfully');
            window.close();
        } else {
            throw new Error(response?.message || 'Failed to activate panic mode');
        }
    } catch (error) {
        console.error('Security Ops: Panic mode error:', error);
        showStatus('Panic mode failed: ' + error.message, 'error');
    }
}

function updateUI() {
    try {
        // Update statistics
        if (elements.blockedCount) {
            elements.blockedCount.textContent = currentStats.blockedRequestsCount || 0;
        }
        
        Object.keys(currentStats.blockingStats || {}).forEach(key => {
            const element = elements[key + 'Blocked'];
            if (element) {
                element.textContent = currentStats.blockingStats[key] || 0;
            }
        });

        // Update settings toggles
        Object.keys(currentStats.settings || {}).forEach(key => {
            const toggle = elements[key + 'Toggle'];
            if (toggle && typeof currentStats.settings[key] === 'boolean') {
                toggle.checked = currentStats.settings[key];
            }
        });

        // Update font color select
        if (elements.fontColorSelect && currentStats.settings.fontColor) {
            elements.fontColorSelect.value = currentStats.settings.fontColor;
        }

        // Update proxy status
        if (elements.proxyStatus) {
            elements.proxyStatus.textContent = currentStats.proxySettings?.enabled ? 'Connected' : 'Disconnected';
            elements.proxyStatus.className = currentStats.proxySettings?.enabled ? 'status-success' : 'status-error';
        }

        if (elements.proxyToggle) {
            elements.proxyToggle.checked = currentStats.proxySettings?.enabled || false;
        }

        if (elements.disconnectProxyBtn) {
            elements.disconnectProxyBtn.style.display = currentStats.proxySettings?.enabled ? 'block' : 'none';
        }

        // Update TORANDO status
        if (elements.torandoStatus) {
            elements.torandoStatus.textContent = currentStats.proxySettings?.enabled ? 'Status: ACTIVE' : 'Status: INACTIVE';
            elements.torandoStatus.className = currentStats.proxySettings?.enabled ? 'status-success' : 'status-error';
        }

        // Update whitelist
        updateWhitelistDisplay();

        // Update IP display
        updateIPDisplay();
        if (currentStats.settings.showIP) {
            elements.ipSection.style.display = 'block';
            elements.showIPBtn.style.display = 'none';
        } else {
            elements.ipSection.style.display = 'none';
            elements.showIPBtn.style.display = 'inline-block';
        }

        console.log('Security Ops: UI updated successfully');
    } catch (error) {
        console.error('Security Ops: Failed to update UI:', error);
    }
}

function updateWhitelistDisplay() {
    if (elements.whitelistList) {
        elements.whitelistList.innerHTML = '';
        (currentStats.whitelist || []).forEach(domain => {
            const li = document.createElement('li');
            li.textContent = domain;
            li.style.cursor = 'pointer';
            li.title = 'Click to remove';
            li.addEventListener('click', async () => {
                currentStats.whitelist = currentStats.whitelist.filter(d => d !== domain);
                await browser.storage.sync.set({ whitelist: currentStats.whitelist });
                await browser.runtime.sendMessage({ action: 'updateWhitelist', whitelist: currentStats.whitelist });
                updateWhitelistDisplay();
                showStatus('Domain removed from whitelist', 'success');
            });
            elements.whitelistList.appendChild(li);
        });
    }
}

function updateLogDisplay() {
    // Support both old table format and new improved format
    if (elements.logEntries) {
        // New improved format
        elements.logEntries.innerHTML = '';
        (currentStats.blockLogs || []).slice(-50).reverse().forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const timeElement = document.createElement('div');
            timeElement.className = 'log-entry-item log-time';
            timeElement.textContent = new Date(log.timestamp).toLocaleTimeString();
            
            const urlElement = document.createElement('div');
            urlElement.className = 'log-entry-item log-url';
            urlElement.textContent = log.url;
            urlElement.title = log.url;
            
            const reasonElement = document.createElement('div');
            reasonElement.className = 'log-entry-item log-reason';
            reasonElement.textContent = log.reason;
            
            logEntry.appendChild(timeElement);
            logEntry.appendChild(urlElement);
            logEntry.appendChild(reasonElement);
            
            elements.logEntries.appendChild(logEntry);
        });
    } else if (elements.logTableBody) {
        // Legacy table format
        elements.logTableBody.innerHTML = '';
        (currentStats.blockLogs || []).slice(-50).reverse().forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                <td title="${log.url}">${log.url}</td>
                <td>${log.reason}</td>
            `;
            elements.logTableBody.appendChild(row);
        });
    }
}

function showStatus(message, type = 'info') {
    if (elements.statusMessage) {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message status-${type}`;
        elements.statusMessage.style.display = 'block';
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 3000);
    }
    console.log(`Security Ops Status [${type}]: ${message}`);
}
