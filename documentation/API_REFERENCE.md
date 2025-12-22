# StorageManager API Documentation

## Class Hierarchy

```
StorageManager (Base)
├── QuarterbacksStorage
├── RunningBacksStorage
├── KickersStorage
└── DefenseStorage
```

## StorageManager

Base class that handles all storage operations with dual-source support (localStorage + JSON file).

### Constructor

```javascript
// Called by subclasses - don't instantiate directly
constructor(positionKey, jsonKey)
```

**Parameters:**
- `positionKey` (string) - localStorage key (e.g., 'quarterbacks_rules')
- `jsonKey` (string) - JSON object key (e.g., 'quarterbacks')

### Methods

#### `initializeStorage()`
Initializes storage by loading from JSON if localStorage is empty.

```javascript
// Called automatically in constructor
```

#### `loadFromJSON()`
Loads rules from `data/points.json` asynchronously.

```javascript
const rules = await storage.loadFromJSON();
// Returns: Array of rules or empty array on error
```

#### `saveToJSON(rules)`
Saves rules back to JSON file (requires backend endpoint).

```javascript
await storage.saveToJSON(rules);
// Returns: boolean (true = success, false = error)
```

#### `getRules()`
Retrieves all rules for a position from localStorage.

```javascript
const allRules = storage.getRules();
// Returns: Array of rule objects
// Example: [ { id: '1', description: '...', points: 6, ... }, ... ]
```

#### `getRule(id)`
Retrieves a single rule by ID.

```javascript
const rule = storage.getRule('1');
// Returns: Rule object or undefined if not found
```

#### `addRule(description, points, type)`
Creates a new scoring rule.

```javascript
const newRule = storage.addRule('Touchdown', 6, 'normal');
// Returns: New rule object with generated ID
// Example return:
// {
//   id: '1640000000000',
//   description: 'Touchdown',
//   points: 6,
//   type: 'normal',
//   createdAt: '2025-12-21T10:30:00.000Z'
// }
```

**Parameters:**
- `description` (string) - Rule name/description (required)
- `points` (number) - Points value, can be positive, negative, or decimal (required)
- `type` (string) - 'normal', 'bonus', or 'negative' (required)

#### `updateRule(id, description, points, type)`
Updates an existing rule.

```javascript
const updated = storage.updateRule('1', 'Updated TD', 7, 'bonus');
// Returns: Updated rule object or null if rule not found
```

**Parameters:**
- `id` (string) - Rule ID (required)
- `description` (string) - New description (required)
- `points` (number) - New points value (required)
- `type` (string) - New type (required)

**Side Effects:**
- Adds `updatedAt` timestamp to the rule
- Updates localStorage
- Calls `saveToJSON()` (async)

#### `deleteRule(id)`
Removes a rule by ID.

```javascript
storage.deleteRule('1');
// No return value
// Removes the rule from localStorage and triggers JSON save
```

**Parameters:**
- `id` (string) - Rule ID to delete (required)

#### `getDefaultRules()`
Returns default rules for the position (overridden by subclasses).

```javascript
const defaults = storage.getDefaultRules();
// Returns: Array of default rule objects
// Used when localStorage is empty and JSON fails to load
```

---

## Position-Specific Classes

### QuarterbacksStorage

```javascript
const storage = new QuarterbacksStorage();
```

**JSON Key:** `quarterbacks`  
**localStorage Key:** `quarterbacks_rules`

**Default Rules:**
1. Every 20 yards passing - 1 point (normal)
2. Each completion - 1 point (normal)
3. Every rushing & reception attempt - 1 point (normal)
4. Every 10 yards rushing & reception - 1 point (normal)
5. Per TD (Pass, Rush & Reception) - 6 points (normal)
6. Bonus points per 10 yards to TD - 2 points (bonus)
7. Intercept/Fumble - -2 points (negative)

### RunningBacksStorage

```javascript
const storage = new RunningBacksStorage();
```

**JSON Key:** `runningBacks`  
**localStorage Key:** `running_backs_rules`

**Default Rules:**
1. Per carry - 1 point (normal)
2. Every 10 yards rushing - 1 point (normal)
3. Per catch - 2 points (normal)
4. Every 20 yards reception - 1 point (normal)
5. Touchdown - 6 points (normal)
6. Bonus points per 10 yards to TD - 2 points (bonus)
7. Every 20 yards passing - 1 point (normal)
8. Each completion - 1 point (normal)

### KickersStorage

```javascript
const storage = new KickersStorage();
```

**JSON Key:** `kickers`  
**localStorage Key:** `kickers_rules`

**Default Rules:**
1. Per extra point - 1 point (normal)
2. XP Kick missed - -1 point (negative)
3. Field Goal - 3 points (normal)
4. Failed Field Goal - -3 points (negative)
5. TD (Pass, Rush or Catch) - 6 points (normal)
6. Bonus per 10 yards to TD - 2 points (bonus)

### DefenseStorage

```javascript
const storage = new DefenseStorage();
```

**JSON Key:** `defense`  
**localStorage Key:** `defense_rules`

**Default Rules:**
1. Defense TD & Special Teams TD - 6 points (normal)
2. Bonus per 10 yards to TD - 2 points (bonus)
3. Per intercept/sack/fumble recovery - 6 points (normal)
4. Safety - 8 points (normal)
5. Block FG/Missed FG - 6 points (normal)

---

## Data Structures

### Rule Object

```typescript
interface Rule {
  id: string;                    // Auto-generated timestamp ID
  description: string;           // Rule name/description
  points: number;                // Positive, negative, or decimal
  type: 'normal' | 'bonus' | 'negative';  // Rule category
  createdAt: string;            // ISO 8601 timestamp
  updatedAt?: string;           // ISO 8601 timestamp (optional)
}
```

### Rule Type Definitions

| Type | Purpose | Usage |
|------|---------|-------|
| `normal` | Standard scoring | Most common rules |
| `bonus` | Bonus multiplier | Extra points for achievements |
| `negative` | Penalty scoring | Deductions or failures |

---

## Error Handling

### JSON Loading Errors
If `data/points.json` fails to load:
- StorageManager logs error to console
- Falls back to default rules
- App continues to work offline

### Rule Not Found
- `getRule()` returns `undefined`
- `updateRule()` returns `null`
- `deleteRule()` silently does nothing

### Invalid Input
- Validate input before calling methods
- Decimal points: `storage.addRule('Rule', 1.5, 'normal')` ✓
- Negative points: `storage.addRule('Penalty', -2, 'negative')` ✓
- Empty description: Will create rule but not recommended

---

## Usage Patterns

### Initialize and Display

```javascript
const storage = new QuarterbacksStorage();
const rules = storage.getRules();

rules.forEach(rule => {
  console.log(`${rule.description}: ${rule.points} pts`);
});
```

### Complete CRUD Flow

```javascript
// Create
const newRule = storage.addRule('New Rule', 5, 'normal');
console.log('Created:', newRule.id);

// Read
const allRules = storage.getRules();

// Update
if (newRule) {
  storage.updateRule(newRule.id, 'Updated Rule', 6, 'bonus');
}

// Delete
storage.deleteRule(newRule.id);
```

### Error-Safe Operations

```javascript
// Safe update
const rule = storage.getRule('some-id');
if (rule) {
  storage.updateRule('some-id', 'Updated', 5, 'normal');
} else {
  console.log('Rule not found');
}

// Safe delete
storage.deleteRule('some-id'); // Safe even if doesn't exist
```

---

## Performance Considerations

- **getRules()** - O(1), returns from localStorage
- **getRule()** - O(n), array search
- **addRule()** - O(1), push operation
- **updateRule()** - O(n), array search
- **deleteRule()** - O(n), array filter

All operations are synchronous except:
- `initializeStorage()` - async
- `loadFromJSON()` - async
- `saveToJSON()` - async

---

## localStorage Format

Each position stores a JSON stringified array:

```javascript
// localStorage['quarterbacks_rules']
'[{"id":"1","description":"...","points":6,...}]'

// Accessed as:
JSON.parse(localStorage.getItem('quarterbacks_rules'))
```

---

## Backward Compatibility

The system automatically:
- Loads from existing localStorage data
- Falls back to JSON if needed
- Maintains backward compatibility with old storage format
- No migration needed for existing deployments
