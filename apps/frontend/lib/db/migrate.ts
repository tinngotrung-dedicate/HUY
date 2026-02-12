import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env.local",
});

const shouldSkipMigrations =
  process.env.SKIP_DB_MIGRATIONS === "1" ||
  process.env.SKIP_DB_MIGRATIONS === "true";

const runMigrate = async () => {
  if (shouldSkipMigrations) {
    console.log("⏭️  SKIP_DB_MIGRATIONS enabled, skipping migrations");
    process.exit(0);
  }

  if (!process.env.POSTGRES_URL) {
    console.log("⏭️  POSTGRES_URL not defined, skipping migrations");
    process.exit(0);
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  const message = String(err);
  const code = (err as { code?: string } | null)?.code;
  const shouldSkip =
    shouldSkipMigrations ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT");

  if (shouldSkip) {
    console.warn("⚠️  Migration skipped due to connection issue");
    console.warn(err);
    process.exit(0);
  }

  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
