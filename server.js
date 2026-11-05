// LDFFW Points System Backend Server
// Handles CRUD operations and persists data to points.json

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Static files
app.use(express.static(path.join(__dirname, '.')));

// Path to points.json
const POINTS_FILE = path.join(__dirname, 'data', 'points.json');

// Path to users_lineup.json (nested JSON keyed by user_id -> week_id -> slot)
const LINEUP_FILE = path.join(__dirname, 'data', 'users_lineup.json');

// The nine lineup slots every saved lineup must fill
const LINEUP_SLOTS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'K', 'DEF'];

// Path to config.json (the config "table": commissioner access control)
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

/**
 * Validate the points data structure
 */
function validatePointsData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const validKeys = ['quarterbacks', 'runningBacks', 'kickers', 'defense'];
    return Object.keys(data).every(key => validKeys.includes(key));
}

/**
 * GET /api/points
 * Load all points data from points.json
 */
app.get('/api/points', (req, res) => {
    try {
        const data = fs.readFileSync(POINTS_FILE, 'utf8');
        const pointsData = JSON.parse(data);
        res.json({
            success: true,
            data: pointsData
        });
    } catch (error) {
        console.error('Error reading points.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read points data'
        });
    }
});

/**
 * GET /api/points/:position
 * Load a specific position's data
 */
app.get('/api/points/:position', (req, res) => {
    try {
        const position = req.params.position;
        const data = fs.readFileSync(POINTS_FILE, 'utf8');
        const pointsData = JSON.parse(data);
        
        if (!pointsData[position]) {
            return res.status(404).json({
                success: false,
                error: `Position '${position}' not found`
            });
        }
        
        res.json({
            success: true,
            data: pointsData[position]
        });
    } catch (error) {
        console.error('Error reading points.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read points data'
        });
    }
});

/**
 * POST /api/save-points
 * Save/update the entire points data structure
 * Expected body: { quarterbacks: [...], runningBacks: [...], kickers: [...], defense: [...] }
 */
app.post('/api/save-points', (req, res) => {
    try {
        const pointsData = req.body;
        
        // Validate the data structure
        if (!validatePointsData(pointsData)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid points data structure'
            });
        }
        
        // Write to file with proper formatting
        fs.writeFileSync(POINTS_FILE, JSON.stringify(pointsData, null, 2), 'utf8');
        
        console.log(`✓ Successfully saved points data to ${POINTS_FILE}`);
        
        res.json({
            success: true,
            message: 'Points data saved successfully'
        });
    } catch (error) {
        console.error('Error saving points.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save points data'
        });
    }
});

/**
 * POST /api/save-points/:position
 * Save/update a specific position's rules
 * Expected body: { rules: [...] }
 */
app.post('/api/save-points/:position', (req, res) => {
    try {
        const position = req.params.position;
        const { rules } = req.body;
        
        if (!Array.isArray(rules)) {
            return res.status(400).json({
                success: false,
                error: 'Rules must be an array'
            });
        }
        
        // Read current data
        const data = fs.readFileSync(POINTS_FILE, 'utf8');
        const pointsData = JSON.parse(data);
        
        // Update the position data
        if (!pointsData[position]) {
            return res.status(404).json({
                success: false,
                error: `Position '${position}' not found`
            });
        }
        
        pointsData[position] = rules;
        
        // Write back to file
        fs.writeFileSync(POINTS_FILE, JSON.stringify(pointsData, null, 2), 'utf8');
        
        console.log(`✓ Successfully saved ${position} rules to ${POINTS_FILE}`);
        
        res.json({
            success: true,
            message: `${position} rules saved successfully`,
            data: rules
        });
    } catch (error) {
        console.error('Error saving points.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save points data'
        });
    }
});

/**
 * DELETE /api/points/:position/:id
 * Delete a specific rule
 */
app.delete('/api/points/:position/:id', (req, res) => {
    try {
        const { position, id } = req.params;
        
        // Read current data
        const data = fs.readFileSync(POINTS_FILE, 'utf8');
        const pointsData = JSON.parse(data);
        
        if (!pointsData[position]) {
            return res.status(404).json({
                success: false,
                error: `Position '${position}' not found`
            });
        }
        
        // Find and remove the rule
        const initialLength = pointsData[position].length;
        pointsData[position] = pointsData[position].filter(rule => rule.id !== id);
        
        if (pointsData[position].length === initialLength) {
            return res.status(404).json({
                success: false,
                error: `Rule with ID '${id}' not found`
            });
        }
        
        // Write back to file
        fs.writeFileSync(POINTS_FILE, JSON.stringify(pointsData, null, 2), 'utf8');
        
        console.log(`✓ Successfully deleted rule ${id} from ${position}`);
        
        res.json({
            success: true,
            message: 'Rule deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting from points.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete rule'
        });
    }
});

/**
 * Read the lineup data (returns {} if the file is missing/corrupt)
 * Shape: { [user_id]: { [week_id]: { QB: {...}, RB1: {...}, ... } } }
 */
function readLineupData() {
    try {
        const data = JSON.parse(fs.readFileSync(LINEUP_FILE, 'utf8'));
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (error) {
        return {};
    }
}

/**
 * Validate a single player entry in a lineup slot
 */
function isValidLineupPlayer(player) {
    return player && typeof player === 'object' &&
        ['player_id', 'first_name', 'last_name', 'position', 'nfl_team']
            .every(field => typeof player[field] === 'string' && player[field].trim() !== '');
}

/**
 * GET /api/lineup/:userId/:weekId
 * Load a user's saved lineup for a given week
 */
app.get('/api/lineup/:userId/:weekId', (req, res) => {
    try {
        const { userId, weekId } = req.params;
        const data = readLineupData();
        const lineup = (data[userId] && data[userId][weekId]) || null;
        res.json({ success: true, data: lineup });
    } catch (error) {
        console.error('Error reading users_lineup.json:', error);
        res.status(500).json({ success: false, error: 'Failed to read lineup data' });
    }
});

/**
 * POST /api/lineup
 * Save a user's lineup for a week (replaces that user/week's lineup)
 * Expected body: { user_id, week_id, lineup: { QB: { player_id, first_name, last_name, position, nfl_team }, RB1: {...}, ... } }
 */
app.post('/api/lineup', (req, res) => {
    try {
        const { user_id, week_id, lineup } = req.body || {};

        if (typeof user_id !== 'string' || user_id.trim() === '' ||
            typeof week_id !== 'string' || week_id.trim() === '' ||
            !lineup || typeof lineup !== 'object' || Array.isArray(lineup)) {
            return res.status(400).json({
                success: false,
                error: 'Expected body: { user_id, week_id, lineup: { QB: {...}, RB1: {...}, ... } }'
            });
        }

        const savedLineup = {};
        for (const slot of LINEUP_SLOTS) {
            const p = lineup[slot];
            if (!isValidLineupPlayer(p)) {
                return res.status(400).json({
                    success: false,
                    error: `Slot '${slot}' needs a player with player_id, first_name, last_name, position and nfl_team`
                });
            }
            savedLineup[slot] = {
                player_id: String(p.player_id),
                first_name: String(p.first_name),
                last_name: String(p.last_name),
                position: String(p.position),
                nfl_team: String(p.nfl_team)
            };
        }

        const data = readLineupData();
        const userKey = user_id.trim();
        const weekKey = week_id.trim();
        if (!data[userKey]) {
            data[userKey] = {};
        }
        data[userKey][weekKey] = savedLineup;

        fs.writeFileSync(LINEUP_FILE, JSON.stringify(data, null, 2), 'utf8');

        console.log(`✓ Saved lineup for user '${userKey}' week '${weekKey}' (${LINEUP_SLOTS.length} players)`);

        res.json({
            success: true,
            message: 'Lineup saved successfully',
            data: savedLineup
        });
    } catch (error) {
        console.error('Error saving users_lineup.json:', error);
        res.status(500).json({ success: false, error: 'Failed to save lineup data' });
    }
});

/**
 * DELETE /api/lineup/:userId/:weekId
 * Delete a user's lineup for a given week
 */
app.delete('/api/lineup/:userId/:weekId', (req, res) => {
    try {
        const { userId, weekId } = req.params;
        const data = readLineupData();

        if (!data[userId] || !data[userId][weekId]) {
            return res.status(404).json({
                success: false,
                error: `No lineup found for user '${userId}' week '${weekId}'`
            });
        }

        delete data[userId][weekId];
        if (Object.keys(data[userId]).length === 0) {
            delete data[userId];
        }

        fs.writeFileSync(LINEUP_FILE, JSON.stringify(data, null, 2), 'utf8');

        console.log(`✓ Deleted lineup for user '${userId}' week '${weekId}'`);

        res.json({ success: true, message: 'Lineup deleted successfully' });
    } catch (error) {
        console.error('Error deleting from users_lineup.json:', error);
        res.status(500).json({ success: false, error: 'Failed to delete lineup data' });
    }
});

/**
 * GET /api/config
 * Load the access config (who the commissioner is) from config.json
 */
app.get('/api/config', (req, res) => {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error reading config.json:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read config data'
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'LDFFW Points System Server is running' });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║     LDFFW Points System Backend Server                      ║`);
    console.log(`╠════════════════════════════════════════════════════════════╣`);
    console.log(`║  Server running at: http://localhost:${PORT}`);
    console.log(`║  Points Data File: ${POINTS_FILE}`);
    console.log(`║                                                            ║`);
    console.log(`║  API Endpoints:                                            ║`);
    console.log(`║    GET  /api/points                                        ║`);
    console.log(`║    GET  /api/points/:position                             ║`);
    console.log(`║    POST /api/save-points                                  ║`);
    console.log(`║    POST /api/save-points/:position                        ║`);
    console.log(`║    DELETE /api/points/:position/:id                       ║`);
    console.log(`║    GET  /api/lineup/:userId/:weekId                       ║`);
    console.log(`║    POST /api/lineup                                       ║`);
    console.log(`║    DELETE /api/lineup/:userId/:weekId                     ║`);
    console.log(`║    GET  /api/config                                        ║`);
    console.log(`║    GET  /api/health                                        ║`);
    console.log(`║                                                            ║`);
    console.log(`║  Static files served from: ${path.join(__dirname, '.')}`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n✓ Server shutdown gracefully');
    process.exit(0);
});
