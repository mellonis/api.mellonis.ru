# 3. Login before activation
bold ""
bold "3. Login before activation"

parse_response "$(request POST /auth/login "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\"}")"
assert_status "POST /auth/login (not activated)" 403 "$RESPONSE_STATUS"
