<?php
require_once __DIR__ . '/../api/lineup-store.php';

function check($condition, $message)
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$conn = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$conn->exec("ATTACH DATABASE ':memory:' AS dbo");
$conn->exec('
    CREATE TABLE dbo.users_lineup (
        user_id TEXT NOT NULL, week_id INTEGER NOT NULL, slot TEXT NOT NULL,
        player_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        position TEXT NOT NULL, nfl_team TEXT NOT NULL,
        PRIMARY KEY (user_id, week_id, slot)
    )
');
$slots = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'K', 'DEF'];
$lineup = [];
foreach ($slots as $slot) {
    $lineup[$slot] = [
        'player_id' => 'player-' . $slot,
        'first_name' => 'Test',
        'last_name' => $slot,
        'position' => preg_replace('/[0-9]/', '', $slot),
        'nfl_team' => 'TEST'
    ];
}
$owner = "Test O'Owner";
check(loadDbLineup($conn, $owner, '11') === null, 'Unsaved week should be null');
saveDbLineup($conn, $owner, '11', $lineup);
$nextWeek = $lineup;
$nextWeek['QB']['player_id'] = 'next-week-QB';
saveDbLineup($conn, $owner, '12', $nextWeek);
saveDbLineup($conn, 'Other Owner', '12', $lineup);
check(loadDbLineup($conn, $owner, '11') == $lineup, 'Week 11 changed when saving week 12');
check(loadDbLineup($conn, $owner, '12') == $nextWeek, 'Week 12 was not saved');
check(loadDbLineup($conn, 'Other Owner', '12') == $lineup, 'Owners must be independent');

$nextWeek['RB1']['player_id'] = 'replacement-RB';
saveDbLineup($conn, $owner, '12', $nextWeek);
check(loadDbLineup($conn, $owner, '12') == $nextWeek, 'Replacing a saved week failed');
check((int) $conn->query('SELECT COUNT(*) FROM dbo.users_lineup')->fetchColumn() === 27,
    'Each owner/week must have exactly nine rows');

$conn->exec("
    CREATE TRIGGER dbo.reject_test_player BEFORE INSERT ON users_lineup
    WHEN NEW.player_id = 'reject'
    BEGIN SELECT RAISE(ABORT, 'Simulated insert failure'); END
");
$invalid = $lineup;
$invalid['WR3']['player_id'] = 'reject';
$failed = false;
try {
    saveDbLineup($conn, $owner, '12', $invalid);
} catch (PDOException $error) {
    $failed = true;
}
check($failed, 'Insert failure was not propagated');
check(!$conn->inTransaction(), 'Failed save left a transaction open');
check(loadDbLineup($conn, $owner, '12') == $nextWeek, 'Failed save did not restore the previous lineup');
check(deleteDbLineup($conn, $owner, '12'), 'Existing week was not deleted');
check(loadDbLineup($conn, $owner, '12') === null, 'Deleted week still exists');
check(loadDbLineup($conn, $owner, '11') == $lineup, 'Deleting week 12 changed week 11');
check(loadDbLineup($conn, 'Other Owner', '12') == $lineup, 'Deleting a week affected another owner');
check(!deleteDbLineup($conn, $owner, '12'), 'Missing lineup should not report deletion');

echo "PASS: week/owner isolation, nine slots, replacement, rollback, and deletion\n";
