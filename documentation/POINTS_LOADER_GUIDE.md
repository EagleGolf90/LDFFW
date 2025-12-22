# Points Loader Guide

## Overview
The `PointsLoader` utility provides a centralized way for any file in the application to read and display data from `points.json`. All HTML files now have access to this functionality.

## Features

### 1. Load Position Data
Load scoring rules for a specific position:

```javascript
// Load quarterback rules
const qbRules = await PointsLoader.loadPosition('quarterbacks');

// Load running backs rules
const rbRules = await PointsLoader.loadPosition('runningBacks');

// Load kickers rules
const kickersRules = await PointsLoader.loadPosition('kickers');

// Load defense rules
const defenseRules = await PointsLoader.loadPosition('defense');
```

### 2. Load All Points Data
Load the entire points.json file:

```javascript
const allData = await PointsLoader.loadAllPoints();
// Returns: { quarterbacks: [...], runningBacks: [...], kickers: [...], defense: [...] }
```

### 3. Display Rules
Display rules in an HTML element:

```javascript
// Display rules in default format
PointsLoader.displayRules(rules, 'elementId');

// Display rules in compact format
PointsLoader.displayRules(rules, 'elementId', { 
    compact: true,
    showType: false,
    showDate: false
});
```

### 4. Calculate Total Points
Get the total points from a set of rules:

```javascript
const total = PointsLoader.calculateTotalPoints(rules);
// Returns: 20 (sum of all rule points)
```

### 5. Filter Rules by Type
Get only rules of a specific type:

```javascript
const normalRules = PointsLoader.filterByType(rules, 'normal');
const bonusRules = PointsLoader.filterByType(rules, 'bonus');
const negativeRules = PointsLoader.filterByType(rules, 'negative');
```

### 6. Get Statistics
Get statistical summary of rules:

```javascript
const stats = PointsLoader.getStatistics(rules);
// Returns: { total: 20, count: 7, normal: 4, bonus: 2, negative: 1 }
```

## Usage Examples

### Example 1: Display All Position Rules
```javascript
// In any HTML file with pointsLoader.js loaded

async function displayAllRules() {
    const allData = await PointsLoader.loadAllPoints();
    
    // Display quarterbacks
    if (allData.quarterbacks) {
        PointsLoader.displayRules(allData.quarterbacks, 'qb-rules');
    }
    
    // Display running backs
    if (allData.runningBacks) {
        PointsLoader.displayRules(allData.runningBacks, 'rb-rules');
    }
    
    // Display kickers
    if (allData.kickers) {
        PointsLoader.displayRules(allData.kickers, 'k-rules');
    }
    
    // Display defense
    if (allData.defense) {
        PointsLoader.displayRules(allData.defense, 'def-rules');
    }
}

// Call when page loads
document.addEventListener('DOMContentLoaded', displayAllRules);
```

### Example 2: Show Statistics for a Position
```javascript
async function showPositionStats() {
    const rules = await PointsLoader.loadPosition('quarterbacks');
    const stats = PointsLoader.getStatistics(rules);
    
    console.log(`Quarterbacks: ${stats.count} rules, ${stats.total} total points`);
    console.log(`Normal: ${stats.normal}, Bonus: ${stats.bonus}, Negative: ${stats.negative}`);
}
```

### Example 3: Display Only Bonus Rules
```javascript
async function showBonusRules() {
    const allData = await PointsLoader.loadAllPoints();
    
    Object.keys(allData).forEach(position => {
        const rules = allData[position];
        const bonusRules = PointsLoader.filterByType(rules, 'bonus');
        
        if (bonusRules.length > 0) {
            console.log(`${position}: ${bonusRules.length} bonus rules`);
            PointsLoader.displayRules(bonusRules, `${position}-bonus`);
        }
    });
}
```

## Integration with Existing Code

The `PointsLoader` is already integrated into all CRUD pages:
- `quarterbacks.html` - ✓ Can read from points.json
- `running-backs.html` - ✓ Can read from points.json
- `kickers.html` - ✓ Can read from points.json
- `defense.html` - ✓ Can read from points.json
- `points-system.html` - ✓ Can read from points.json

## Data Flow

```
points.json (source data)
    ↓
fetch() request
    ↓
PointsLoader.loadPosition() or loadAllPoints()
    ↓
JavaScript array of rule objects
    ↓
displayRules() for HTML display
    ↓
localStorage (for CRUD operations)
```

## Error Handling

All methods include error handling:

```javascript
try {
    const rules = await PointsLoader.loadPosition('quarterbacks');
    // Use rules safely
} catch (error) {
    console.error('Failed to load rules:', error);
    // Fallback behavior
}
```

If `points.json` fails to load, an empty array is returned and a console warning is logged.

## Available Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `loadPosition()` | position (string) | Promise<Array> | Load rules for specific position |
| `loadAllPoints()` | none | Promise<Object> | Load entire points.json |
| `displayRules()` | rules, elementId, options | void | Display rules in HTML |
| `calculateTotalPoints()` | rules | number | Sum all rule points |
| `filterByType()` | rules, type | Array | Filter by rule type |
| `getStatistics()` | rules | Object | Get rule statistics |
| `escapeHtml()` | text | string | Escape HTML characters |
| `formatRule()` | rule | string | Format rule as string |

## Notes

- All methods use `async/await` for consistency
- HTML is automatically escaped to prevent XSS attacks
- The utility works in any browser that supports ES6 classes and Promises
- Points.json is loaded from `../data/points.json` relative to JS files
