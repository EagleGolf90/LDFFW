# Quick Reference Card - LDFFW Backend Integration

**Print this! Keep it handy while setting up and using the system.**

---

## ⚡ 5-Minute Setup

```bash
# Step 1: Install (one-time)
npm install

# Step 2: Start Server
npm start

# Step 3: Open Browser
http://localhost:3000

# Step 4: Use CRUD Pages
Click Quarterbacks, Running Backs, etc.
```

---

## 🎯 After Setup Works

| You Do | System Does | Result |
|--------|------------|--------|
| Add Rule | Save to localStorage + API | Rule appears + saved to JSON |
| Edit Rule | Update localStorage + API | Rule updates + saved to JSON |
| Delete Rule | Remove from localStorage + API | Rule gone + deleted from JSON |
| Refresh Page | Load from points.json | All rules reappear (persistent!) |

---

## 📍 Key Locations

| What | Where |
|------|-------|
| Backend Server | `server.js` |
| Dependencies | `package.json` |
| Frontend Data | `js/storage.js` |
| Points Data | `data/points.json` |
| Quick Help | `BACKEND_QUICK_START.md` |
| Full Help | `BACKEND_SETUP.md` |

---

## 🔗 API Endpoints (If you need them)

```
GET  http://localhost:3000/api/points
GET  http://localhost:3000/api/points/:position
POST http://localhost:3000/api/save-points/:position
DELETE http://localhost:3000/api/points/:position/:id
GET  http://localhost:3000/api/health
```

---

## ✅ Verification Commands

```bash
# Is server running?
curl http://localhost:3000/api/health

# See all points data?
curl http://localhost:3000/api/points

# See specific position?
curl http://localhost:3000/api/points/quarterbacks
```

---

## 🚨 Troubleshooting

| Error | Fix |
|-------|-----|
| "Cannot find module" | Run: `npm install` |
| "Port 3000 in use" | Run: `PORT=3001 npm start` |
| "CORS error" | Use http://localhost:3000 (not file://) |
| Changes don't save | Check server is running in terminal |
| Console errors | Press F12, check Console tab |

---

## 📊 What Happens Behind Scenes

```
User Clicks "Add Rule"
        ↓
JavaScript validates form
        ↓
localStorage updated (INSTANT)
        ↓
User sees rule immediately ✓
        ↓
Async API call to server (background)
        ↓
Server validates & writes points.json
        ↓
Console shows: ✓ Successfully saved!
        ↓
Changes persist forever (even after refresh) ✓
```

---

## 🎮 Testing

### Test 1: Add a Rule
1. Go to http://localhost:3000/quarterbacks.html
2. Enter: Description="Test", Points="99", Type="normal"
3. Click "Add Rule"
4. Check console - should see: ✓ Successfully saved
5. Check `data/points.json` - see your new rule!

### Test 2: Persistence
1. Add a rule
2. Close browser completely
3. Reopen http://localhost:3000/quarterbacks.html
4. Rule still there! (loaded from points.json)

---

## 💡 Pro Tips

1. **Monitor Server** - Keep terminal visible while testing
2. **Check Console** - F12 → Console for detailed messages
3. **Watch Points.json** - Open in editor, see changes appear
4. **CORS Issues?** - Always use http://localhost:3000, never file://
5. **Port Conflicts?** - Use different port with `PORT=3001 npm start`

---

## 📚 Where to Learn More

| Topic | Document |
|-------|----------|
| Quick Setup | BACKEND_QUICK_START.md |
| Complete Docs | BACKEND_SETUP.md |
| Architecture | ARCHITECTURE.md |
| What Changed | UPDATE_SUMMARY.md |
| All Files | FILE_MANIFEST.md |

---

## ✨ What's New

- ✨ `server.js` - Backend server
- ✨ `package.json` - Dependencies
- ✨ Documentation files - Full guides
- ✅ `storage.js` - Now uses API for persistence
- ✓ Everything else - Still works perfectly

---

## 🎯 Normal Workflow

### Start of Day
```bash
npm start
# Terminal shows: "Server running at http://localhost:3000"
```

### During Work
1. Open http://localhost:3000
2. Click position pages
3. Add/Edit/Delete rules
4. Changes auto-save to points.json

### End of Day
```bash
Ctrl+C  (stop server)
```

---

## 🔐 Important Notes

- ⚠️ **Server Required** - No server = no data persistence
- 💾 **Always Backup** - Keep backup of points.json just in case
- 🔄 **Restart Server** - If things act weird, restart server
- 📋 **Check Logs** - Terminal shows everything that happens

---

## 🎉 You're Ready!

Everything is set up. Just:

1. Run: `npm install` (one time)
2. Run: `npm start` (every session)
3. Open: http://localhost:3000
4. Test: Add/Edit/Delete rules
5. Verify: Check points.json

**That's it! CRUD pages now auto-save to points.json!** ✓

---

## 📞 Quick Links

- **Quick Help:** BACKEND_QUICK_START.md
- **Full Help:** BACKEND_SETUP.md
- **Architecture:** ARCHITECTURE.md
- **Troubleshooting:** BACKEND_SETUP.md (end of file)

---

**Last Updated:** December 21, 2025  
**Status:** Ready to Use ✅
