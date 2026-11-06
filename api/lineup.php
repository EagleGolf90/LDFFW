<?php
// LDFFW lineup endpoint for PHP hosting (production FullTimberStack).
// Mirrors the Node server.js /api/lineup routes and reads/writes
// data/users_lineup.json next to the deployed site.
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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = isset($_GET['user_id']) ? (string) $_GET['user_id'] : '';
    $weekId = isset($_GET['week_id']) ? (string) $_GET['week_id'] : '';
    if ($userId === '' || $weekId === '') {
        respond(400, ['success' => false, 'error' => 'Expected query params: user_id, week_id']);
    }
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
