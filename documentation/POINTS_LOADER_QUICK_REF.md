# Quick Reference: Using PointsLoader

## Load and Display Rules

```javascript
// Load QB rules and display them
const qbRules = await PointsLoader.loadPosition('quarterbacks');
PointsLoader.displayRules(qbRules, 'myElement');
```

## Available Positions
- `quarterbacks`
- `runningBacks`
- `kickers`
- `defense`

## Common Tasks

### Get Total Points
```javascript
const total = PointsLoader.calculateTotalPoints(rules);
```

### Get Statistics
```javascript
const stats = PointsLoader.getStatistics(rules);
// { total: 20, count: 7, normal: 4, bonus: 2, negative: 1 }
```

### Filter by Type
```javascript
const bonusRules = PointsLoader.filterByType(rules, 'bonus');
```

### Load All Data
```javascript
const all = await PointsLoader.loadAllPoints();
// { quarterbacks: [...], runningBacks: [...], kickers: [...], defense: [...] }
```

### Display in Compact Format
```javascript
PointsLoader.displayRules(rules, 'element', { 
    compact: true,
    showType: false,
    showDate: false
});
```

## Where It Works
✓ quarterbacks.html  
✓ running-backs.html  
✓ kickers.html  
✓ defense.html  
✓ points-system.html  
✓ Any custom HTML files that include `<script src="js/pointsLoader.js"></script>`

## Data Source
All data is read from: `data/points.json`

## Error Handling
All methods include built-in error handling. If points.json fails to load, empty results are returned and errors are logged to console.

---
See POINTS_LOADER_GUIDE.md for detailed documentation.
