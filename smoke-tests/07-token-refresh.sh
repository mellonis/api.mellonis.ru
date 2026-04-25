# 7. Token refresh
bold ""
bold "7. Token refresh"

if [ -n "$REFRESH_TOKEN" ]; then
    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/refresh (valid token)" 200 "$RESPONSE_STATUS"

    ACCESS_TOKEN=$(json_field "accessToken" "$RESPONSE_BODY")
    REFRESH_TOKEN=$(json_field "refreshToken" "$RESPONSE_BODY")

    FAKE_TOKEN="0000000000000000000000000000000000000000000000000000000000000000"
    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${FAKE_TOKEN}\"}")"
    assert_status "POST /auth/refresh (invalid token)" 401 "$RESPONSE_STATUS"
else
    red "  SKIP  Token refresh (no refresh token)"
    FAIL=$((FAIL + 2))
fi
