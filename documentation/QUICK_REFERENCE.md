# Quick Reference - Points System CRUD

## JSON File Location
```
d:\Projects\LDFFW\data\points.json
```

## Position Keys in JSON
- `quarterbacks` - QB scoring rules
- `runningBacks` - RB/WR scoring rules  
- `kickers` - Kicker scoring rules
- `defense` - Defense/Special Teams rules

## Storage Classes

### QuarterbacksStorage
```javascript
const storage = new QuarterbacksStorage();
```

### RunningBacksStorage
```javascript
const storage = new RunningBacksStorage();
```

### KickersStorage
```javascript
const storage = new KickersStorage();
```

### DefenseStorage
```javascript
const storage = new DefenseStorage();
```

## Common Operations

### Get All Rules
```javascript
const rules = storage.getRules();
// Returns: Array of rule objects
```

### Get Single Rule
```javascript
const rule = storage.getRule('1');
// Returns: Single rule object or undefined
```

### Add New Rule
```javascript
const newRule = storage.addRule('Rule Description', 6, 'normal');
// Points can be decimal (e.g., 0.5)
// Type: 'normal', 'bonus', or 'negative'
// Returns: New rule object with auto-generated ID
```

### Update Rule
```javascript
const updated = storage.updateRule('1', 'Updated Description', 7, 'bonus');
// Returns: Updated rule object or null if not found
```

### Delete Rule
```javascript
storage.deleteRule('1');
// No return value
```

## Rule Object Structure

```javascript
{
  id: "1640000000000",           // Auto-generated timestamp ID
  description: "Rule name",      // Rule description
  points: 6,                     // Can be positive, negative, or decimal
  type: "normal",                // "normal", "bonus", or "negative"
  createdAt: "2025-12-21T...",  // ISO 8601 timestamp
  updatedAt: "2025-12-21T..."    // Optional, added on updates
}
```

## Types Explained

| Type | Purpose | Example |
|------|---------|---------|
| `normal` | Standard scoring | TD = 6 points |
| `bonus` | Bonus points | Extra 2 pts per 10 yards |
| `negative` | Penalty points | Interception = -2 |

## Data Flow

```
1. Page loads
   ↓
2. StorageManager initializes
   ↓
3. Check localStorage for data
   ↓
4. If not found, load from points.json
   ↓
5. Display rules on page
   ↓
6. User CRUD operations
   ↓
7. Update localStorage
   ↓
8. Optionally sync to backend
```

## localStorage Keys

- `quarterbacks_rules` - QB rules cache
- `running_backs_rules` - RB/WR rules cache
- `kickers_rules` - Kicker rules cache
- `defense_rules` - Defense rules cache

## Default Rules

Each position has default rules that are used if:
1. localStorage is empty
2. JSON file cannot be loaded

Edit the `getDefaultRules()` method in each storage class to modify defaults.

## Tips

- Always initialize storage class without parameters: `new QuarterbacksStorage()`
- localStorage is automatically updated on any CRUD operation
- IDs are automatically generated - don't create them manually
- Points can be decimals: `0.5`, `1.5`, `-2.5`
- Use `storage.getRules()` frequently to refresh displayed data
