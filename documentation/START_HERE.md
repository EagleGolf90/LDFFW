# 🚀 START HERE - Three Commands

That's all you need to get started!

---

## Command 1: Install Dependencies (First Time Only)

```bash
npm install
```

**What it does:**
- Downloads and installs express, cors, body-parser
- Creates node_modules folder
- Takes about 1-2 minutes

**When to run:**
- Only once, on first setup
- Or if you delete node_modules folder

---

## Command 2: Start the Server (Every Time You Work)

```bash
npm start
```

**What it does:**
- Starts Node.js server on http://localhost:3000
- Begins listening for CRUD operations
- Shows confirmation message

**When to run:**
- Every time you want to use the system
- Keep it running while working
- Ctrl+C to stop

---

## Command 3: Open in Browser

```
http://localhost:3000
```

**What it does:**
- Opens the CRUD interface
- Shows position pages
- Connects to running backend server

**Once you open it:**
1. Click Quarterbacks (or other position)
2. Add/Edit/Delete rules
3. Watch points.json update automatically

---

## That's It! 🎉

Three simple steps:
1. `npm install` (one time)
2. `npm start` (every session)
3. Open `http://localhost:3000` (in browser)

---

## What Happens After

- ✅ Add a rule → Saves to localStorage + points.json
- ✅ Edit a rule → Updates everywhere
- ✅ Delete a rule → Removed from JSON
- ✅ Page reload → Everything still there (from JSON)
- ✅ Console shows → ✓ Successfully saved!

---

## If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Run: `npm install` |
| "Port already in use" | Run: `PORT=3001 npm start` |
| CORS errors | Use http://localhost:3000 (not file://) |
| Server won't start | Check Node.js: `node --version` |

---

## That's All You Need to Know

The backend is set up. The frontend is updated. Just run those three commands and start using it!

**Questions?** Check BACKEND_QUICK_START.md or BACKEND_SETUP.md

**Ready?** Go run: `npm install` 🚀
