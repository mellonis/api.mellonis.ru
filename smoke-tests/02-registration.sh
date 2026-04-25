# 2. Registration
bold ""
bold "2. Registration"

parse_response "$(request POST /auth/register "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\",\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/register (new user)" 201 "$RESPONSE_STATUS"

parse_response "$(request POST /auth/register "{\"login\":\"${TEST_LOGIN}\",\"password\":\"${TEST_PASSWORD}\",\"email\":\"${TEST_EMAIL}\"}")"
assert_status "POST /auth/register (duplicate login)" 409 "$RESPONSE_STATUS"
