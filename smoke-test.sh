#!/usr/bin/env bash
#
# Smoke test for api.mellonis.ru
# Starts a managed server instance, captures logs to extract activation/reset keys.
# Test cases are sourced from smoke-tests/*.sh
# Usage: ./smoke-test.sh
#

set -euo pipefail
set +B  # disable brace expansion — JSON bodies like {"a","b"} must not be expanded

PASS=0
FAIL=0
TIMESTAMP=$(date +%s)
TEST_LOGIN="st_$(echo "${TIMESTAMP}" | tail -c 7)"
TEST_EMAIL="smoke_${TIMESTAMP}@test.local"
TEST_PASSWORD="testpass123"
SMOKE_PORT=3033
BASE_URL="http://localhost:${SMOKE_PORT}"
LOG_FILE=$(mktemp)
SERVER_PID=""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---- Helpers ----

red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
bold()  { printf '\033[1m%s\033[0m\n' "$1"; }

cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    rm -f "$LOG_FILE"
}
trap cleanup EXIT

assert_status() {
    local label="$1" expected="$2" actual="$3"
    if [ "$actual" -eq "$expected" ]; then
        green "  PASS  $label (HTTP $actual)"
        PASS=$((PASS + 1))
    else
        red "  FAIL  $label (expected $expected, got $actual)"
        FAIL=$((FAIL + 1))
    fi
}

json_field() {
    echo "$2" | grep -o "\"$1\":[[:space:]]*\"[^\"]*\"" | head -1 | sed "s/\"$1\":[[:space:]]*\"//;s/\"$//"
}

request() {
    local method="$1" path="$2" body="${3:-}" token="${4:-}"
    local headers=(-H "Accept: application/json")
    local curl_opts=(-s -w "\n%{http_code}" -X "$method")

    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi

    if [ -n "$body" ]; then
        headers+=(-H "Content-Type: application/json")
        curl_opts+=(-d "$body")
    fi

    curl "${curl_opts[@]}" "${headers[@]}" "${BASE_URL}${path}"
}

parse_response() {
    local response="$1"
    RESPONSE_BODY=$(echo "$response" | sed '$d')
    RESPONSE_STATUS=$(echo "$response" | tail -1)
}

extract_key_from_log() {
    local login="$1"
    grep -A3 "login.*\"${login}\"" "$LOG_FILE" | grep -o 'key: "[^"]*"' | tail -1 | sed 's/key: "//;s/"//'
}

# ---- Start managed server ----

bold ""
bold "Starting managed server on port ${SMOKE_PORT}..."

PORT=$SMOKE_PORT node --env-file=.env build/index.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 20); do
    if curl -s -o /dev/null "http://localhost:${SMOKE_PORT}/sections" 2>/dev/null; then
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        red "Server exited unexpectedly. Log:"
        cat "$LOG_FILE"
        exit 1
    fi
    sleep 0.5
done

if ! curl -s -o /dev/null "http://localhost:${SMOKE_PORT}/sections" 2>/dev/null; then
    red "Server failed to start within 10 seconds. Log:"
    cat "$LOG_FILE"
    exit 1
fi

green "Server started (PID ${SERVER_PID})"

# ---- Tests ----

bold ""
bold "Smoke testing ${BASE_URL}"
bold "Test user: ${TEST_LOGIN} / ${TEST_EMAIL}"
bold "============================================"

for test_file in "$SCRIPT_DIR"/smoke-tests/*.sh; do
    source "$test_file"
done

# ---- Summary ----

bold ""
bold "============================================"
if [ "$FAIL" -eq 0 ]; then
    green "All ${PASS} checks passed"
else
    echo "$(green "${PASS} passed"), $(red "${FAIL} failed")"
fi
bold "============================================"

exit "$FAIL"
