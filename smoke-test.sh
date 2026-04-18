#!/usr/bin/env bash
#
# Smoke test for api.mellonis.ru
# Starts a managed server instance, captures logs to extract activation/reset keys.
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
    local headers=(-H "Content-Type: application/json" -H "Accept: application/json")
    local curl_opts=(-s -w "\n%{http_code}" -X "$method")

    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi

    if [ -n "$body" ]; then
        curl_opts+=(-d "$body")
    fi

    curl "${curl_opts[@]}" "${headers[@]}" "${BASE_URL}${path}"
}

parse_response() {
    local response="$1"
    RESPONSE_BODY=$(echo "$response" | sed '$d')
    RESPONSE_STATUS=$(echo "$response" | tail -1)
}

# Extract a key logged by ConsoleAuthNotifier from the server log.
# Usage: extract_key_from_log "login_value"
# The log format is:  key: "hexstring"  (on its own line, after a line matching the login)
extract_key_from_log() {
    local login="$1"
    # Find the last log block mentioning this login, then extract the key
    grep -A3 "login.*\"${login}\"" "$LOG_FILE" | grep -o 'key: "[^"]*"' | tail -1 | sed 's/key: "//;s/"//'
}

# ---- Start managed server ----

bold ""
bold "Starting managed server on port ${SMOKE_PORT}..."

PORT=$SMOKE_PORT node --env-file=.env build/index.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (up to 10 seconds)
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

# 1. Public endpoints
bold ""
bold "1. Public endpoints"

parse_response "$(request GET /sections)"
assert_status "GET /sections" 200 "$RESPONSE_STATUS"

parse_response "$(request GET /things-of-the-day)"
assert_status "GET /things-of-the-day" 200 "$RESPONSE_STATUS"

# 2. Register
bold ""
bold "2. Registration"

parse_response "$(request POST /auth/register "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\",\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/register (new user)" 201 "$RESPONSE_STATUS"

parse_response "$(request POST /auth/register "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\",\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/register (duplicate login)" 409 "$RESPONSE_STATUS"

# 3. Login before activation
bold ""
bold "3. Login before activation"

parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
assert_status "POST /auth/login (not activated)" 403 "$RESPONSE_STATUS"

# 4. Resend activation
bold ""
bold "4. Resend activation"

parse_response "$(request POST /auth/resend-activation "{\"login\":\"${TEST_LOGIN}\"}")"
assert_status "POST /auth/resend-activation (unactivated user)" 200 "$RESPONSE_STATUS"

parse_response "$(request POST /auth/resend-activation "{\"login\":\"nonexistent_user\"}")"
assert_status "POST /auth/resend-activation (unknown user)" 200 "$RESPONSE_STATUS"

# 5. Activate (extract key from server log)
bold ""
bold "5. Activation"

# Give the log a moment to flush
sleep 0.2
ACTIVATION_KEY=$(extract_key_from_log "$TEST_LOGIN")

if [ -n "$ACTIVATION_KEY" ]; then
    parse_response "$(request POST /auth/activate "{\"key\":\"${ACTIVATION_KEY}\"}")"
    assert_status "POST /auth/activate" 200 "$RESPONSE_STATUS"
else
    red "  FAIL  Could not extract activation key from server log"
    FAIL=$((FAIL + 1))
fi

# 6. Login
bold ""
bold "6. Login"

parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
assert_status "POST /auth/login (valid credentials)" 200 "$RESPONSE_STATUS"

ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
REFRESH_TOKEN=$(json_field "refreshToken" "$RESPONSE_BODY")
USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
    red "  FAIL  Could not extract tokens from login response"
    FAIL=$((FAIL + 1))
fi

parse_response "$(request POST /auth/login "{\"login\":\"nobody\",\"password\":\"wrong\"}")"
assert_status "POST /auth/login (invalid credentials)" 401 "$RESPONSE_STATUS"

# 7. Refresh
bold ""
bold "7. Token refresh"

if [ -n "$REFRESH_TOKEN" ]; then
    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/refresh (valid token)" 200 "$RESPONSE_STATUS"

    # Update tokens from refresh response
    ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
    REFRESH_TOKEN=$(json_field "refreshToken" "$RESPONSE_BODY")

    FAKE_TOKEN="0000000000000000000000000000000000000000000000000000000000000000"
    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${FAKE_TOKEN}\"}")"
    assert_status "POST /auth/refresh (invalid token)" 401 "$RESPONSE_STATUS"
else
    red "  SKIP  Token refresh (no refresh token)"
    FAIL=$((FAIL + 2))
fi

# 8. Protected endpoint without auth
bold ""
bold "8. Auth enforcement"

parse_response "$(request PATCH "/users/${USER_ID}/password" "{\"currentPassword\":\"x\",\"newPassword\":\"newpass123\"}")"
assert_status "PATCH /users/:id/password (no auth)" 401 "$RESPONSE_STATUS"

# 9. Password reset flow
bold ""
bold "9. Password reset"

parse_response "$(request POST /auth/request-password-reset "{\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/request-password-reset" 200 "$RESPONSE_STATUS"

sleep 0.2
RESET_KEY=$(extract_key_from_log "$TEST_LOGIN")

if [ -n "$RESET_KEY" ]; then
    parse_response "$(request POST /auth/reset-password "{\"key\":\"${RESET_KEY}\",\"newPassword\":\"${TEST_PASSWORD}\"}")"
    assert_status "POST /auth/reset-password" 200 "$RESPONSE_STATUS"

    # Verify login with same password (reset set it back)
    parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
    assert_status "POST /auth/login (after reset)" 200 "$RESPONSE_STATUS"

    ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
    REFRESH_TOKEN=$(json_field "refreshToken" "$RESPONSE_BODY")
    USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')
else
    red "  FAIL  Could not extract reset key from server log"
    FAIL=$((FAIL + 2))
fi

# 10. Logout
bold ""
bold "10. Logout"

if [ -n "$REFRESH_TOKEN" ]; then
    parse_response "$(request POST /auth/logout "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/logout" 204 "$RESPONSE_STATUS"

    # Refresh with revoked token should fail
    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/refresh (after logout)" 401 "$RESPONSE_STATUS"
else
    red "  SKIP  Logout (no refresh token)"
    FAIL=$((FAIL + 2))
fi

# 11. Cleanup — delete the test user
bold ""
bold "11. Cleanup"

# Login fresh for deletion
parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
if [ "$RESPONSE_STATUS" -eq 200 ]; then
    ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
    USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')

    parse_response "$(request DELETE "/users/${USER_ID}" "{\"password\":\"${TEST_PASSWORD}\"}" "$ACCESS_TOKEN")"
    assert_status "DELETE /users/:id (self-delete)" 204 "$RESPONSE_STATUS"

    # Verify user is gone
    parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
    assert_status "POST /auth/login (after delete)" 401 "$RESPONSE_STATUS"
else
    red "  SKIP  Cleanup (could not login)"
    FAIL=$((FAIL + 2))
fi

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
