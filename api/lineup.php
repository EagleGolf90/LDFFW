<?php
// Production lineup API: SQL Server dbo.users_lineup, keyed by user/week/slot.
require_once __DIR__ . '/lineup-store.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

const LINEUP_SLOTS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'K', 'DEF'];
const PLAYER_FIELDS = ['player_id', 'first_name', 'last_name', 'position', 'nfl_team'];

function respond($code, $payload)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE, OPTIONS');
    respond(405, ['success' => false, 'error' => "Method $method not allowed"]);
}

$input = $method === 'POST'
    ? json_decode((string) file_get_contents('php://input'), true)
    : $_GET;
$userId = is_array($input) ? ($input['user_id'] ?? null) : null;
$weekId = is_array($input) ? ($input['week_id'] ?? null) : null;
if (!is_string($userId) || trim($userId) === '' ||
    !is_string($weekId) || !preg_match('/^(?:[1-9]|1[0-8])$/', $weekId)) {
    respond(400, ['success' => false, 'error' => 'A user_id and week_id from 1 to 18 are required']);
}
$userId = trim($userId);

if ($method === 'POST') {
    $lineup = $input['lineup'] ?? null;
    if (!is_array($lineup) || isset($lineup[0])) {
        respond(400, ['success' => false, 'error' => 'A lineup object keyed by slot is required']);
    }
    $savedLineup = [];
    foreach (LINEUP_SLOTS as $slot) {
        $player = $lineup[$slot] ?? null;
        foreach (PLAYER_FIELDS as $field) {
            if (!is_array($player) || !isset($player[$field]) ||
                !is_string($player[$field]) || trim($player[$field]) === '') {
                respond(400, [
                    'success' => false,
                    'error' => "Slot '$slot' needs a player with player_id, first_name, last_name, position and nfl_team"
                ]);
            }
            $savedLineup[$slot][$field] = $player[$field];
        }
    }
}

try {
    $conn = connectLineupDb();
} catch (RuntimeException $error) {
    error_log('lineup.php: ' . $error->getMessage());
    respond(503, [
        'success' => false,
        'error' => 'SQL Server is unavailable. Check the server DB settings and PHP pdo_sqlsrv driver. No database changes were saved.'
    ]);
}

try {
    if ($method === 'GET') {
        respond(200, [
            'success' => true,
            'storage' => 'sqlserver',
            'data' => loadDbLineup($conn, $userId, $weekId)
        ]);
    }
    if ($method === 'POST') {
        saveDbLineup($conn, $userId, $weekId, $savedLineup);
        respond(200, [
            'success' => true,
            'storage' => 'sqlserver',
            'message' => 'Lineup saved to SQL Server successfully',
            'data' => $savedLineup
        ]);
    }
    if (!deleteDbLineup($conn, $userId, $weekId)) {
        respond(404, ['success' => false, 'error' => "No lineup found for user '$userId' week '$weekId'"]);
    }
    respond(200, ['success' => true, 'storage' => 'sqlserver', 'message' => 'Lineup deleted successfully']);
} catch (PDOException $error) {
    error_log('lineup.php: database operation failed: ' . $error->getMessage());
    respond(500, [
        'success' => false,
        'error' => 'SQL Server could not complete the lineup request. Check the dbo.users_lineup table and database permissions.'
    ]);
}
