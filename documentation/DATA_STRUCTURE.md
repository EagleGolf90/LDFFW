# LDFFW Points System - Data Structure

## Overview

All points data is now centralized in a single JSON file (`data/points.json`) while maintaining localStorage for client-side caching and CRUD operations. This allows all HTML files to create, read, update, and delete scoring rules across all positions.

## File Structure

```
LDFFW/
├── data/
│   └── points.json          # Centralized points data
├── js/
│   ├── storage.js           # Storage manager with CRUD operations
│   ├── quarterbacks.js       # QB position-specific code
│   ├── running-backs.js      # RB/WR position-specific code
│   ├── kickers.js            # Kickers position-specific code
│   └── defense.js            # Defense/Special Teams position-specific code
├── css/
│   ├── styles.css
│   └── crud.css
├── quarterbacks.html
├── running-backs.html
├── kickers.html
├── defense.html
└── points-system.html
```

## Data Structure (points.json)

The `points.json` file contains all scoring rules organized by position:

```json
{
  "quarterbacks": [ ... ],
  "runningBacks": [ ... ],
  "kickers": [ ... ],
  "defense": [ ... ]
}
```

Each rule object has the following structure:

```json
{
  "id": "unique-identifier",
  "description": "Rule description",
  "points": 6,
  "type": "normal|bonus|negative",
  "createdAt": "ISO-8601-timestamp",
  "updatedAt": "ISO-8601-timestamp (optional)"
}
```

## How It Works

### Storage Managers

The system uses a class-based approach with inheritance:

1. **StorageManager** (Base Class)
   - Handles all CRUD operations
   - Manages localStorage for caching
   - Loads data from `data/points.json` on initialization
   - Can sync changes back to the JSON file (with backend support)

2. **Position-Specific Managers**
   - `QuarterbacksStorage` - Manages QB rules
   - `RunningBacksStorage` - Manages RB/WR rules
   - `KickersStorage` - Manages Kicker rules
   - `DefenseStorage` - Manages Defense rules

### Initialization

When a page loads:

1. The storage manager checks if localStorage has data for that position
2. If not found, it attempts to load from `data/points.json`
3. If JSON loading fails, it uses default rules
4. Data is cached in localStorage for offline access

### CRUD Operations

All operations are available through the storage object:

```javascript
// Create
const newRule = storage.addRule('My Rule', 5, 'normal');

// Read
const allRules = storage.getRules();
const singleRule = storage.getRule('rule-id');

// Update
storage.updateRule('rule-id', 'Updated Rule', 6, 'bonus');

// Delete
storage.deleteRule('rule-id');
```

## Using the Centralized Data

Each position-specific HTML file already has full CRUD functionality:

- **Add New Scoring Rule** - Form to create new rules
- **Current Scoring Rules** - Display and manage existing rules
- **Edit** - Inline editing of rules
- **Delete** - Remove rules with confirmation

## Backend Integration (Optional)

To enable persistent storage to the JSON file, you'll need a backend endpoint:

```javascript
// In StorageManager.saveToJSON() method:
const response = await fetch('/api/save-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [this.jsonKey]: rules })
});
```

### Required Endpoint

**POST /api/save-points**
- Accepts JSON with position data
- Updates the `data/points.json` file
- Returns success/error response

Example backend handler (Node.js/Express):

```javascript
app.post('/api/save-points', (req, res) => {
    const data = req.body;
    fs.writeFile('data/points.json', JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});
```

## Features

✅ **Centralized Data** - All points in one JSON file  
✅ **Position Organization** - Separate arrays for each position  
✅ **Client-Side Caching** - localStorage for offline functionality  
✅ **Full CRUD** - Create, Read, Update, Delete operations  
✅ **Data Persistence** - Changes saved to localStorage immediately  
✅ **Extensible** - Easy to add new positions or backend sync  

## Notes

- Changes are immediately saved to localStorage
- Without a backend endpoint, JSON file updates are logged but not persisted
- Each position maintains its own data array in the JSON file
- Rules include timestamps for created and updated actions
- Rule IDs are auto-generated using Date.now().toString()
