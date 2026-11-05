const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Lineup structure: 1 QB, 2 RB, 3 WR, 1 TE, 1 K, 1 DEF team
const SLOTS = [
  { id: "QB", label: "Quarterback", position: "QB" },
  { id: "RB1", label: "Running Back 1", position: "RB" },
  { id: "RB2", label: "Running Back 2", position: "RB" },
  { id: "WR1", label: "Wide Receiver 1", position: "WR" },
  { id: "WR2", label: "Wide Receiver 2", position: "WR" },
  { id: "WR3", label: "Wide Receiver 3", position: "WR" },
  { id: "TE", label: "Tight End", position: "TE" },
  { id: "K", label: "Kicker", position: "K" },
  { id: "DEF", label: "Defense / ST", position: "DEF" },
];

const WEEKS = Array.from({ length: 18 }, (_, i) => String(i + 1));
const LOCAL_KEY = "users_lineup"; // offline fallback copy of data/users_lineup.json

// When the page isn't served by the Node backend (e.g. Live Server on :5500,
// GitHub Pages), talk to the local backend directly — it allows CORS.
const API_BASE =
  window.location.port === "3000" ? "" : "http://localhost:3000/";

const emptyLineup = () =>
  SLOTS.reduce((acc, slot) => ({ ...acc, [slot.id]: null }), {});

function playerName(p) {
  return `${p.first_name} ${p.last_name}`;
}

// Local fallback mirrors the JSON file: { [user_id]: { [week_id]: { QB: {...}, ... } } }
function readLocalData() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (e) {
    return {};
  }
}

function writeLocalLineup(userId, weekId, slots) {
  const data = readLocalData();
  if (!data[userId]) data[userId] = {};
  data[userId][weekId] = slots;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

// Searchable player dropdown for one lineup slot
function PlayerPicker({ slot, player, options, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    searchRef.current && searchRef.current.focus();
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (p) =>
        playerName(p).toLowerCase().includes(q) ||
        p.nfl_team.toLowerCase().includes(q),
    );
  }, [options, query]);

  const choose = (p) => {
    onSelect(p);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="picker" ref={wrapRef}>
      <button
        type="button"
        className={"picker-field" + (player ? " has-player" : "")}
        onClick={() => setOpen((o) => !o)}
      >
        {player ? (
          <span className="picked-player">
            <span className="team-chip">{player.nfl_team}</span>
            <span className="picked-name">{playerName(player)}</span>
          </span>
        ) : (
          <span>
            Select a {slot.position === "DEF" ? "defense" : "player"}…
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {player && (
            <span
              className="clear-btn"
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setOpen(false);
              }}
            >
              ✕
            </span>
          )}
          <span className="caret">▼</span>
        </span>
      </button>

      {open && (
        <div className="dropdown">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search name or team…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="dropdown-list">
            {filtered.length === 0 ? (
              <div className="dropdown-empty">No available players match.</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.player_id}
                  type="button"
                  className="dropdown-item"
                  onClick={() => choose(p)}
                >
                  <span>{playerName(p)}</span>
                  <span className="team-chip">{p.nfl_team}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [players, setPlayers] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [userId, setUserId] = useState("");
  const [weekId, setWeekId] = useState("1");
  const [lineup, setLineup] = useState(emptyLineup());
  const [status, setStatus] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);

  // Load the bundled player pool
  useEffect(() => {
    fetch("data/players.json", {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) =>
        setPlayers(Array.isArray(data.players) ? data.players : []),
      )
      .catch((err) => {
        console.error("Could not load players.json:", err);
        setLoadError("Could not load the NFL player list (data/players.json).");
      });
  }, []);

  const applySaved = useCallback((saved) => {
    const next = emptyLineup();
    let found = false;
    SLOTS.forEach((slot) => {
      const p = saved && saved[slot.id];
      if (p && p.player_id) {
        found = true;
        next[slot.id] = {
          player_id: p.player_id,
          first_name: p.first_name,
          last_name: p.last_name,
          position: p.position,
          nfl_team: p.nfl_team,
        };
      }
    });
    setLineup(next);
    return found;
  }, []);

  // Load any saved lineup when the manager name or week changes
  useEffect(() => {
    const user = userId.trim();
    setStatus(null);
    if (!user) {
      setLineup(emptyLineup());
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      let saved = null;
      let serverAnswered = false;
      try {
        const res = await fetch(
          `${API_BASE}api/lineup/${encodeURIComponent(user)}/${encodeURIComponent(weekId)}`,
        );
        if (res.ok) {
          const payload = await res.json();
          if (payload.success) {
            serverAnswered = true;
            saved = payload.data; // lineup object or null
          }
        }
      } catch (e) {
        // Backend unavailable (e.g. GitHub Pages) — fall back to localStorage
      }
      if (!serverAnswered) {
        const local = readLocalData();
        saved = (local[user] && local[user][weekId]) || null;
      }
      if (!cancelled) {
        const found = applySaved(saved);
        if (found) {
          setStatus({
            type: "success",
            text: `Loaded saved lineup for ${user} — week ${weekId}.`,
          });
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, weekId, applySaved]);

  const pickedIds = useMemo(() => {
    const ids = new Set();
    Object.values(lineup).forEach((p) => {
      if (p) ids.add(p.player_id);
    });
    return ids;
  }, [lineup]);

  const optionsFor = useCallback(
    (slot) =>
      players.filter(
        (p) =>
          p.position === slot.position &&
          (!pickedIds.has(p.player_id) ||
            (lineup[slot.id] && lineup[slot.id].player_id === p.player_id)),
      ),
    [players, pickedIds, lineup],
  );

  const filledCount = Object.values(lineup).filter(Boolean).length;
  const complete = filledCount === SLOTS.length;
  const canSave = complete && userId.trim() !== "" && !saving;

  const handleSave = async () => {
    const user = userId.trim();
    if (!canSave) return;
    setSaving(true);
    setStatus(null);

    const slots = {};
    SLOTS.forEach((slot) => {
      const p = lineup[slot.id];
      slots[slot.id] = {
        player_id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position,
        nfl_team: p.nfl_team,
      };
    });

    try {
      const res = await fetch(`${API_BASE}api/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user,
          week_id: weekId,
          lineup: slots,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      writeLocalLineup(user, weekId, slots);
      setStatus({
        type: "success",
        text: `Lineup saved to data/users_lineup.json for ${user} — week ${weekId}. ✔`,
      });
    } catch (err) {
      console.warn(
        "Could not save to server, using localStorage fallback:",
        err,
      );
      writeLocalLineup(user, weekId, slots);
      setStatus({
        type: "warning",
        text: "Server unavailable — lineup saved to this browser only. Run `npm start` to persist to data/users_lineup.json.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    setLineup(emptyLineup());
    setStatus(null);
  };

  return (
    <div className="container">
      <header>
        <h1>My Lineup</h1>
        <p className="subtitle">
          Louisville Deaf Fantasy Football Weekly — set your weekly roster
        </p>
        <nav className="position-nav">
          <a href="index.html" className="nav-link">
            Home
          </a>
          <a href="lineup.html" className="nav-link active">
            My Lineup
          </a>
        </nav>
      </header>

      <div className="panel">
        <div className="panel-title">Owner &amp; Week</div>
        <div className="meta-grid">
          <div>
            <label htmlFor="user-id">Owner (full name)</label>
            <input
              id="user-id"
              type="text"
              placeholder="e.g. kevin"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="week-id">Week</label>
            <select
              id="week-id"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
            >
              {WEEKS.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          Starting Lineup — 1 QB · 2 RB · 3 WR · 1 TE · 1 K · 1 DEF
        </div>
        {loadError ? (
          <div className="status status-error">{loadError}</div>
        ) : (
          <div className="slots-grid">
            {SLOTS.map((slot) => (
              <div
                key={slot.id}
                className={"slot" + (lineup[slot.id] ? " filled" : "")}
              >
                <div className="slot-head">
                  <span className={"pos-badge pos-" + slot.position}>
                    {slot.position}
                  </span>
                  <span className="slot-label">{slot.label}</span>
                </div>
                <PlayerPicker
                  slot={slot}
                  player={lineup[slot.id]}
                  options={optionsFor(slot)}
                  onSelect={(p) =>
                    setLineup((prev) => ({ ...prev, [slot.id]: p }))
                  }
                  onClear={() =>
                    setLineup((prev) => ({ ...prev, [slot.id]: null }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="progress-wrap">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${(filledCount / SLOTS.length) * 100}%`,
                }}
              ></div>
            </div>
            <span className="progress-text">
              {filledCount} / {SLOTS.length} slots filled
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClearAll}
            >
              Clear All
            </button>
            <button
              type="button"
              className="btn btn-save"
              disabled={!canSave}
              onClick={handleSave}
              title={
                !userId.trim()
                  ? "Enter a manager name first"
                  : !complete
                    ? "Fill all 9 lineup slots to save"
                    : "Save lineup"
              }
            >
              {saving ? "Saving…" : "Save Lineup"}
            </button>
          </div>
        </div>
        {status && (
          <div className={"status status-" + status.type}>{status.text}</div>
        )}
      </div>

      <footer>
        <p>
          LDFFW Points System | Lineups are stored as JSON in
          data/users_lineup.json
        </p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
