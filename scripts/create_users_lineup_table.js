// One-off migration: creates the users_lineup table on the production SQL Server
// and loads it from data/users_lineup.json. Credentials come from .env.
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

(async () => {
  const root = path.join(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'users_lineup.json'), 'utf8'));

  const pool = await sql.connect({
    server: env.DB_HOST,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    port: 1433,
    options: { encrypt: true, trustServerCertificate: true },
  });

  await pool.request().query(`
    IF OBJECT_ID('dbo.users_lineup', 'U') IS NULL
    CREATE TABLE dbo.users_lineup (
      user_id    NVARCHAR(100) NOT NULL,
      week_id    INT           NOT NULL,
      slot       NVARCHAR(10)  NOT NULL,
      player_id  NVARCHAR(100) NOT NULL,
      first_name NVARCHAR(100) NOT NULL,
      last_name  NVARCHAR(100) NOT NULL,
      position   NVARCHAR(10)  NOT NULL,
      nfl_team   NVARCHAR(10)  NOT NULL,
      created_at DATETIME2     NOT NULL CONSTRAINT DF_users_lineup_created_at DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2     NULL,
      CONSTRAINT PK_users_lineup PRIMARY KEY (user_id, week_id, slot)
    );
  `);
  console.log('Table dbo.users_lineup ensured.');

  let rows = 0;
  for (const [userId, weeks] of Object.entries(data)) {
    for (const [weekId, lineup] of Object.entries(weeks)) {
      for (const [slot, p] of Object.entries(lineup)) {
        await pool
          .request()
          .input('user_id', sql.NVarChar(100), userId)
          .input('week_id', sql.Int, parseInt(weekId, 10))
          .input('slot', sql.NVarChar(10), slot)
          .input('player_id', sql.NVarChar(100), p.player_id)
          .input('first_name', sql.NVarChar(100), p.first_name)
          .input('last_name', sql.NVarChar(100), p.last_name)
          .input('position', sql.NVarChar(10), p.position)
          .input('nfl_team', sql.NVarChar(10), p.nfl_team)
          .query(`
            MERGE dbo.users_lineup AS t
            USING (SELECT @user_id AS user_id, @week_id AS week_id, @slot AS slot) AS s
              ON t.user_id = s.user_id AND t.week_id = s.week_id AND t.slot = s.slot
            WHEN MATCHED THEN UPDATE SET
              player_id = @player_id, first_name = @first_name, last_name = @last_name,
              position = @position, nfl_team = @nfl_team, updated_at = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (user_id, week_id, slot, player_id, first_name, last_name, position, nfl_team)
              VALUES (@user_id, @week_id, @slot, @player_id, @first_name, @last_name, @position, @nfl_team);
          `);
        rows++;
      }
    }
  }
  console.log(`Upserted ${rows} rows.`);

  const check = await pool.request().query(
    'SELECT user_id, week_id, COUNT(*) AS slots FROM dbo.users_lineup GROUP BY user_id, week_id ORDER BY user_id, week_id'
  );
  console.table(check.recordset);
  await pool.close();
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
