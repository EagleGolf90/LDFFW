// Points Loader Utility
// Provides easy access to read and display points.json across the entire application

class PointsLoader {
    static jsonPath = '../data/points.json';

    /**
     * Load a specific position's data from points.json
     * @param {string} position - Position key (e.g., 'quarterbacks', 'runningBacks', 'kickers', 'defense')
     * @returns {Promise<Array>} Array of rules for that position
     */
    static async loadPosition(position) {
        try {
            const data = await this.loadAllPoints();
            const result = data[position] || [];
            console.log(`Loaded ${position}:`, result);
            return result;
        } catch (error) {
            console.error(`Error loading position ${position}:`, error);
            return [];
        }
    }

    /**
     * Load all points data from JSON
     * @returns {Promise<Object>} Complete points.json data object
     */
    static async loadAllPoints() {
        try {
            const response = await fetch(this.jsonPath, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Successfully loaded all points data');
            return data;
        } catch (error) {
            console.error('Error loading points.json:', error);
            return {};
        }
    }

    /**
     * Display rules in a formatted HTML list
     * @param {Array} rules - Array of rule objects
     * @param {string} elementId - ID of the element to populate
     * @param {Object} options - Display options (e.g., { showType: true, showDate: true })
     */
    static displayRules(rules, elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID '${elementId}' not found`);
            return;
        }

        const showType = options.showType !== false;
        const showDate = options.showDate !== false;
        const compact = options.compact || false;

        if (!rules || rules.length === 0) {
            element.innerHTML = '<p class="no-data">No rules available</p>';
            return;
        }

        const html = rules.map(rule => {
            if (compact) {
                return `<div class="rule-item-compact">
                    <span class="rule-description">${this.escapeHtml(rule.description)}</span>
                    <span class="rule-points ${rule.type}">${rule.points > 0 ? '+' : ''}${rule.points}</span>
                </div>`;
            } else {
                return `<div class="rule-item">
                    <div class="rule-description">${this.escapeHtml(rule.description)}</div>
                    <div class="rule-metadata">
                        <span class="rule-points ${rule.type}">${rule.points > 0 ? '+' : ''}${rule.points} pts</span>
                        ${showType ? `<span class="rule-type">Type: ${rule.type}</span>` : ''}
                        ${showDate ? `<span class="rule-date">Added: ${new Date(rule.createdAt).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>`;
            }
        }).join('');

        element.innerHTML = html;
    }

    /**
     * Calculate total points from a set of rules
     * @param {Array} rules - Array of rule objects
     * @returns {number} Total points
     */
    static calculateTotalPoints(rules) {
        return rules.reduce((total, rule) => total + rule.points, 0);
    }

    /**
     * Filter rules by type
     * @param {Array} rules - Array of rule objects
     * @param {string} type - Type to filter by ('normal', 'bonus', 'negative')
     * @returns {Array} Filtered rules
     */
    static filterByType(rules, type) {
        return rules.filter(rule => rule.type === type);
    }

    /**
     * Get summary statistics for rules
     * @param {Array} rules - Array of rule objects
     * @returns {Object} Statistics object
     */
    static getStatistics(rules) {
        if (!rules || rules.length === 0) {
            return { total: 0, count: 0, normal: 0, bonus: 0, negative: 0 };
        }

        return {
            total: this.calculateTotalPoints(rules),
            count: rules.length,
            normal: this.filterByType(rules, 'normal').length,
            bonus: this.filterByType(rules, 'bonus').length,
            negative: this.filterByType(rules, 'negative').length
        };
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format rule for display
     * @param {Object} rule - Rule object
     * @returns {string} Formatted rule string
     */
    static formatRule(rule) {
        return `${rule.description} (+${rule.points} points)`;
    }
}

// Export for Node.js environments (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsLoader;
}
