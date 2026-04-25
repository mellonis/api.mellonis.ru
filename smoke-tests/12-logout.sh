# 12. Logout
bold ""
bold "12. Logout"

if [ -n "$REFRESH_TOKEN" ]; then
    parse_response "$(request POST /auth/logout "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/logout" 204 "$RESPONSE_STATUS"

    parse_response "$(request POST /auth/refresh "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
    assert_status "POST /auth/refresh (after logout)" 401 "$RESPONSE_STATUS"
else
    red "  SKIP  Logout (no refresh token)"
    FAIL=$((FAIL + 2))
fi
