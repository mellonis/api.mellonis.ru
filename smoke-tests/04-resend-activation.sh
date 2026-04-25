# 4. Resend activation
bold ""
bold "4. Resend activation"

parse_response "$(request POST /auth/resend-activation "{\"login\":\"${TEST_LOGIN}\"}")"
assert_status "POST /auth/resend-activation (unactivated user)" 200 "$RESPONSE_STATUS"

parse_response "$(request POST /auth/resend-activation "{\"login\":\"nonexistent_user\"}")"
assert_status "POST /auth/resend-activation (unknown user)" 200 "$RESPONSE_STATUS"
