# Quick Start - Backend Server

## 1. Install Dependencies (First Time Only)
```bash
npm install
```

## 2. Start the Backend Server
```bash
npm start
```

You should see:
```
LDFFW Points System Backend Server
Server running at: http://localhost:3000
```

## 3. Open the Application
Navigate to: **http://localhost:3000**

## 4. Test CRUD Operations
- Click any position link (Quarterbacks, Running Backs, etc.)
- Add/Edit/Delete a rule
- Check terminal - you'll see: ✓ Successfully saved [position] to points.json
- Open `data/points.json` - your changes are there!

## How Data Flows

```
HTML Page (CRUD Form)
    ↓
JavaScript Handler (add/edit/delete)
    ↓
localStorage (instant update)
    ↓
API Call to Backend (async)
    ↓
Server Writes to points.json
    ↓
Console Log: ✓ Saved!
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` |
| Port 3000 in use | Use different port: `PORT=3001 npm start` |
| CORS errors | Make sure server is running and use `http://localhost:3000` |
| Changes not saving to JSON | Check terminal for error messages, restart server |

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/points` | GET | Load all points data |
| `/api/points/:position` | GET | Load specific position rules |
| `/api/save-points/:position` | POST | Save position rules to JSON |
| `/api/points/:position/:id` | DELETE | Delete a specific rule |
| `/api/health` | GET | Check if server is running |

For detailed documentation, see [BACKEND_SETUP.md](BACKEND_SETUP.md)
