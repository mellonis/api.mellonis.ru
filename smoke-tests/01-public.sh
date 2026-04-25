# 1. Public endpoints
bold ""
bold "1. Public endpoints"

parse_response "$(request GET /sections)"
assert_status "GET /sections" 200 "$RESPONSE_STATUS"

parse_response "$(request GET /things-of-the-day)"
assert_status "GET /things-of-the-day" 200 "$RESPONSE_STATUS"
