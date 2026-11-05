// LDFFW Access Control
// Reads the config "table" (data/config.json) to determine who the commissioner is.
// Position pages are editable only by a commissioner; everyone else gets read-only.
// Loaded as a plain <script> (global, no modules) like the rest of the site.

const AccessControl = {
    USER_KEY: 'ldffw_user',
    config: null,

    /**
     * Load the access config. Try the backend endpoint first,
     * then fall back to the static file (works on GitHub Pages).
     */
    async loadConfig() {
        try {
            const response = await fetch('api/config');
            if (response.ok) {
                const result = await response.json();
                if (result && result.success && result.data) {
                    return result.data;
                }
            }
        } catch (error) {
            // Server not running — fall through to the static file
        }

        try {
            const response = await fetch('data/config.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Could not load data/config.json:', error);
        }

        return null;
    },

    /**
     * Get the current user id (remembered in localStorage).
     * Prompts once if unknown; cancelling leaves the user as a guest.
     */
    getUser() {
        let user = localStorage.getItem(this.USER_KEY);
        if (!user) {
            try {
                user = (prompt('Enter your name (user id):') || '').trim();
            } catch (error) {
                user = ''; // prompt() unavailable — treat as guest (read-only)
            }
            if (user) {
                localStorage.setItem(this.USER_KEY, user);
            }
        }
        return user || '';
    },

    /**
     * Forget the remembered user and re-prompt
     */
    switchUser() {
        localStorage.removeItem(this.USER_KEY);
        location.reload();
    },

    /**
     * Check a user id against the commissioners in the config table
     * (case-insensitive, trimmed)
     */
    isCommissioner(user, config) {
        if (!user || !config || !Array.isArray(config.commissioners)) {
            return false;
        }
        const normalized = user.trim().toLowerCase();
        return config.commissioners.some(
            c => typeof c === 'string' && c.trim().toLowerCase() === normalized
        );
    },

    /**
     * Apply access control to the page:
     * non-commissioners get body.read-only (CSS hides add form + edit/delete)
     */
    async init() {
        this.config = await this.loadConfig();
        const user = this.getUser();
        const commissioner = this.isCommissioner(user, this.config);

        if (!commissioner) {
            document.body.classList.add('read-only');
        }

        this.renderBanner(user, commissioner);
        return commissioner;
    },

    /**
     * Show who is viewing the page and whether they can edit
     */
    renderBanner(user, commissioner) {
        const banner = document.createElement('div');
        banner.className = 'access-banner ' + (commissioner ? 'access-commissioner' : 'access-readonly');

        const name = user ? this.escapeHtml(user) : 'guest';
        banner.innerHTML = commissioner
            ? `&#128273; Commissioner mode &mdash; <strong>${name}</strong> can enter points.`
            : `&#128065; Viewing as <strong>${name}</strong> &mdash; read-only. Only the commissioner can enter points.`;

        const switchBtn = document.createElement('button');
        switchBtn.type = 'button';
        switchBtn.className = 'access-switch';
        switchBtn.textContent = 'Switch user';
        switchBtn.addEventListener('click', () => this.switchUser());
        banner.appendChild(switchBtn);

        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(banner, content.firstChild);
        } else {
            document.body.insertBefore(banner, document.body.firstChild);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AccessControl.init();
});
