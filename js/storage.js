// Storage Manager for CRUD Operations
// Manages both localStorage and JSON file (data/points.json) for all positions

class StorageManager {
    constructor(positionKey, jsonKey) {
        this.positionKey = positionKey;
        this.jsonKey = jsonKey; // Key used in points.json (e.g., 'quarterbacks', 'runningBacks')
        this.jsonPath = '../data/points.json';
        this.initializeStorage();
    }

    // Initialize storage with default rules if not exists
    async initializeStorage() {
        if (!localStorage.getItem(this.positionKey)) {
            try {
                // Try to load from JSON file
                const rules = await this.loadFromJSON();
                if (rules && rules.length > 0) {
                    localStorage.setItem(this.positionKey, JSON.stringify(rules));
                } else {
                    // Fallback to default rules
                    const defaultRules = this.getDefaultRules();
                    localStorage.setItem(this.positionKey, JSON.stringify(defaultRules));
                }
            } catch (error) {
                console.log('Could not load from JSON, using defaults:', error);
                const defaultRules = this.getDefaultRules();
                localStorage.setItem(this.positionKey, JSON.stringify(defaultRules));
            }
        }
    }

    // Load rules from JSON file
    async loadFromJSON() {
        try {
            const response = await fetch(this.jsonPath, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch JSON');
            const data = await response.json();
            console.log(`Successfully loaded ${this.jsonKey} from JSON:`, data[this.jsonKey]);
            return data[this.jsonKey] || [];
        } catch (error) {
            console.error('Error loading from JSON:', error);
            console.warn(`Falling back to default rules for ${this.jsonKey}`);
            return [];
        }
    }

    // Static method to load any position data from JSON
    static async loadPositionFromJSON(jsonKey) {
        try {
            const response = await fetch('../data/points.json', {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch JSON');
            const data = await response.json();
            console.log(`Successfully loaded ${jsonKey} from JSON`);
            return data[jsonKey] || [];
        } catch (error) {
            console.error(`Error loading ${jsonKey} from JSON:`, error);
            return [];
        }
    }

    // Static method to load entire points data
    static async loadAllPointsData() {
        try {
            const response = await fetch('../data/points.json', {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch JSON');
            const data = await response.json();
            console.log('Successfully loaded all points data from JSON');
            return data;
        } catch (error) {
            console.error('Error loading all points data from JSON:', error);
            return {};
        }
    }

    // Save rules to JSON file via backend API
    async saveToJSON(rules) {
        try {
            // Send update to backend API endpoint
            const response = await fetch('http://localhost:3000/api/save-points/' + this.jsonKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: rules })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✓ Successfully saved ${this.jsonKey} to points.json:`, result);
            return result.success;
        } catch (error) {
            console.error(`Error saving ${this.jsonKey} to JSON:`, error);
            console.warn(`Changes saved to localStorage only. Backend server may not be running.`);
            // Return true anyway so UI continues to work with localStorage fallback
            return true;
        }
    }

    // Get all rules for a position
    getRules() {
        const data = localStorage.getItem(this.positionKey);
        return data ? JSON.parse(data) : [];
    }

    // Add a new rule
    addRule(description, points, type) {
        const rules = this.getRules();
        const newRule = {
            id: Date.now().toString(),
            description: description,
            points: parseFloat(points),
            type: type,
            createdAt: new Date().toISOString()
        };
        rules.push(newRule);
        localStorage.setItem(this.positionKey, JSON.stringify(rules));
        this.saveToJSON(rules); // Async save to JSON
        return newRule;
    }

    // Update an existing rule
    updateRule(id, description, points, type) {
        const rules = this.getRules();
        const rule = rules.find(r => r.id === id);
        if (rule) {
            rule.description = description;
            rule.points = parseFloat(points);
            rule.type = type;
            rule.updatedAt = new Date().toISOString();
            localStorage.setItem(this.positionKey, JSON.stringify(rules));
            this.saveToJSON(rules); // Async save to JSON
            return rule;
        }
        return null;
    }

    // Delete a rule
    deleteRule(id) {
        let rules = this.getRules();
        rules = rules.filter(r => r.id !== id);
        localStorage.setItem(this.positionKey, JSON.stringify(rules));
        this.saveToJSON(rules); // Async save to JSON
    }

    // Get a single rule by ID
    getRule(id) {
        const rules = this.getRules();
        return rules.find(r => r.id === id);
    }

    // Get default rules for each position
    getDefaultRules() {
        // This will be overridden by position-specific files
        return [];
    }
}

// Position-specific storage managers
class QuarterbacksStorage extends StorageManager {
    constructor() {
        super('quarterbacks_rules', 'quarterbacks');
    }
    
    getDefaultRules() {
        return [
            { id: '1', description: 'Every 20 yards passing', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '2', description: 'Each completion', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '3', description: 'Every rushing & reception attempt', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '4', description: 'Every 10 yards rushing & reception', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '5', description: 'Per TD (Pass, Rush & Reception)', points: 6, type: 'normal', createdAt: new Date().toISOString() },
            { id: '6', description: 'Bonus points per 10 yards to TD (Pass, Rush & Rec)', points: 2, type: 'bonus', createdAt: new Date().toISOString() },
            { id: '7', description: 'Intercept/Fumble', points: -2, type: 'negative', createdAt: new Date().toISOString() }
        ];
    }
}

class RunningBacksStorage extends StorageManager {
    constructor() {
        super('running_backs_rules', 'runningBacks');
    }
    
    getDefaultRules() {
        return [
            { id: '1', description: 'Per carry', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '2', description: 'Every 10 yards rushing', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '3', description: 'Per catch', points: 2, type: 'normal', createdAt: new Date().toISOString() },
            { id: '4', description: 'Every 20 yards reception', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '5', description: 'Touchdown', points: 6, type: 'normal', createdAt: new Date().toISOString() },
            { id: '6', description: 'Bonus points per 10 yards to TD', points: 2, type: 'bonus', createdAt: new Date().toISOString() },
            { id: '7', description: 'Every 20 yards passing', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '8', description: 'Each completion', points: 1, type: 'normal', createdAt: new Date().toISOString() }
        ];
    }
}

class KickersStorage extends StorageManager {
    constructor() {
        super('kickers_rules', 'kickers');
    }
    
    getDefaultRules() {
        return [
            { id: '1', description: 'Per extra point', points: 1, type: 'normal', createdAt: new Date().toISOString() },
            { id: '2', description: 'XP Kick missed', points: -1, type: 'negative', createdAt: new Date().toISOString() },
            { id: '3', description: 'Field Goal', points: 3, type: 'normal', createdAt: new Date().toISOString() },
            { id: '4', description: 'Failed Field Goal', points: -3, type: 'negative', createdAt: new Date().toISOString() },
            { id: '5', description: 'TD (Pass, Rush or Catch)', points: 6, type: 'normal', createdAt: new Date().toISOString() },
            { id: '6', description: 'Bonus per 10 yards to TD', points: 2, type: 'bonus', createdAt: new Date().toISOString() }
        ];
    }
}

class DefenseStorage extends StorageManager {
    constructor() {
        super('defense_rules', 'defense');
    }
    
    getDefaultRules() {
        return [
            { id: '1', description: 'Defense TD & Special Teams TD', points: 6, type: 'normal', createdAt: new Date().toISOString() },
            { id: '2', description: 'Bonus per 10 yards to TD', points: 2, type: 'bonus', createdAt: new Date().toISOString() },
            { id: '3', description: 'Per intercept/sack/fumble recovery', points: 6, type: 'normal', createdAt: new Date().toISOString() },
            { id: '4', description: 'Safety', points: 8, type: 'normal', createdAt: new Date().toISOString() },
            { id: '5', description: 'Block FG/Missed FG', points: 6, type: 'normal', createdAt: new Date().toISOString() }
        ];
    }
}
