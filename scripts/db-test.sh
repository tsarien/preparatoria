#!/usr/bin/env bash
# Aplica las migraciones sobre un PostgreSQL local con un arnés que simula Supabase y
# ejecuta las pruebas SQL de supabase/tests/*.test.sql. Uso: bash scripts/db-test.sh
# Requiere PostgreSQL local (psql) y permiso para el usuario "postgres".
set -euo pipefail
cd "$(dirname "$0")/.."
# Levanta el clúster local si está detenido (entornos efímeros).
if command -v pg_lsclusters >/dev/null && ! su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1; then
  pg_ctlcluster "$(pg_lsclusters -h | awk '{print $1}' | head -1)" main start 2>/dev/null || true
  sleep 3
fi
DB=${DB_TEST_NAME:-preparatoria_test}
PSQL="su postgres -c"
run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f $1" ; }
su postgres -c "psql -q -c 'drop database if exists $DB'" >/dev/null
su postgres -c "psql -q -c 'create database $DB'" >/dev/null
chmod -R a+rX supabase
run "$PWD/supabase/tests/00_supabase_stub.sql"
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "→ $f"
  run "$PWD/$f" 2>&1 | grep -v "^NOTICE\|^psql:.*NOTICE" || true
done
fallos=0
for t in supabase/tests/*.test.sql; do
  [ -e "$t" ] || continue
  echo "== $t"
  if ! run "$PWD/$t"; then fallos=$((fallos+1)); fi
done
[ "$fallos" -eq 0 ] && echo "✔ Pruebas SQL OK" || { echo "✘ $fallos archivo(s) de prueba SQL fallaron"; exit 1; }
