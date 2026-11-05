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

// Path to users_lineup.json (the users_lineup "table": array of rows)
const LINEUP_FILE = path.join(__dirname, 'data', 'users_lineup.json');

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
 * Read the users_lineup table (returns [] if the file is missing/corrupt)
 */
function readLineupTable() {
    try {
        const rows = JSON.parse(fs.readFileSync(LINEUP_FILE, 'utf8'));
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        return [];
    }
}

/**
 * Validate a single users_lineup row
 */
function isValidLineupRow(row) {
    return row && typeof row === 'object' &&
        ['user_id', 'week_id', 'player_id', 'first_name', 'last_name', 'position', 'nfl_team']
            .every(field => typeof row[field] === 'string' && row[field].trim() !== '');
}

/**
 * GET /api/lineup/:userId/:weekId
 * Load a user's saved lineup for a given week
 */
app.get('/api/lineup/:userId/:weekId', (req, res) => {
    try {
        const { userId, weekId } = req.params;
        const rows = readLineupTable().filter(
            row => row.user_id === userId && row.week_id === weekId
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error reading users_lineup.json:', error);
        res.status(500).json({ success: false, error: 'Failed to read lineup data' });
    }
});

/**
 * POST /api/lineup
 * Save a user's lineup for a week (replaces that user's rows for the week)
 * Expected body: { user_id, week_id, players: [{ player_id, first_name, last_name, position, nfl_team }, ...] }
 */
app.post('/api/lineup', (req, res) => {
    try {
        const { user_id, week_id, players } = req.body || {};

        if (typeof user_id !== 'string' || user_id.trim() === '' ||
            typeof week_id !== 'string' || week_id.trim() === '' ||
            !Array.isArray(players)) {
            return res.status(400).json({
                success: false,
                error: 'Expected body: { user_id, week_id, players: [...] }'
            });
        }

        const newRows = players.map(p => ({
            user_id: user_id.trim(),
            week_id: week_id.trim(),
            player_id: String(p.player_id || ''),
            first_name: String(p.first_name || ''),
            last_name: String(p.last_name || ''),
            position: String(p.position || ''),
            nfl_team: String(p.nfl_team || '')
        }));

        if (!newRows.every(isValidLineupRow)) {
            return res.status(400).json({
                success: false,
                error: 'Each player needs player_id, first_name, last_name, position and nfl_team'
            });
        }

        const otherRows = readLineupTable().filter(
            row => !(row.user_id === user_id.trim() && row.week_id === week_id.trim())
        );
        const table = otherRows.concat(newRows);

        fs.writeFileSync(LINEUP_FILE, JSON.stringify(table, null, 2), 'utf8');

        console.log(`✓ Saved lineup for user '${user_id}' week '${week_id}' (${newRows.length} players)`);

        res.json({
            success: true,
            message: 'Lineup saved successfully',
            data: newRows
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
        const table = readLineupTable();
        const remaining = table.filter(
            row => !(row.user_id === userId && row.week_id === weekId)
        );

        if (remaining.length === table.length) {
            return res.status(404).json({
                success: false,
                error: `No lineup found for user '${userId}' week '${weekId}'`
            });
        }

        fs.writeFileSync(LINEUP_FILE, JSON.stringify(remaining, null, 2), 'utf8');

        console.log(`✓ Deleted lineup for user '${userId}' week '${weekId}'`);

        res.json({ success: true, message: 'Lineup deleted successfully' });
    } catch (error) {
        console.error('Error deleting from users_lineup.json:', error);
        res.status(500).json({ success: false, error: 'Failed to delete lineup data' });
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
