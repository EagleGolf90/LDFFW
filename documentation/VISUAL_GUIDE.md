# LDFFW Points System - Visual Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Quarterbacks  │  │Running Backs │  │   Kickers    │       │
│  │   (HTML)     │  │   (HTML)     │  │   (HTML)     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │              │
│  ┌──────────────┐  ┌──────────────────┐               │       │
│  │  Defense     │  │ Points System    │               │       │
│  │  (HTML)      │  │ Overview (HTML)  │               │       │
│  └──────┬───────┘  └──────┬───────────┘               │       │
│         └──────────────────┼──────────────────────────┘       │
│                            │                                  │
├─────────────────────────────┼──────────────────────────────────┤
│                  STYLING LAYER (CSS)                          │
│           ┌─────────────────────────────────┐                │
│           │  styles.css & crud.css          │                │
│           └─────────────────────────────────┘                │
├─────────────────────────────┬──────────────────────────────────┤
│                             │                                  │
│                  BUSINESS LOGIC LAYER (JavaScript)            │
│                             │                                  │
│      ┌──────────────────────┼───────────────────────┐         │
│      │                      │                       │         │
│   ┌──▼──┐  ┌─────────────┐ ┌▼────────────┐    ┌───▼──┐      │
│   │QBs  │  │Running Backs│ │   Kickers   │    │ Def. │      │
│   │ JS  │  │      JS     │ │     JS      │    │ JS   │      │
│   └──┬──┘  └──────┬──────┘ └──────┬──────┘    └───┬──┘      │
│      │            │               │               │          │
│      └────────────┼───────────────┼───────────────┘          │
│                   │               │                           │
│              ┌────▼───────────────▼────┐                     │
│              │   StorageManager Base   │                     │
│              │   (storage.js)          │                     │
│              │                         │                     │
│              │  - getRules()           │                     │
│              │  - getRule()            │                     │
│              │  - addRule()            │                     │
│              │  - updateRule()         │                     │
│              │  - deleteRule()         │                     │
│              │  - loadFromJSON()       │                     │
│              │  - saveToJSON()         │                     │
│              └────────┬────────────────┘                     │
│                       │                                       │
├───────────────────────┼───────────────────────────────────────┤
│                 DATA PERSISTENCE LAYER                        │
│                       │                                       │
│      ┌────────────────┼─────────────────┐                    │
│      │                │                 │                    │
│   ┌──▼──────────────┐ │   ┌───────────┐ │                   │
│   │ localStorage    │ │   │ Browser   │ │                   │
│   │ (Cache)         │ │   │ APIs      │ │                   │
│   │                 │ │   └───────────┘ │                   │
│   │ Keys:           │ │                 │                   │
│   │ - quarterback.. │ │ ┌──────────────┤                   │
│   │ - running_backs_│ │ │Fetch API    │                    │
│   │ - kickers_rules │ │ │ (JSON load) │                    │
│   │ - defense_rules │ │ └──────────────┤                   │
│   └──────────────────┘ │                 │                   │
│                        └─────────────────┘                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                      DATA SOURCE LAYER                        │
│                                                              │
│      ┌───────────────────────────────────────────┐          │
│      │          data/points.json                 │          │
│      │                                           │          │
│      │  {                                        │          │
│      │    "quarterbacks": [ 7 rules ],          │          │
│      │    "runningBacks": [ 8 rules ],          │          │
│      │    "kickers": [ 6 rules ],                │          │
│      │    "defense": [ 5 rules ]                 │          │
│      │  }                                        │          │
│      │                                           │          │
│      │  Total: 26 scoring rules                 │          │
│      └───────────────────────────────────────────┘          │
│                                                              │
│  Optional: Backend API for persistence                      │
│      /api/save-points (POST)                                │
│      └─> Updates data/points.json on server                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
Page Load
   │
   ▼
Check localStorage
   │
   ├─ YES ────────> Use cached data ─────────> Display rules
   │
   NO
   │
   ▼
Load from points.json
   │
   ├─ SUCCESS ────> Cache in localStorage ──> Display rules
   │
   FAIL
   │
   ▼
Load default rules ──> Cache in localStorage ──> Display rules
   │
   ▼
User Interaction (CRUD)
   │
   ├─ Add Rule ────> Storage.addRule() ─────┐
   │                                        │
   ├─ Update Rule ─> Storage.updateRule()  ├──> Update localStorage
   │                                        │
   ├─ Delete Rule ─> Storage.deleteRule() ─┤
   │                                        │
   └─ Read Rules ──> Storage.getRules()    │
   │                                        │
   ▼                                        │
Save to localStorage <──────────────────────┘
   │
   ▼
Async: Sync to JSON file (if backend available)
   │
   ▼
Done
```

## Class Hierarchy

```
StorageManager (Abstract Base)
    │
    ├── constructor(positionKey, jsonKey)
    │
    ├── Methods:
    │   ├── initializeStorage()
    │   ├── loadFromJSON()
    │   ├── saveToJSON()
    │   ├── getRules()
    │   ├── getRule(id)
    │   ├── addRule(desc, points, type)
    │   ├── updateRule(id, desc, points, type)
    │   ├── deleteRule(id)
    │   └── getDefaultRules()
    │
    └── Subclasses:
        │
        ├── QuarterbacksStorage
        │   └── getDefaultRules() ──> [7 QB rules]
        │
        ├── RunningBacksStorage
        │   └── getDefaultRules() ──> [8 RB rules]
        │
        ├── KickersStorage
        │   └── getDefaultRules() ──> [6 Kicker rules]
        │
        └── DefenseStorage
            └── getDefaultRules() ──> [5 Defense rules]
```

## CRUD Operations Flow

```
CREATE: Add New Rule
─────────────────────

Form Input (Description, Points, Type)
              │
              ▼
       validInput()
              │
              ▼
    storage.addRule(desc, points, type)
              │
              ├──> Generate ID (Date.now())
              │
              ├──> Create rule object
              │
              ├──> Append to rules array
              │
              ├──> Save to localStorage
              │
              └──> Async: saveToJSON()
                        │
                        ▼
              Return new rule object
                        │
                        ▼
              displayRules()


READ: Get All Rules
──────────────────

    storage.getRules()
              │
              ├──> Get from localStorage
              │
              └──> JSON.parse() ──> Return array


UPDATE: Edit Rule
─────────────────

User Clicks Edit Button
              │
              ▼
Enable Edit Mode
              │
              ▼
User Modifies Fields
              │
              ▼
User Clicks Save
              │
              ▼
       validInput()
              │
              ▼
storage.updateRule(id, desc, points, type)
              │
              ├──> Find rule by ID
              │
              ├──> Update properties
              │
              ├──> Add updatedAt timestamp
              │
              ├──> Save to localStorage
              │
              └──> Async: saveToJSON()
                        │
                        ▼
              displayRules()


DELETE: Remove Rule
───────────────────

User Clicks Delete
              │
              ▼
Show Confirmation
              │
              ├─ CANCEL ──> Close dialog
              │
              │ CONFIRM
              │
              ▼
storage.deleteRule(id)
              │
              ├──> Find rule by ID
              │
              ├──> Filter from array
              │
              ├──> Save to localStorage
              │
              └──> Async: saveToJSON()
                        │
                        ▼
              displayRules()
```

## Rule Object Structure

```json
{
  "id": "1640000000000",
  "description": "Every 20 yards passing",
  "points": 1,
  "type": "normal",
  "createdAt": "2025-12-21T00:00:00.000Z",
  "updatedAt": "2025-12-21T10:30:45.000Z"  // Optional, added on updates
}
```

## localStorage Structure

```javascript
localStorage = {
  // Key: position_rules
  // Value: JSON.stringify([ ...rules ])
  
  "quarterbacks_rules": "[{id:'1',...},{id:'2',...}]",
  "running_backs_rules": "[{id:'1',...},{id:'2',...}]",
  "kickers_rules": "[{id:'1',...},{id:'2',...}]",
  "defense_rules": "[{id:'1',...},{id:'2',...}]"
}
```

## Initialization Sequence

```
Page Loads (e.g., quarterbacks.html)
             │
             ▼
     Load storage.js
             │
             ▼
new QuarterbacksStorage()
             │
             ├──> constructor('quarterbacks_rules', 'quarterbacks')
             │
             ├──> initializeStorage()
             │
             ├──> Check localStorage['quarterbacks_rules']
             │
             ├─ EXISTS ──────> Use cached data
             │
             │ NOT EXISTS
             │
             ├──> fetch('../data/points.json')
             │
             ├─ SUCCESS ─────> storage.data['quarterbacks']
             │
             │ FAIL
             │
             └──> Use getDefaultRules()
                        │
                        ▼
              Save to localStorage
                        │
                        ▼
             displayRules()
```

## Browser DevTools Inspection

```
Application > localStorage
  └── quarterbacks_rules
      └── [{"id":"1","description":"...","points":1,...}, ...]

Application > Storage > Cache
  └── data/points.json (if cached)

Console
  └── Logs for JSON loading errors (if any)
```

## Network Communication (Optional Backend)

```
Client (Browser)
    │
    ├── GET /data/points.json
    │       ├─ Success: Load rules
    │       └─ Fail: Use defaults
    │
    └── POST /api/save-points (if backend exists)
            ├─ Body: { "quarterbacks": [...], ... }
            └─ Response: { success: true }
                │
                ▼
            Server
                │
                ├── Receive JSON
                │
                ├── Validate data
                │
                ├── Write to data/points.json
                │
                └── Return success
```

## Feature Timeline (Optional)

```
Current Implementation:
├── ✅ Centralized points.json
├── ✅ localStorage caching
├── ✅ Full CRUD operations
└── ✅ Multi-position support

Optional Enhancements:
├── Backend persistence (/api/save-points)
├── Export/Import functionality
├── Bulk edit operations
├── Rule templates
├── Audit trail/History
├── Role-based access
└── Database integration
```

---

This visual guide helps understand how all components work together to provide a complete CRUD system for managing points across all positions.
