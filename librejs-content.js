// Simplified LibreJS implementation to block nonfree JavaScript
    (function() {
        const browser = self.browser || self.chrome;

        // List of recognized free software licenses
        const freeLicenses = [
            'MIT License',
            'GNU General Public License',
            'GNU Lesser General Public License',
            'Apache License',
            'BSD License',
            'Mozilla Public License'
        ];

        // Check if script is free based on license comment
        function isFreeScript(scriptContent) {
            if (!scriptContent) return false;
            return freeLicenses.some(license => scriptContent.includes(license));
        }

        // Check if script is trivial (less than 100 characters)
        function isTrivialScript(scriptContent) {
            return scriptContent.length < 100;
        }

        // Block nonfree nontrivial scripts
        async function blockNonFreeScripts() {
            try {
                const { 'librejs.enabled': enabled } = await browser.storage.local.get('librejs.enabled');
                if (!enabled) return;

                const scripts = document.querySelectorAll('script');
                scripts.forEach(script => {
                    const src = script.src;
                    const inlineCode = script.textContent;

                    // Skip scripts with no content or external scripts (handled by webRequest if needed)
                    if (!inlineCode && !src) return;

                    // Check if script is free or trivial
                    if (!isFreeScript(inlineCode) && !isTrivialScript(inlineCode)) {
                        script.remove();
                        console.log('Security Ops: Blocked nonfree script');
                    }
                });
            } catch (error) {
                console.error('Security Ops: Failed to block nonfree scripts:', error);
            }
        }

        // Run on DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', blockNonFreeScripts);
        } else {
            blockNonFreeScripts();
        }

        // Listen for changes to librejs.enabled
        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes['librejs.enabled']) {
                blockNonFreeScripts();
            }
        });
    })();
