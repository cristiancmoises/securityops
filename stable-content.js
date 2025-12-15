const browser = this.browser || this.chrome || {};

let observer = null;
let styleElement = null;

function applyDefaultDarkTheme() {
    if (styleElement) return;
    styleElement = document.createElement('style');
    styleElement.id = 'security-ops-dark-theme';
    const colorValue = '#90EE90'; // soft-green default
    document.documentElement.style.setProperty('--font-color', colorValue, 'important');
    styleElement.textContent = `
        :root, html, body {
            background-color: #000000 !important;
            color: var(--font-color) !important;
        }
        *:not(video, img, svg, canvas, button, a, input, textarea, select, .ytp-title-text, .ytp-chrome-bottom, .ytp-chrome-top, .thumbnail) {
            background-color: #000000 !important;
            color: var(--font-color) !important;
            border-color: #333333 !important;
            -webkit-text-fill-color: var(--font-color) !important;
        }
        video, img, svg, canvas {
            background-color: transparent !important;
        }
        input, textarea, select, button {
            background-color: #1a1a1a !important;
            border: 1px solid #333333 !important;
            color: var(--font-color) !important;
            -webkit-text-fill-color: var(--font-color) !important;
        }
        input:focus, textarea:focus, select:focus {
            background-color: #2a2a2a !important;
            border-color: var(--font-color) !important;
            outline-color: var(--font-color) !important;
        }
        a, a:visited, a:hover, a:active {
            color: var(--font-color) !important;
            -webkit-text-fill-color: var(--font-color) !important;
        }
        a:hover {
            color: #FFFFFF !important;
            text-decoration: underline !important;
        }
        .white, .bg-white, .background-white, [class*="white"], [class*="light"],
        [style*="background-color: white"], [style*="background-color: #fff"],
        [style*="background: white"], [style*="background: #fff"] {
            background-color: #000000 !important;
        }
        [style*="color: black"], [style*="color: #000"],
        [style*="color: rgb(0, 0, 0)"], [style*="color: rgba(0, 0, 0"],
        [style*="color: #333"], [style*="color: rgb(51, 51, 51)"] {
            color: var(--font-color) !important;
            -webkit-text-fill-color: var(--font-color) !important;
        }
    `;
    (document.head || document.documentElement).appendChild(styleElement);
}

async function applyDarkTheme(retryCount = 0, maxRetries = 3) {
    try {
        const storedSettings = await browser.storage.sync.get(['blackThemeEnabled', 'fontColor', 'blockMedia']);
        const settings = {
            blackThemeEnabled: storedSettings.blackThemeEnabled !== undefined ? storedSettings.blackThemeEnabled : true,
            fontColor: storedSettings.fontColor || 'soft-green',
            blockMedia: storedSettings.blockMedia || false
        };

        if (retryCount > 0 && !storedSettings.blackThemeEnabled && retryCount < maxRetries) {
            setTimeout(() => applyDarkTheme(retryCount + 1, maxRetries), 100);
            return;
        }

        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (!settings.blackThemeEnabled) {
            document.documentElement.style.removeProperty('--font-color');
            removeInlineStyles();
            document.querySelectorAll('*').forEach(element => {
                element.classList.remove('security-ops-block-media');
            });
            return;
        }

        styleElement = document.createElement('style');
        styleElement.id = 'security-ops-dark-theme';
        const fontColor = settings.fontColor || 'soft-green';
        const colorValue = 
            fontColor === 'soft-green' ? '#90EE90' :
            fontColor === 'soft-blue' ? '#87CEEB' :
            fontColor === 'soft-yellow' ? '#F0E68C' :
            fontColor === 'soft-purple' ? '#DDA0DD' :
            fontColor === 'soft-violet' ? '#EE82EE' : '#FFFFFF';
        
        document.documentElement.style.setProperty('--font-color', colorValue, 'important');
        styleElement.textContent = `
            :root, html, body {
                background-color: #000000 !important;
                color: var(--font-color) !important;
            }
            *:not(video, img, svg, canvas, button, a, input, textarea, select, .ytp-title-text, .ytp-chrome-bottom, .ytp-chrome-top, .thumbnail) {
                background-color: #000000 !important;
                color: var(--font-color) !important;
                border-color: #333333 !important;
                -webkit-text-fill-color: var(--font-color) !important;
            }
            video, img, svg, canvas {
                background-color: transparent !important;
            }
            input, textarea, select, button {
                background-color: #1a1a1a !important;
                border: 1px solid #333333 !important;
                color: var(--font-color) !important;
                -webkit-text-fill-color: var(--font-color) !important;
            }
            input:focus, textarea:focus, select:focus {
                background-color: #2a2a2a !important;
                border-color: var(--font-color) !important;
                outline-color: var(--font-color) !important;
            }
            a, a:visited, a:hover, a:active {
                color: var(--font-color) !important;
                -webkit-text-fill-color: var(--font-color) !important;
            }
            a:hover {
                color: #FFFFFF !important;
                text-decoration: underline !important;
            }
            .white, .bg-white, .background-white, [class*="white"], [class*="light"],
            [style*="background-color: white"], [style*="background-color: #fff"],
            [style*="background: white"], [style*="background: #fff"] {
                background-color: #000000 !important;
            }
            [style*="color: black"], [style*="color: #000"],
            [style*="color: rgb(0, 0, 0)"], [style*="color: rgba(0, 0, 0"],
            [style*="color: #333"], [style*="color: rgb(51, 51, 51)"] {
                color: var(--font-color) !important;
                -webkit-text-fill-color: var(--font-color) !important;
            }
            ${settings.blockMedia ? `
            .security-ops-block-media img,
            .security-ops-block-media picture,
            .security-ops-block-media video,
            .security-ops-block-media iframe,
            .security-ops-block-media canvas,
            .security-ops-block-media svg,
            .security-ops-block-media embed,
            .security-ops-block-media object {
                display: none !important;
            }
            ` : ''}
        `;
        (document.head || document.documentElement).appendChild(styleElement);

        const applyStylesToElements = () => {
            document.querySelectorAll('*:not(video, img, svg, canvas, button, a, input, textarea, select, .ytp-title-text, .ytp-chrome-bottom, .ytp-chrome-top, .thumbnail)').forEach(element => {
                element.style.setProperty('background-color', '#000000', 'important');
                element.style.setProperty('color', colorValue, 'important');
                element.style.setProperty('border-color', '#333333', 'important');
                element.style.setProperty('-webkit-text-fill-color', colorValue, 'important');
                if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element.tagName)) {
                    element.style.setProperty('background-color', '#1a1a1a', 'important');
                    element.style.setProperty('border-color', '#333333', 'important');
                    element.style.setProperty('color', colorValue, 'important');
                    element.style.setProperty('-webkit-text-fill-color', colorValue, 'important');
                }
                if (settings.blockMedia) {
                    element.classList.add('security-ops-block-media');
                } else {
                    element.classList.remove('security-ops-block-media');
                }
            });
            document.querySelectorAll('video, img, svg, canvas').forEach(element => {
                element.style.setProperty('background-color', 'transparent', 'important');
            });
        };

        applyStylesToElements();

        observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (!['VIDEO', 'IMG', 'SVG', 'CANVAS', 'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) && 
                            !node.classList.contains('ytp-title-text') && 
                            !node.classList.contains('ytp-chrome-bottom') && 
                            !node.classList.contains('ytp-chrome-top') && 
                            !node.classList.contains('thumbnail')) {
                            node.style.setProperty('background-color', '#000000', 'important');
                            node.style.setProperty('color', colorValue, 'important');
                            node.style.setProperty('border-color', '#333333', 'important');
                            node.style.setProperty('-webkit-text-fill-color', colorValue, 'important');
                            if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(node.tagName)) {
                                node.style.setProperty('background-color', '#1a1a1a', 'important');
                                node.style.setProperty('border-color', '#333333', 'important');
                                node.style.setProperty('color', colorValue, 'important');
                                node.style.setProperty('-webkit-text-fill-color', colorValue, 'important');
                            }
                            if (settings.blockMedia) {
                                node.classList.add('security-ops-block-media');
                            } else {
                                node.classList.remove('security-ops-block-media');
                            }
                        } else {
                            node.style.setProperty('background-color', 'transparent', 'important');
                        }
                    }
                });
            });
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    } catch (error) {
        console.error('Security Ops: Failed to apply dark theme:', error);
        if (retryCount < maxRetries) {
            console.log(`Security Ops: Retrying theme application (${retryCount + 1}/${maxRetries})...`);
            setTimeout(() => applyDarkTheme(retryCount + 1, maxRetries), 100);
        }
    }
}

function removeInlineStyles() {
    document.querySelectorAll('*').forEach(element => {
        element.style.removeProperty('background-color');
        element.style.removeProperty('color');
        element.style.removeProperty('border-color');
        element.style.removeProperty('-webkit-text-fill-color');
        element.classList.remove('security-ops-block-media');
    });
}

applyDefaultDarkTheme();
applyDarkTheme();

document.addEventListener('DOMContentLoaded', () => {
    applyDarkTheme();
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateTheme') {
        applyDarkTheme();
    }
});

browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && (changes.blackThemeEnabled || changes.fontColor || changes.blockMedia)) {
        console.log('Security Ops: Theme or media settings changed, reapplying styles');
        applyDarkTheme();
    }
});

console.log('Security Ops content script v3.4.0 loaded');
