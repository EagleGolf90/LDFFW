<?php

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
        if (empty($config[$required])) {
            throw new RuntimeException("Missing database setting: $required");
        }
    }
    $config['DB_PASSWORD'] = $config['DB_PASSWORD'] ?? '';
    $config['DB_PORT'] = $config['DB_PORT'] ?? '1433';
    if (!ctype_digit($config['DB_PORT']) ||
        (int) $config['DB_PORT'] < 1 || (int) $config['DB_PORT'] > 65535) {
        throw new RuntimeException('Invalid SQL Server port');
    }
    return $config;
}

function connectLineupDb()
{
    if (!class_exists('PDO') || !in_array('sqlsrv', PDO::getAvailableDrivers(), true)) {
        throw new RuntimeException('The PHP pdo_sqlsrv driver is not installed');
    }
    $config = loadDbConfig();
    return new PDO(
        'sqlsrv:Server=' . $config['DB_HOST'] . ',' . $config['DB_PORT'] .
        ';Database=' . $config['DB_NAME'] . ';Encrypt=yes;TrustServerCertificate=no',
        $config['DB_USER'],
        $config['DB_PASSWORD'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
}

function loadDbLineup(PDO $conn, $userId, $weekId)
{
    $stmt = $conn->prepare('
        SELECT slot, player_id, first_name, last_name, position, nfl_team
        FROM dbo.users_lineup WHERE user_id = ? AND week_id = ?
    ');
    $stmt->execute([$userId, $weekId]);
    $lineup = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $slot = $row['slot'];
        unset($row['slot']);
        $lineup[$slot] = $row;
    }
    return $lineup ?: null;
}

function saveDbLineup(PDO $conn, $userId, $weekId, array $lineup)
{
    $conn->beginTransaction();
    try {
        deleteDbLineup($conn, $userId, $weekId);
        $stmt = $conn->prepare('
            INSERT INTO dbo.users_lineup
                (user_id, week_id, slot, player_id, first_name, last_name, position, nfl_team)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        foreach ($lineup as $slot => $player) {
            $stmt->execute([
                $userId, $weekId, $slot, $player['player_id'], $player['first_name'],
                $player['last_name'], $player['position'], $player['nfl_team']
            ]);
        }
        $conn->commit();
    } catch (PDOException $error) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        throw $error;
    }
}

function deleteDbLineup(PDO $conn, $userId, $weekId)
{
    $stmt = $conn->prepare('DELETE FROM dbo.users_lineup WHERE user_id = ? AND week_id = ?');
    $stmt->execute([$userId, $weekId]);
    return $stmt->rowCount() > 0;
}
