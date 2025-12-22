# Backend Server Setup Guide

## Overview
The LDFFW Points System now includes a Node.js/Express backend server that automatically persists all CRUD operations to the `data/points.json` file. When you make changes through the HTML pages (Add, Edit, Delete rules), the backend server saves these changes directly to the JSON file.

## Prerequisites
- **Node.js** (v14 or higher) installed on your system
- npm (comes with Node.js)

## Installation

### 1. Install Dependencies
Navigate to the project root directory and run:
```bash
npm install
```

This will install:
- `express` - Web framework for handling API requests
- `cors` - Enables cross-origin requests from the HTML pages
- `body-parser` - Parses JSON request bodies

### 2. Start the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see output like:
```
╔════════════════════════════════════════════════════════════╗
║     LDFFW Points System Backend Server                      ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:3000
║  Points Data File: d:\Projects\LDFFW\data\points.json
║                                                            ║
║  API Endpoints:                                            ║
║    GET  /api/points                                        ║
║    GET  /api/points/:position                             ║
║    POST /api/save-points                                  ║
║    POST /api/save-points/:position                        ║
║    DELETE /api/points/:position/:id                       ║
║    GET  /api/health                                        ║
║                                                            ║
║  Static files served from: d:\Projects\LDFFW
╚════════════════════════════════════════════════════════════╝
```

## Opening the Application

### With Server Running (Recommended)
1. Start the backend server: `npm start`
2. Open your browser and navigate to: `http://localhost:3000`
3. Click on the position links (Quarterbacks, Running Backs, etc.)
4. All CRUD operations will automatically sync to `points.json`

### Without Server (Local Testing)
- You can still open HTML files directly with a file:// URL
- Changes will be saved to localStorage only
- **Note:** To persist changes to points.json, the server must be running

## How It Works

### CRUD Operations Flow

1. **User Action** → HTML Form (Add/Edit/Delete)
   ↓
2. **JavaScript Handler** → Updates localStorage
   ↓
3. **Storage Manager** → Calls `saveToJSON()`
   ↓
4. **API Request** → POST to backend server
   ↓
5. **Backend Processing** → Writes to `data/points.json`
   ↓
6. **Confirmation** → Console log confirms save

### Example: Adding a New Rule

```javascript
// User clicks "Add Rule"
handleAddRule() {
    // 1. Create rule object
    const rule = {
        id: Date.now().toString(),
        description: "New rule",
        points: 5,
        type: "normal",
        createdAt: new Date().toISOString()
    }
    
    // 2. Save to localStorage
    storage.addRule(description, points, type);
    
    // 3. Async call to backend API
    // POST /api/save-points/quarterbacks
    // { rules: [...all rules...] }
    
    // 4. Backend writes updated array to points.json
    // 5. Console shows: "✓ Successfully saved quarterbacks to points.json"
}
```

## API Endpoints

### GET `/api/points`
Retrieves all position data from points.json

**Response:**
```json
{
    "success": true,
    "data": {
        "quarterbacks": [...],
        "runningBacks": [...],
        "kickers": [...],
        "defense": [...]
    }
}
```

### GET `/api/points/:position`
Retrieves rules for a specific position

**Parameters:**
- `position` - one of: quarterbacks, runningBacks, kickers, defense

**Response:**
```json
{
    "success": true,
    "data": [
        {"id": "1", "description": "...", "points": 1, "type": "normal", ...}
    ]
}
```

### POST `/api/save-points/:position`
Saves all rules for a position to points.json

**Parameters:**
- `position` - one of: quarterbacks, runningBacks, kickers, defense

**Request Body:**
```json
{
    "rules": [
        {"id": "1", "description": "...", "points": 1, "type": "normal", ...}
    ]
}
```

**Response:**
```json
{
    "success": true,
    "message": "quarterbacks rules saved successfully",
    "data": [...]
}
```

### POST `/api/save-points`
Saves the entire points data structure

**Request Body:**
```json
{
    "quarterbacks": [...],
    "runningBacks": [...],
    "kickers": [...],
    "defense": [...]
}
```

### DELETE `/api/points/:position/:id`
Deletes a specific rule

**Parameters:**
- `position` - one of: quarterbacks, runningBacks, kickers, defense
- `id` - Rule ID to delete

**Response:**
```json
{
    "success": true,
    "message": "Rule deleted successfully"
}
```

### GET `/api/health`
Health check endpoint

**Response:**
```json
{
    "status": "OK",
    "message": "LDFFW Points System Server is running"
}
```

## Troubleshooting

### Server Won't Start
**Error:** `Cannot find module 'express'`

**Solution:** Run `npm install` first

### CORS Errors in Browser Console
**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Causes:**
- Backend server is not running
- Accessing from `file://` protocol instead of `http://localhost:3000`

**Solution:** Start the server with `npm start` and access via `http://localhost:3000`

### Changes Not Persisting to points.json
**Problem:** localStorage updates but points.json doesn't change

**Check:**
1. Is the backend server running? (Check terminal for "Server running at...")
2. Browser console should show: "✓ Successfully saved [position] to points.json"
3. If error shown, backend may have crashed

**Solution:** Restart the server with `npm start`

### Port 3000 Already in Use
**Error:** `listen EADDRINUSE: address already in use :::3000`

**Solution:** 
- Kill the existing process using port 3000, or
- Set a different port: `PORT=3001 npm start`

## File Structure

```
LDFFW/
├── package.json              ← Dependencies configuration
├── server.js                 ← Backend server code
├── data/
│   └── points.json          ← Persistent data storage
├── js/
│   ├── storage.js           ← Updated to use API
│   ├── pointsLoader.js      ← Data loading utility
│   ├── quarterbacks.js      ← CRUD handlers
│   ├── running-backs.js
│   ├── kickers.js
│   ├── defense.js
│   └── index.js
├── html pages               ← CRUD interfaces
└── css/                     ← Styling
```

## Development Notes

### Auto-Sync Behavior
When the backend server is running, all CRUD operations automatically sync to points.json:
- ✓ Create → New rule added to JSON
- ✓ Read → Data loaded from JSON on page refresh
- ✓ Update → Modified rules saved to JSON
- ✓ Delete → Removed rules deleted from JSON

### Fallback Mode
If the backend server is not running:
- Changes still work in localStorage
- Warning logged to console: "Backend server may not be running"
- No automatic sync to JSON file
- Changes lost on page reload

### Data Validation
The server validates data before saving:
- Checks that all required positions exist
- Validates array structure for rules
- Returns detailed error messages if validation fails

## Next Steps

1. **Start the server:** `npm start`
2. **Open in browser:** `http://localhost:3000`
3. **Test CRUD operations:** Add/Edit/Delete rules on any position page
4. **Verify persistence:** Check `data/points.json` - should see your changes
5. **Check logs:** Terminal shows confirmation: "✓ Successfully saved [position] to points.json"

## Support

For issues or questions, check the console (F12 → Console tab) for detailed error messages. The backend server logs all operations to help debug issues.
