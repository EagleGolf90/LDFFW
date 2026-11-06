<?php
// LDFFW lineup endpoint for PHP hosting (production FullTimberStack).
// Mirrors the Node server.js /api/lineup routes. Lineups are stored in the
// MySQL table `users_lineup` (one row per user/week/slot with the same
// fields as data/users_lineup.json: user_id, week_id, slot, player_id,
// first_name, last_name, position, nfl_team).
//
// On first use the table is created automatically and seeded from
// data/users_lineup.json. If the database is unreachable, the endpoint
// falls back to reading/writing data/users_lineup.json as before.
//
// DB credentials come from environment variables or a .env file in the
// site root (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).
//
//   GET    api/lineup.php?user_id=<user>&week_id=<week>  -> { success, data: lineup|null }
//   POST   api/lineup.php   body: { user_id, week_id, lineup: { QB: {...}, ... } }
//   DELETE api/lineup.php?user_id=<user>&week_id=<week>

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('LINEUP_FILE', __DIR__ . '/../data/users_lineup.json');

// The nine lineup slots every saved lineup must fill (same as server.js)
const LINEUP_SLOTS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'K', 'DEF'];
const PLAYER_FIELDS = ['player_id', 'first_name', 'last_name', 'position', 'nfl_team'];

function respond($code, $payload)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function encodeLineupData($data)
{
    // JSON_FORCE_OBJECT keeps empty levels as {} instead of [] — the whole
    // structure is objects keyed by user/week/slot, never numeric arrays.
    return json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT
    );
}

// Read the lineup data (returns [] if the file is missing/corrupt)
// Shape: { [user_id]: { [week_id]: { QB: {...}, RB1: {...}, ... } } }
function readLineupData()
{
    if (!is_file(LINEUP_FILE)) {
        return [];
    }
    $data = json_decode((string) file_get_contents(LINEUP_FILE), true);
    return is_array($data) ? $data : [];
}

// Validate a single player entry in a lineup slot (same rules as server.js)
function isValidLineupPlayer($player)
{
    if (!is_array($player)) {
        return false;
    }
    foreach (PLAYER_FIELDS as $field) {
        if (!isset($player[$field]) || !is_string($player[$field]) || trim($player[$field]) === '') {
            return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// MySQL storage (table `users_lineup`)
// ---------------------------------------------------------------------------

// Load DB settings from environment variables, falling back to a .env file
// in the site root. Returns null when no configuration is available.
function loadDbConfig()
{
    $keys = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
    $config = [];
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false && $value !== '') {
            $config[$key] = $value;
        }
    }

    $envFile = __DIR__ . '/../.env';
    if (is_file($envFile)) {
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
                continue;
            }
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (in_array($key, $keys, true) && !isset($config[$key]) && $value !== '') {
                $config[$key] = $value;
            }
        }
    }

    foreach (['DB_HOST', 'DB_USER', 'DB_NAME'] as $required) {
        if (!isset($config[$required])) {
            return null;
        }
    }
    $config['DB_PASSWORD'] = isset($config['DB_PASSWORD']) ? $config['DB_PASSWORD'] : '';
    $config['DB_PORT'] = isset($config['DB_PORT']) ? (int) $config['DB_PORT'] : 3306;
    return $config;
}

// Connect to MySQL and make sure the users_lineup table exists. Returns a
// mysqli handle, or null when the DB is unconfigured/unreachable (callers
// then fall back to the JSON file).
function connectDb()
{
    static $db = false; // false = not attempted yet, null = unavailable
    if ($db !== false) {
        return $db;
    }
    $db = null;

    if (!function_exists('mysqli_connect')) {
        return $db;
    }
    $config = loadDbConfig();
    if ($config === null) {
        return $db;
    }

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @mysqli_connect(
        $config['DB_HOST'],
        $config['DB_USER'],
        $config['DB_PASSWORD'],
        $config['DB_NAME'],
        $config['DB_PORT']
    );
    if (!$conn) {
        error_log('lineup.php: MySQL connection failed: ' . mysqli_connect_error());
        return $db;
    }
    mysqli_set_charset($conn, 'utf8mb4');

    if (!ensureLineupTable($conn)) {
        mysqli_close($conn);
        return $db;
    }

    $db = $conn;
    return $db;
}

// Create the users_lineup table if missing. When the table is created for
// the first time, seed it from data/users_lineup.json (one-time migration).
function ensureLineupTable($conn)
{
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'users_lineup'");
    $exists = $result && mysqli_num_rows($result) > 0;
    if ($result) {
        mysqli_free_result($result);
    }
    if ($exists) {
        return true;
    }

    $created = mysqli_query($conn, "
        CREATE TABLE IF NOT EXISTS users_lineup (
            user_id    VARCHAR(100) NOT NULL,
            week_id    VARCHAR(10)  NOT NULL,
            slot       VARCHAR(10)  NOT NULL,
            player_id  VARCHAR(100) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name  VARCHAR(100) NOT NULL,
            position   VARCHAR(10)  NOT NULL,
            nfl_team   VARCHAR(10)  NOT NULL,
            PRIMARY KEY (user_id, week_id, slot)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    if (!$created) {
        error_log('lineup.php: failed to create users_lineup table: ' . mysqli_error($conn));
        return false;
    }

    migrateJsonToDb($conn);
    return true;
}

// Import every lineup from data/users_lineup.json into the (new) table.
function migrateJsonToDb($conn)
{
    $data = readLineupData();
    if (!is_array($data) || count($data) === 0) {
        return;
    }
    $stmt = mysqli_prepare($conn, '
        INSERT INTO users_lineup
            (user_id, week_id, slot, player_id, first_name, last_name, position, nfl_team)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            player_id = VALUES(player_id), first_name = VALUES(first_name),
            last_name = VALUES(last_name), position = VALUES(position),
            nfl_team = VALUES(nfl_team)
    ');
    if (!$stmt) {
        error_log('lineup.php: migration prepare failed: ' . mysqli_error($conn));
        return;
    }
    foreach ($data as $userId => $weeks) {
        if (!is_array($weeks)) {
            continue;
        }
        foreach ($weeks as $weekId => $lineup) {
            if (!is_array($lineup)) {
                continue;
            }
            foreach (LINEUP_SLOTS as $slot) {
                $p = isset($lineup[$slot]) ? $lineup[$slot] : null;
                if (!isValidLineupPlayer($p)) {
                    continue;
                }
                $userKey = (string) $userId;
                $weekKey = (string) $weekId;
                $playerId = (string) $p['player_id'];
                $firstName = (string) $p['first_name'];
                $lastName = (string) $p['last_name'];
                $position = (string) $p['position'];
                $nflTeam = (string) $p['nfl_team'];
                mysqli_stmt_bind_param(
                    $stmt,
                    'ssssssss',
                    $userKey,
                    $weekKey,
                    $slot,
                    $playerId,
                    $firstName,
                    $lastName,
                    $position,
                    $nflTeam
                );
                mysqli_stmt_execute($stmt);
            }
        }
    }
    mysqli_stmt_close($stmt);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = isset($_GET['user_id']) ? (string) $_GET['user_id'] : '';
    $weekId = isset($_GET['week_id']) ? (string) $_GET['week_id'] : '';
    if ($userId === '' || $weekId === '') {
        respond(400, ['success' => false, 'error' => 'Expected query params: user_id, week_id']);
    }

    $conn = connectDb();
    if ($conn !== null) {
        $stmt = mysqli_prepare($conn, '
            SELECT slot, player_id, first_name, last_name, position, nfl_team
            FROM users_lineup
            WHERE user_id = ? AND week_id = ?
        ');
        if (!$stmt) {
            respond(500, ['success' => false, 'error' => 'Failed to read lineup data']);
        }
        mysqli_stmt_bind_param($stmt, 'ss', $userId, $weekId);
        if (!mysqli_stmt_execute($stmt)) {
            mysqli_stmt_close($stmt);
            respond(500, ['success' => false, 'error' => 'Failed to read lineup data']);
        }
        $result = mysqli_stmt_get_result($stmt);
        $lineup = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $lineup[$row['slot']] = [
                'player_id'  => $row['player_id'],
                'first_name' => $row['first_name'],
                'last_name'  => $row['last_name'],
                'position'   => $row['position'],
                'nfl_team'   => $row['nfl_team'],
            ];
        }
        mysqli_free_result($result);
        mysqli_stmt_close($stmt);

        // Keep slot order stable (QB, RB1, ...) like the JSON file did
        $ordered = null;
        if (count($lineup) > 0) {
            $ordered = [];
            foreach (LINEUP_SLOTS as $slot) {
                if (isset($lineup[$slot])) {
                    $ordered[$slot] = $lineup[$slot];
                }
            }
        }
        respond(200, ['success' => true, 'data' => $ordered]);
    }

    // DB unavailable — fall back to the JSON file
    $data = readLineupData();
    $lineup = $data[$userId][$weekId] ?? null;
    respond(200, ['success' => true, 'data' => $lineup]);
}

if ($method === 'POST') {
    $body = json_decode((string) file_get_contents('php://input'), true);
    $userId = is_array($body) && isset($body['user_id']) ? $body['user_id'] : null;
    $weekId = is_array($body) && isset($body['week_id']) ? $body['week_id'] : null;
    $lineup = is_array($body) && isset($body['lineup']) ? $body['lineup'] : null;

    // Reject JSON arrays — a lineup is an object keyed by slot (QB, RB1, ...),
    // so it never has a numeric 0 key. (Avoids array_is_list for PHP < 8.1.)
    if (!is_string($userId) || trim($userId) === '' ||
        !is_string($weekId) || trim($weekId) === '' ||
        !is_array($lineup) || isset($lineup[0])) {
        respond(400, [
            'success' => false,
            'error' => 'Expected body: { user_id, week_id, lineup: { QB: {...}, RB1: {...}, ... } }'
        ]);
    }

    $savedLineup = [];
    foreach (LINEUP_SLOTS as $slot) {
        $p = $lineup[$slot] ?? null;
        if (!isValidLineupPlayer($p)) {
            respond(400, [
                'success' => false,
                'error' => "Slot '$slot' needs a player with player_id, first_name, last_name, position and nfl_team"
            ]);
        }
        $savedLineup[$slot] = [
            'player_id'  => (string) $p['player_id'],
            'first_name' => (string) $p['first_name'],
            'last_name'  => (string) $p['last_name'],
            'position'   => (string) $p['position'],
            'nfl_team'   => (string) $p['nfl_team'],
        ];
    }

    $userKey = trim($userId);
    $weekKey = trim($weekId);

    $conn = connectDb();
    if ($conn !== null) {
        // Replace the whole user/week lineup atomically
        mysqli_begin_transaction($conn);
        $ok = true;

        $del = mysqli_prepare($conn, 'DELETE FROM users_lineup WHERE user_id = ? AND week_id = ?');
        if ($del) {
            mysqli_stmt_bind_param($del, 'ss', $userKey, $weekKey);
            $ok = mysqli_stmt_execute($del);
            mysqli_stmt_close($del);
        } else {
            $ok = false;
        }

        $ins = $ok ? mysqli_prepare($conn, '
            INSERT INTO users_lineup
                (user_id, week_id, slot, player_id, first_name, last_name, position, nfl_team)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ') : false;
        if ($ins) {
            foreach ($savedLineup as $slot => $p) {
                mysqli_stmt_bind_param(
                    $ins,
                    'ssssssss',
                    $userKey,
                    $weekKey,
                    $slot,
                    $p['player_id'],
                    $p['first_name'],
                    $p['last_name'],
                    $p['position'],
                    $p['nfl_team']
                );
                if (!mysqli_stmt_execute($ins)) {
                    $ok = false;
                    break;
                }
            }
            mysqli_stmt_close($ins);
        } else {
            $ok = false;
        }

        if (!$ok) {
            mysqli_rollback($conn);
            error_log('lineup.php: failed to save lineup: ' . mysqli_error($conn));
            respond(500, ['success' => false, 'error' => 'Failed to save lineup data']);
        }
        mysqli_commit($conn);
        respond(200, [
            'success' => true,
            'message' => 'Lineup saved successfully',
            'data' => $savedLineup
        ]);
    }

    // DB unavailable — fall back to the JSON file.
    // Read-modify-write under an exclusive lock so concurrent saves don't
    // corrupt the file on shared hosting.
    $fp = fopen(LINEUP_FILE, 'c+');
    if ($fp === false || !flock($fp, LOCK_EX)) {
        respond(500, ['success' => false, 'error' => 'Failed to save lineup data']);
    }
    $raw = stream_get_contents($fp);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        $data = [];
    }
    if (!isset($data[$userKey]) || !is_array($data[$userKey])) {
        $data[$userKey] = [];
    }
    $data[$userKey][$weekKey] = $savedLineup;

    $ok = ftruncate($fp, 0) && rewind($fp) && fwrite($fp, encodeLineupData($data)) !== false;
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$ok) {
        respond(500, ['success' => false, 'error' => 'Failed to save lineup data']);
    }
    respond(200, [
        'success' => true,
        'message' => 'Lineup saved successfully',
        'data' => $savedLineup
    ]);
}

if ($method === 'DELETE') {
    $userId = isset($_GET['user_id']) ? (string) $_GET['user_id'] : '';
    $weekId = isset($_GET['week_id']) ? (string) $_GET['week_id'] : '';
    if ($userId === '' || $weekId === '') {
        respond(400, ['success' => false, 'error' => 'Expected query params: user_id, week_id']);
    }

    $conn = connectDb();
    if ($conn !== null) {
        $stmt = mysqli_prepare($conn, 'DELETE FROM users_lineup WHERE user_id = ? AND week_id = ?');
        if (!$stmt) {
            respond(500, ['success' => false, 'error' => 'Failed to delete lineup data']);
        }
        mysqli_stmt_bind_param($stmt, 'ss', $userId, $weekId);
        if (!mysqli_stmt_execute($stmt)) {
            mysqli_stmt_close($stmt);
            respond(500, ['success' => false, 'error' => 'Failed to delete lineup data']);
        }
        $affected = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);

        if ($affected === 0) {
            respond(404, [
                'success' => false,
                'error' => "No lineup found for user '$userId' week '$weekId'"
            ]);
        }
        respond(200, ['success' => true, 'message' => 'Lineup deleted successfully']);
    }

    // DB unavailable — fall back to the JSON file
    $fp = fopen(LINEUP_FILE, 'c+');
    if ($fp === false || !flock($fp, LOCK_EX)) {
        respond(500, ['success' => false, 'error' => 'Failed to delete lineup data']);
    }
    $raw = stream_get_contents($fp);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        $data = [];
    }

    if (!isset($data[$userId][$weekId])) {
        flock($fp, LOCK_UN);
        fclose($fp);
        respond(404, [
            'success' => false,
            'error' => "No lineup found for user '$userId' week '$weekId'"
        ]);
    }

    unset($data[$userId][$weekId]);
    if (count($data[$userId]) === 0) {
        unset($data[$userId]);
    }

    $ok = ftruncate($fp, 0) && rewind($fp) && fwrite($fp, encodeLineupData($data)) !== false;
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$ok) {
        respond(500, ['success' => false, 'error' => 'Failed to delete lineup data']);
    }
    respond(200, ['success' => true, 'message' => 'Lineup deleted successfully']);
}

respond(405, ['success' => false, 'error' => "Method $method not allowed"]);
