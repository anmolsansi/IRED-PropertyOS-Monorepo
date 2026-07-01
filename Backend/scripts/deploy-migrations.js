const { execFileSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BASELINE_MIGRATIONS = [
  "20250101000000_add_soft_delete_and_indexes",
  "20250601000000_add_multi_tenancy",
  "20250624000000_add_login_2fa_otp_purpose",
  "20250624000100_add_free_text_location_and_property_fields",
];

const CLERK_MIGRATION = "20250626000000_add_clerk_user_id";

function runPrisma(args) {
  execFileSync('./node_modules/.bin/prisma', ['migrate', 'deploy'], {
    stdio: 'inherit',
  });
}

async function getMigrationRowCount() {
  const table = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
    ) AS exists
  `;

  if (!table[0]?.exists) return 0;

  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "_prisma_migrations"
  `;

  return rows[0]?.count ?? 0;
}

async function getUserTableCount() {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
  `;

  return rows[0]?.count ?? 0;
}

async function hasClerkUserIdColumn() {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'clerk_user_id'
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

async function baselineExistingSchemaIfNeeded() {
  const migrationRowCount = await getMigrationRowCount();
  const userTableCount = await getUserTableCount();

  if (migrationRowCount > 0 || userTableCount === 0) return;

  console.log(
    "Detected existing database schema without Prisma migration history. Baselining existing migrations...",
  );

  for (const migration of BASELINE_MIGRATIONS) {
    runPrisma(["migrate", "resolve", "--applied", migration]);
  }

  if (await hasClerkUserIdColumn()) {
    runPrisma(["migrate", "resolve", "--applied", CLERK_MIGRATION]);
  }
}

async function killZombieLocks() {
  console.log("Checking for stale Prisma advisory locks...");
  try {
    const locks = await prisma.$queryRaw`
      SELECT pid 
      FROM pg_locks 
      WHERE locktype = 'advisory' 
        AND objid = 72707369
        AND granted = true;
    `;
    
    if (locks && locks.length > 0) {
      console.log(`Found ${locks.length} stale lock(s). Terminating holding connections...`);
      for (const lock of locks) {
        await prisma.$queryRaw`SELECT pg_terminate_backend(${Number(lock.pid)})`;
        console.log(`Terminated PID ${lock.pid}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log("No stale locks found.");
    }
  } catch (err) {
    console.error("Could not clear locks (safe to ignore):", err.message);
  }
}

async function main() {
  await baselineExistingSchemaIfNeeded();
  await killZombieLocks();
  runPrisma(["migrate", "deploy"]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
