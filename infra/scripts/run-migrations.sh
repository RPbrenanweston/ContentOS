# @crumb run-migrations-script
# [INF] | Database migrations | Schema updater
# why: Script running database migrations to update schema on new deployments
# in:[database URL, migration directory, version] out:[migrated schema, migration log] err:[migration, SQL errors]
# hazard: Database URL passed as argument—exposed in process list when script runs
# hazard: No rollback mechanism—failed migration may leave schema in inconsistent state
# edge:infra/supabase/docker-compose.yml -> CALLS
# prompt: Use environment variables for credentials, implement migration rollback capability

#!/usr/bin/env bash
# ============================================================
# Run all database migrations against self-hosted Supabase
# ============================================================
# Usage: ./run-migrations.sh [database-url]
# Default: postgresql://postgres:$POSTGRES_PASSWORD@localhost:5432/postgres
#
# Prerequisites:
#   - Docker Compose stack must be running (docker compose up -d)
#   - GoTrue must be healthy (creates auth schema)
#   - psql must be installed locally
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../../supabase/migrations"
SUPABASE_DIR="${SCRIPT_DIR}/../supabase"

# Load .env if it exists
if [ -f "${SUPABASE_DIR}/.env" ]; then
  set -a
  source "${SUPABASE_DIR}/.env"
  set +a
fi

DB_URL="${1:-postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-postgres}}"

echo "=== Content Platform Migration Runner ==="
echo "Database: ${DB_URL%%@*}@***"
echo "Migrations: ${MIGRATIONS_DIR}"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
RETRIES=30
until psql "${DB_URL}" -c "SELECT 1" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "Error: PostgreSQL not ready after 30 attempts"
    exit 1
  fi
  sleep 1
done
echo "PostgreSQL is ready."

# Verify extensions
echo "Ensuring required extensions..."
psql "${DB_URL}" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
psql "${DB_URL}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null
echo "Extensions ready."

# Check for auth schema (created by GoTrue)
echo "Checking auth schema..."
AUTH_EXISTS=$(psql "${DB_URL}" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth');" 2>/dev/null | tr -d ' ')
if [ "${AUTH_EXISTS}" != "t" ]; then
  echo "Warning: auth schema not found. GoTrue may not be running."
  echo "Migrations referencing auth.users or auth.uid() may fail."
  echo "Start GoTrue first: docker compose up -d auth"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run migrations in order
echo ""
echo "Running migrations..."
MIGRATION_COUNT=0
FAILED=0

for migration in "${MIGRATIONS_DIR}"/*.sql; do
  filename=$(basename "${migration}")

  # Check if already applied (simple tracking via comment table)
  ALREADY_APPLIED=$(psql "${DB_URL}" -t -c "
    SELECT EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_name = '_migrations'
    );" 2>/dev/null | tr -d ' ')

  if [ "${ALREADY_APPLIED}" = "t" ]; then
    SKIP=$(psql "${DB_URL}" -t -c "
      SELECT EXISTS(
        SELECT 1 FROM _migrations
        WHERE name = '${filename}'
      );" 2>/dev/null | tr -d ' ')
    if [ "${SKIP}" = "t" ]; then
      echo "  SKIP  ${filename} (already applied)"
      continue
    fi
  fi

  echo -n "  RUN   ${filename}..."
  if psql "${DB_URL}" -f "${migration}" > /dev/null 2>&1; then
    echo " OK"
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))

    # Record migration (create tracking table if needed)
    psql "${DB_URL}" -c "
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO _migrations (name) VALUES ('${filename}')
      ON CONFLICT (name) DO NOTHING;" > /dev/null 2>&1
  else
    echo " FAILED"
    FAILED=$((FAILED + 1))
    echo "  Error running ${filename}. Check SQL syntax and dependencies."
    echo "  Run manually: psql \$DB_URL -f ${migration}"
  fi
done

echo ""
echo "=== Migration Summary ==="
echo "Applied: ${MIGRATION_COUNT}"
echo "Failed:  ${FAILED}"
echo "Total:   $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | wc -l | tr -d ' ')"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "Some migrations failed. Fix and re-run — already-applied migrations will be skipped."
  exit 1
fi

echo ""
echo "All migrations applied successfully."
