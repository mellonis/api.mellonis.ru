# 9. Password reset
bold ""
bold "9. Password reset"

parse_response "$(request POST /auth/request-password-reset "{\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/request-password-reset" 200 "$RESPONSE_STATUS"

sleep 0.2
RESET_KEY=$(extract_key_from_log "$TEST_LOGIN")

if [ -n "$RESET_KEY" ]; then
    parse_response "$(request POST /auth/reset-password "{\"key\":\"${RESET_KEY}\",\"newPassword\":\"${TEST_PASSWORD}\"}")"
    assert_status "POST /auth/reset-password" 200 "$RESPONSE_STATUS"

    parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
    assert_status "POST /auth/login (after reset)" 200 "$RESPONSE_STATUS"

    ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
    REFRESH_TOKEN=$(json_field "refreshToken" "$RESPONSE_BODY")
    USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')
else
    red "  FAIL  Could not extract reset key from server log"
    FAIL=$((FAIL + 2))
fi
