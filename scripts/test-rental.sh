#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to an isolated migrated _test database.}"
node -e 'if (!new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test")) throw new Error("Use an isolated _test database");'
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy --config prisma7.config.ts
RENTAL_TEST_PORT="${TEST_API_PORT:-3001}"
export TEST_BASE_URL="http://127.0.0.1:$RENTAL_TEST_PORT"
if curl --silent --connect-timeout 1 "$TEST_BASE_URL/api/listings" -o /dev/null; then
  echo "Test port is already occupied; choose TEST_API_PORT or stop your test server." >&2
  exit 1
fi
DATABASE_URL="$TEST_DATABASE_URL" setsid node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port "$RENTAL_TEST_PORT" > /tmp/lend-ya-rental-test-server.log 2>&1 &
RENTAL_SERVER_PID=$!
stop_test_server() {
  kill -- -"$RENTAL_SERVER_PID" 2>/dev/null || true
  wait "$RENTAL_SERVER_PID" 2>/dev/null || true
}
trap stop_test_server EXIT
for attempt in $(seq 1 40); do
  if ! kill -0 "$RENTAL_SERVER_PID" 2>/dev/null; then
    echo "Test server stopped; inspect /tmp/lend-ya-rental-test-server.log." >&2
    exit 1
  fi
  if curl --silent --fail "$TEST_BASE_URL/api/listings" -o /dev/null; then break; fi
  sleep 0.25
done
curl --silent --fail "$TEST_BASE_URL/api/listings" -o /dev/null
npx tsx --test tests/bookings.integration.test.ts tests/rental-lifecycle.integration.test.ts
stop_test_server
trap - EXIT
npx tsx --test tests/rental-browser.test.ts
