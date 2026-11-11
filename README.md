# LDFFW Points System - Documentation Index

Welcome! This document provides an overview of all documentation files for the LDFFW Points System.

## 📋 Quick Start

If you're new to this project:

1. **Start Backend:** [BACKEND_QUICK_START.md](BACKEND_QUICK_START.md) - Get the server running (2 minutes)
2. **Read First:** [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Overview of what was done
3. **Learn Basics:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Common operations
4. **Go Deeper:** [DATA_STRUCTURE.md](DATA_STRUCTURE.md) - How everything works

## 📚 Documentation Files

### Production lineup storage (SQL Server)

The production lineup page uses `api/lineup.php` to read, save, and delete
`dbo.users_lineup` rows in SQL Server, scoped by owner, week, and slot.
The table must already exist (see `scripts/create_users_lineup_table.js`).
The PHP host requires Microsoft's `pdo_sqlsrv` extension and its ODBC driver,
network access to SQL Server, and a trusted SQL Server TLS certificate.
Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT` in
environment variables or the root `.env`; the default port is `1433`, not
MySQL's `3306`. Deployment supplies these settings from repository secrets.
The database login needs SELECT, INSERT, and DELETE permissions on the table.

Choose a week, fill all nine slots, and click **Save Lineup**. Each week is
saved separately. The page waits for the selected week's lineup to load
before enabling editing and prevents switching weeks during a save.
Production reports success only after SQL Server commits the save.
Database failures return an error rather than silently writing JSON.
The page can keep a browser-only backup, but explicitly warns that this
is not a database save. Local `npm start` still uses `data/users_lineup.json`.

Run the storage regression checks with `php scripts/test_lineup_store.php`
(uses an isolated in-memory SQLite database, not production).

#### Troubleshooting production saves

If the page reports "SQL Server is unavailable" and "Lineup saved to this
browser only", the database save failed; the browser copy is not shared
with other devices.

1. In GitHub **Settings > Secrets and variables > Actions**, add repository
   secrets `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for the
   production SQL Server. Optionally add `DB_PORT` (defaults to `1433`).
   FTP secrets only configure file uploads, not the database connection.
   The deploy workflow now stops before uploading if required database
   secrets are missing or the port is invalid.
2. Deploy again so the production root `.env` receives those settings.
   Adding secrets alone does not update an already deployed site.
3. Ask the hosting provider to confirm that the **web PHP runtime** has
   `pdo_sqlsrv` and the Microsoft ODBC driver installed and can reach the
   SQL Server host/port. A local connection from your computer does not
   verify connectivity from the PHP host.
4. Check the hosting PHP error log for entries beginning with `lineup.php:`.
   These distinguish a missing driver or setting from login, network, or
   TLS certificate failures. Do not publish credentials or a public
   `phpinfo()` page, and keep certificate validation enabled.
5. After fixing the connection, open the same browser and week and save
   the lineup again. Confirm the page reports a SQL Server save, then
   verify that week loads from a second browser.

### [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
**What:** Complete summary of what was implemented  
**Who:** Everyone - especially project managers and stakeholders  
**Why:** See the full scope and status of the project  
**Read if:** You want a high-level overview of completed work

**Contains:**
- What was created and changed
- Data overview (26 total rules)
- Architecture benefits
- Testing checklist

---

### [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
**What:** Detailed setup summary and next steps  
**Who:** Developers implementing new features  
**Why:** Understand what's available and how to extend it  
**Read if:** You're new to the system or want to know next steps

**Contains:**
- How the system works (with diagram)
- Key features overview
- Usage examples
- Optional next steps
- File manifest

---

### [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
**What:** Fast lookup guide for common operations  
**Who:** Developers actively coding  
**Why:** Quick access to API without reading full docs  
**Read if:** You need to remember a method name or parameter

**Contains:**
- JSON file location and structure
- Storage class instantiation
- Common CRUD operations
- Rule object structure
- Tips and tricks

---

### [BACKEND_QUICK_START.md](BACKEND_QUICK_START.md)
**What:** Fast setup for the Node.js backend server  
**Who:** Everyone - required to persist changes to points.json  
**Why:** Enable automatic data persistence for all CRUD operations  
**Read if:** You want to run the application with data persistence

**Contains:**
- Installation steps (1 command)
- Starting the server (1 command)
- How data flows through the system
- Quick troubleshooting

---

### [BACKEND_SETUP.md](BACKEND_SETUP.md)
**What:** Complete backend server documentation  
**Who:** Developers and DevOps  
**Why:** Full understanding of server setup and API endpoints  
**Read if:** You need detailed information about the backend

**Contains:**
- Prerequisites and installation
- Detailed API endpoint documentation
- Architecture and flow diagrams
- Troubleshooting guide
- Development notes
- File structure

---

### [DATA_STRUCTURE.md](DATA_STRUCTURE.md)
**What:** Technical architecture and data organization  
**Who:** Developers and architects  
**Why:** Deep understanding of system design  
**Read if:** You need to modify or extend the system

**Contains:**
- File structure
- Data format in points.json
- How the system works
- CRUD operation details
- Data flow diagram
- Backend integration guide

---

### [API_REFERENCE.md](API_REFERENCE.md)
**What:** Complete API documentation with examples  
**Who:** Developers using the storage classes  
**Why:** Reference for all available methods and properties  
**Read if:** You need detailed method signatures and return types

**Contains:**
- Class hierarchy
- Every method documented
- Parameter descriptions
- Return values
- Error handling
- Usage patterns
- Performance notes

---

## 🎯 Find What You Need

### "How do I...?"

| Question | Document | Section |
|----------|----------|---------|
| Add a new rule? | QUICK_REFERENCE.md | Add New Rule |
| Get all rules? | QUICK_REFERENCE.md | Get All Rules |
| Update a rule? | API_REFERENCE.md | updateRule() |
| Delete a rule? | API_REFERENCE.md | deleteRule() |
| Add a new position? | DATA_STRUCTURE.md | Backend Integration |
| Enable server save? | SETUP_COMPLETE.md | To Enable Full Persistence |
| Understand the data? | DATA_STRUCTURE.md | Data Structure |
| See all methods? | API_REFERENCE.md | Methods section |

### By Role

**Project Manager**
1. IMPLEMENTATION_SUMMARY.md
2. SETUP_COMPLETE.md

**Frontend Developer**
1. QUICK_REFERENCE.md
2. API_REFERENCE.md

**Full-Stack Developer**
1. DATA_STRUCTURE.md
2. API_REFERENCE.md
3. SETUP_COMPLETE.md (Next Steps section)

**DevOps/Backend**
1. DATA_STRUCTURE.md (Backend Integration)
2. SETUP_COMPLETE.md (Optional next steps)

---

## 📁 File Locations

### Data Files
- `data/points.json` - Centralized scoring rules

### JavaScript Files
- `js/storage.js` - Storage manager (core system)
- `js/quarterbacks.js` - QB CRUD operations
- `js/running-backs.js` - RB/WR CRUD operations
- `js/kickers.js` - Kickers CRUD operations
- `js/defense.js` - Defense CRUD operations

### HTML Pages
- `quarterbacks.html` - Manage QB rules
- `running-backs.html` - Manage RB/WR rules
- `kickers.html` - Manage Kicker rules
- `defense.html` - Manage Defense rules
- `points-system.html` - Overview page

### Styling
- `css/styles.css` - Main stylesheet
- `css/crud.css` - CRUD operation styles

---

## 🔑 Key Concepts

### Storage Classes
The system uses object-oriented design with inheritance:
- `StorageManager` (base class)
- `QuarterbacksStorage` (inherits from StorageManager)
- `RunningBacksStorage` (inherits from StorageManager)
- `KickersStorage` (inherits from StorageManager)
- `DefenseStorage` (inherits from StorageManager)

### Dual Storage
- **localStorage** - Fast cache, immediate updates
- **points.json** - Source of truth, shared across systems

### CRUD Operations
- **Create** - `addRule()`
- **Read** - `getRules()`, `getRule()`
- **Update** - `updateRule()`
- **Delete** - `deleteRule()`

### Rule Types
- **normal** - Standard scoring rules
- **bonus** - Bonus point rules
- **negative** - Penalty rules

---

## 📊 Data Overview

### Positions and Rule Counts
| Position | Rules | File |
|----------|-------|------|
| Quarterbacks | 7 | quarterbacks.html |
| Running Backs | 8 | running-backs.html |
| Kickers | 6 | kickers.html |
| Defense | 5 | defense.html |
| **Total** | **26** | **points.json** |

---

## ⚡ Quick Links

### To use the system:
1. Open any HTML page (quarterbacks.html, etc.)
2. Use the form to add rules
3. View, edit, or delete rules
4. Changes persist automatically

### To integrate with backend:
See DATA_STRUCTURE.md → Backend Integration section

### To add new features:
See SETUP_COMPLETE.md → Next Steps section

### To troubleshoot:
See API_REFERENCE.md → Error Handling section

---

## 🆘 Support

For questions about:
- **Data structure** → DATA_STRUCTURE.md
- **API methods** → API_REFERENCE.md or QUICK_REFERENCE.md
- **Implementation** → IMPLEMENTATION_SUMMARY.md
- **Setup/next steps** → SETUP_COMPLETE.md

---

## 📝 Document Versions

All documents created: **December 21, 2025**

| File | Purpose | Status |
|------|---------|--------|
| IMPLEMENTATION_SUMMARY.md | Project completion summary | ✅ Complete |
| SETUP_COMPLETE.md | Setup details | ✅ Complete |
| QUICK_REFERENCE.md | Quick API reference | ✅ Complete |
| DATA_STRUCTURE.md | Technical architecture | ✅ Complete |
| API_REFERENCE.md | Complete API docs | ✅ Complete |
| README.md (this file) | Documentation index | ✅ Complete |

---

## 🎓 Learning Path

**Beginner (Just want to use it):**
1. QUICK_REFERENCE.md → Common Operations
2. Open any HTML page and try it

**Intermediate (Want to understand it):**
1. SETUP_COMPLETE.md
2. DATA_STRUCTURE.md
3. Try modifying rules on HTML pages

**Advanced (Want to extend it):**
1. DATA_STRUCTURE.md (all sections)
2. API_REFERENCE.md (all sections)
3. Study js/storage.js source code
4. Follow "Next Steps" in SETUP_COMPLETE.md

---

## ✅ System Status

- **Status:** Production Ready
- **Data:** Centralized in points.json
- **CRUD:** Fully implemented
- **Testing:** Ready for testing
- **Documentation:** Complete
- **Deployment:** Ready to deploy

---

**Need help?** Check the documentation index at the top of this file, then refer to the appropriate guide for your needs.
