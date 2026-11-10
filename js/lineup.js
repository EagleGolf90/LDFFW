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

// How the lineup API is reached depends on where the page is served from:
// - Node backend via `npm start` (:3000): same-origin Express routes.
// - Local static hosting (Live Server on :5500, file://): talk to the local
//   Node backend directly — it allows CORS.
// - Production (FTP/PHP hosting): api/lineup.php reads/writes SQL Server.
const NODE_HOSTED = window.location.port === "3000";
const LOCAL_DEV =
  !NODE_HOSTED &&
  (["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    window.location.protocol === "file:");

function lineupLoadUrl(user, week) {
  const u = encodeURIComponent(user);
  const w = encodeURIComponent(week);
  if (NODE_HOSTED) return `api/lineup/${u}/${w}`;
  if (LOCAL_DEV) return `http://localhost:3000/api/lineup/${u}/${w}`;
  return `api/lineup.php?user_id=${u}&week_id=${w}`;
}

function lineupSaveUrl() {
  if (NODE_HOSTED) return "api/lineup";
  if (LOCAL_DEV) return "http://localhost:3000/api/lineup";
  return "api/lineup.php";
}

const emptyLineup = () =>
  SLOTS.reduce((acc, slot) => ({ ...acc, [slot.id]: null }), {});

function playerName(p) {
  return `${p.first_name} ${p.last_name}`;
}

function getKickoff(game) {
  if (!game.game_date || !game.start_time) return null;
  const kickoff = new Date(`${game.game_date}T${game.start_time}`);
  return Number.isNaN(kickoff.getTime()) ? null : kickoff;
}

function formatWeekDates(games) {
  const dates = games
    .map((game) => game.game_date)
    .filter(Boolean)
    .map((date) => {
      const [year, month, day] = date.split("-").map(Number);
      return new Date(year, month - 1, day);
    })
    .sort((a, b) => a - b);
  if (dates.length === 0) return "Dates TBD";

  const format = (date) =>
    date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dates[0].toDateString() === dates[dates.length - 1].toDateString()
    ? format(dates[0])
    : `${format(dates[0])} - ${format(dates[dates.length - 1])}`;
}

// Pick the week whose first/last game dates contain today; otherwise the
// next upcoming week, or the final week once the season is over.
function findDefaultWeek(games) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byWeek = {};
  games.forEach((game) => {
    const week = Number(game.week);
    if (!Number.isFinite(week) || !game.game_date) return;
    const [year, month, day] = game.game_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return;
    if (!byWeek[week]) {
      byWeek[week] = { start: date, end: date };
    } else {
      if (date < byWeek[week].start) byWeek[week].start = date;
      if (date > byWeek[week].end) byWeek[week].end = date;
    }
  });
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);
  if (weeks.length === 0) return null;
  const current = weeks.find((w) => today <= byWeek[w].end);
  return String(current !== undefined ? current : weeks[weeks.length - 1]);
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
function PlayerPicker({ slot, player, options, onSelect, onClear, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

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
    if (disabled) return;
    onSelect(p);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="picker" ref={wrapRef}>
      <button
        type="button"
        className={"picker-field" + (player ? " has-player" : "")}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
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
          {player && !disabled && (
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

      {open && !disabled && (
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
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [userId, setUserId] = useState("");
  const [weekId, setWeekId] = useState("1");
  const [lineup, setLineup] = useState(emptyLineup());
  const [status, setStatus] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);
  const weekTouchedRef = useRef(false); // true once the user picks a week manually
  const lineupKey = JSON.stringify([userId.trim(), weekId]);
  const lineupLoading = userId.trim() !== "" && loadedFor !== lineupKey;

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

  useEffect(() => {
    fetch("data/nfl_schedules.json", {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Schedule data is empty or invalid");
        }
        setSchedule(data);
        // Default the Week dropdown to today's week in the latest season
        const seasons = data
          .map((game) => Number(game.season))
          .filter(Number.isFinite);
        const season = seasons.length ? Math.max(...seasons) : null;
        const defaultWeek = findDefaultWeek(
          data.filter((game) => Number(game.season) === season),
        );
        if (defaultWeek && !weekTouchedRef.current) setWeekId(defaultWeek);
      })
      .catch((err) => {
        console.error("Could not load nfl_schedules.json:", err);
        setScheduleError(
          "Could not load the NFL schedule (data/nfl_schedules.json). Lineups are read-only until the schedule is available.",
        );
      })
      .finally(() => setScheduleLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const scheduleSeason = useMemo(() => {
    const seasons = schedule
      .map((game) => Number(game.season))
      .filter(Number.isFinite);
    return seasons.length ? Math.max(...seasons) : null;
  }, [schedule]);
  const seasonGames = useMemo(
    () => schedule.filter((game) => Number(game.season) === scheduleSeason),
    [schedule, scheduleSeason],
  );
  const weekGames = useMemo(
    () => seasonGames.filter((game) => Number(game.week) === Number(weekId)),
    [seasonGames, weekId],
  );
  const weekDeadline = useMemo(
    () =>
      weekGames
        .map(getKickoff)
        .filter(Boolean)
        .sort((a, b) => a - b)[0] || null,
    [weekGames],
  );
  const readOnly =
    scheduleLoading ||
    Boolean(scheduleError) ||
    (weekDeadline && currentTime >= weekDeadline.getTime());

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
    setLineup(emptyLineup());
    setLoadedFor(null);
    if (!user) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      let saved = null;
      let serverAnswered = false;
      let loadFailure = null;
      try {
        const res = await fetch(lineupLoadUrl(user, weekId));
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload.error || `HTTP ${res.status}`);
        }
        serverAnswered = true;
        saved = payload.data; // lineup object or null
      } catch (e) {
        console.warn("Could not load lineup from server:", e);
        loadFailure = e.message;
      }
      if (!serverAnswered) {
        const local = readLocalData();
        saved = (local[user] && local[user][weekId]) || null;
      }
      if (!cancelled) {
        const found = applySaved(saved);
        setLoadedFor(JSON.stringify([user, weekId]));
        if (loadFailure) {
          setStatus({
            type: "warning",
            text: `Could not load the server lineup: ${loadFailure} ${found ? "Showing a browser-only copy." : "No browser copy found."}`,
          });
        } else if (found) {
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
  const canSave =
    complete && userId.trim() !== "" && !saving && !readOnly && !lineupLoading;

  const handleSave = async () => {
    const user = userId.trim();
    if (!canSave || readOnly) return;
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

    let saveStatus;
    try {
      const res = await fetch(lineupSaveUrl(), {
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
      if (!NODE_HOSTED && !LOCAL_DEV && payload.storage !== "sqlserver") {
        throw new Error(
          "The server did not confirm a SQL Server save. Deploy the updated lineup API.",
        );
      }
      saveStatus = {
        type: "success",
        text: `Lineup saved to ${payload.storage === "sqlserver" ? "SQL Server" : "the server"} for ${user} — week ${weekId}. ✔`,
      };
    } catch (err) {
      console.warn(
        "Could not save to server, using localStorage fallback:",
        err,
      );
      saveStatus = {
        type: "warning",
        text: `Not saved to the database: ${err.message}`,
      };
    }
    try {
      writeLocalLineup(user, weekId, slots);
      if (saveStatus.type === "warning") {
        saveStatus.text += " Lineup saved to this browser only.";
      }
    } catch (err) {
      console.error("Could not save browser lineup backup:", err);
      saveStatus = {
        type: saveStatus.type === "success" ? "warning" : "error",
        text: `${saveStatus.text} Browser backup also failed.`,
      };
    } finally {
      setStatus(saveStatus);
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    if (readOnly || saving || lineupLoading) return;
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
        {/* <nav className="position-nav">
          <a href="index.html" className="nav-link">
            Home
          </a>
          <a href="points-system.html" className="nav-link">
            Points Overview
          </a>
          <a href="quarterbacks.html" className="nav-link">
            Quarterbacks
          </a>
          <a href="running-backs.html" className="nav-link">
            Running Backs/WR
          </a>
          <a href="kickers.html" className="nav-link">
            Kickers
          </a>
          <a href="defense.html" className="nav-link">
            Defense/Special Teams
          </a>
          <a href="lineup.html" className="nav-link active">
            My Lineup
          </a>
        </nav> */}
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
              disabled={saving}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="week-id">Week</label>
            <select
              id="week-id"
              value={weekId}
              disabled={saving}
              onChange={(e) => {
                weekTouchedRef.current = true;
                setWeekId(e.target.value);
              }}
            >
              {WEEKS.map((w) => {
                const games = seasonGames.filter(
                  (game) => Number(game.week) === Number(w),
                );
                return (
                  <option key={w} value={w}>
                    Week {w} ({formatWeekDates(games)})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        {scheduleError ? (
          <div className="status status-error">{scheduleError}</div>
        ) : scheduleLoading ? (
          <div className="status status-warning">Loading NFL schedule…</div>
        ) : weekDeadline && currentTime >= weekDeadline.getTime() ? (
          <div className="status status-warning">
            This week’s deadline has passed. The lineup is read-only.
          </div>
        ) : weekDeadline ? (
          <div className="status status-warning">
            Lineup locks at {weekDeadline.toLocaleString()}.
          </div>
        ) : (
          <div className="status status-warning">
            Kickoff time has not been announced. This lineup is currently
            editable.
          </div>
        )}
      </div>

      {lineupLoading && (
        <div className="status status-warning">Loading the selected week's lineup…</div>
      )}

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
                  disabled={readOnly || saving || lineupLoading}
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
              disabled={readOnly || saving || lineupLoading}
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
                readOnly
                  ? "This week's lineup is read-only"
                  : lineupLoading
                    ? "Wait for the selected week's lineup to load"
                    : !userId.trim()
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
          LDFFW Points System | Production lineups are saved to SQL Server.
          Browser-only backups are not database saves.
        </p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
