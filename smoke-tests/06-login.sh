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
