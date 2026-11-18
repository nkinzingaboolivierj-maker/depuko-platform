const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.resolve(__dirname, "../../../database/migrations");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();

    for (const name of files) {
      const applied = await client.query(
        "SELECT migration_name FROM schema_migrations WHERE migration_name = $1",
        [name],
      );
      if (applied.rowCount) {
        console.log(`[migrations] already applied: ${name}`);
        continue;
      }

      const raw = fs.readFileSync(path.join(migrationsDir, name), "utf8");
      const sql = raw
        .replace(/^\s*BEGIN\s*;\s*/im, "")
        .replace(/\s*COMMIT\s*;\s*$/im, "");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [name],
        );
        await client.query("COMMIT");
        console.log(`[migrations] applied: ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${error.message}`);
      }
    }

    console.log("[migrations] all migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrations] failed:", error);
  process.exit(1);
});
