# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

LDFFW Points System: a small vanilla HTML/CSS/JS site for managing fantasy-football scoring rules per position (quarterbacks, running backs/WR, kickers, defense). There is no build step, bundler, framework, linter, or test suite.

## Running locally

- **With persistence (recommended):** `npm install`, then `npm start` (runs `node server.js`) → http://localhost:3000 (override with `PORT`). The Express server serves the repo root as static files and exposes the `/api/*` endpoints that write `data/points.json`. `package-lock.json` is gitignored.
- **Deployment:** `.github/workflows/deploy.yml` uploads the whole repo via FTP to FullTimberStack shared hosting (`kdga/ldffw/`) on push to `main`/`develop`. The host runs PHP, not Node, so the only live endpoint there is `api/lineup.php`; points-rule edits on production still only persist to the browser's `localStorage`. `data/users_lineup.json` is excluded from the FTP sync so deploys never overwrite/delete lineups saved on the server.

## Architecture

**Data:** `data/points.json` is the source of truth, keyed by position: `quarterbacks`, `runningBacks`, `kickers`, `defense`. Each value is an array of rules `{ id, description, points, type, createdAt, updatedAt? }`, where `type` is `normal | bonus | negative`. `server.js` rejects any top-level key outside those four.

**Lineups:** `data/users_lineup.json` stores saved lineups as nested JSON keyed by user then week then slot: `{ "<user_id>": { "<week_id>": { "QB": {...}, "RB1": {...}, "RB2": {...}, "WR1": {...}, "WR2": {...}, "WR3": {...}, "TE": {...}, "K": {...}, "DEF": {...} } } }`, where each slot holds `{ player_id, first_name, last_name, position, nfl_team }`. `data/players.json` is a bundled static NFL player pool (`{ players: [...] }`, positions `QB | RB | WR | TE | K | DEF`; DEF rows are team defenses). `lineup.html` is a standalone React page (React 18 UMD + `@babel/standalone@7` via CDN, JSX in a `type="text/babel"` script — no build step) that lets a user pick 1 QB, 2 RB, 3 WR, 1 TE, 1 K, 1 DEF per week. Its lineup API target depends on the host: served from port 3000 → same-origin Node routes; served from `localhost`/`127.0.0.1`/`file:` otherwise (Live Server) → `http://localhost:3000/`; any other host (production) → `api/lineup.php` (a PHP port of the same routes, using `?user_id=&week_id=` query params for GET/DELETE). On save/load failure it falls back to a localStorage mirror of the same nested structure under the `users_lineup` key. Server endpoints: `GET /api/lineup/:userId/:weekId` (returns the slot object or `null`), `POST /api/lineup` (body `{ user_id, week_id, lineup: { QB: {...}, ... } }`, requires all nine slots, replaces that user/week's lineup), `DELETE /api/lineup/:userId/:weekId`.

**Per-position page pattern:** each position has an HTML page (`quarterbacks.html`, `running-backs.html`, `kickers.html`, `defense.html`) that loads three scripts in order via plain `<script>` tags (globals, no modules):
1. `js/pointsLoader.js`: `PointsLoader`, static read-only helpers (fetch/display/stats).
2. `js/storage.js`: `StorageManager` base class plus one subclass per position (`QuarterbacksStorage`, etc.), each binding a localStorage key (e.g. `quarterbacks_rules`) to a points.json key and supplying hardcoded `getDefaultRules()`.
3. `js/<position>.js`: page-specific CRUD UI that instantiates the storage subclass. These four files are near-duplicates; a UI change usually has to be made in all four.

`points-system.html` is the read-only overview page, with its own inline script that fetches `data/points.json` directly.

**Dual storage flow (`StorageManager`):**
- On construction, if the position's localStorage key is empty, it seeds from `points.json`, or from `getDefaultRules()` if that fetch fails. After that, **localStorage is what the UI reads**; `points.json` is not re-read, so server-side changes won't show until localStorage is cleared.
- `addRule` / `updateRule` / `deleteRule` write localStorage synchronously, then fire-and-forget `saveToJSON()`, which POSTs the full rule array to the hardcoded `http://localhost:3000/api/save-points/<jsonKey>`. If that fails it logs a warning and still returns success.
- New rule IDs are `Date.now().toString()`; seed IDs are `"1"`, `"2"`, ...

**Backend (`server.js`):** synchronous `fs` read/modify/write of `points.json`. Endpoints: `GET /api/points`, `GET /api/points/:position`, `POST /api/save-points` (whole file), `POST /api/save-points/:position` (body `{ rules: [...] }`), `DELETE /api/points/:position/:id`, `GET /api/config`, `GET /api/health`.

**Commissioner access (`js/access.js` + `data/config.json`):** the four position pages are commissioner-only for editing. `data/config.json` is the config "table" (`{ "commissioners": ["..."] }`). On page load, `AccessControl` fetches `api/config` (falling back to `data/config.json` on static hosting), prompts for a user id (remembered in localStorage key `ldffw_user`), and compares it case-insensitively against `commissioners`. Non-commissioners get `body.read-only`, which hides the `.commissioner-only` add-rule section and `.rule-actions` via CSS in `css/crud.css` — this is honor-system UI gating only; the API endpoints are not authenticated.

## Gotchas

- `storage.js` and `pointsLoader.js` fetch `../data/points.json` (relative to the page), while `points-system.html` fetches `data/points.json`. The `../` form only works when the site is served from the domain root; under a GitHub Pages project path (`/<repo>/`) it resolves outside the site.
- Adding a new position means updating: `validatePointsData` in `server.js`, a new `StorageManager` subclass, a new page + JS file, nav links in every page, and the overview page's rendering.
- `documentation/` has many overlapping, AI-generated status/summary docs. Treat the code as authoritative where they disagree.
