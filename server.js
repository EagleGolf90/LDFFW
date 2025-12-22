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
