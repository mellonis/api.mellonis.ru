# 5. Activation
bold ""
bold "5. Activation"

sleep 0.2
ACTIVATION_KEY=$(extract_key_from_log "$TEST_LOGIN")

if [ -n "$ACTIVATION_KEY" ]; then
    parse_response "$(request POST /auth/activate "{\"key\":\"${ACTIVATION_KEY}\"}")"
    assert_status "POST /auth/activate" 200 "$RESPONSE_STATUS"
else
    red "  FAIL  Could not extract activation key from server log"
    FAIL=$((FAIL + 1))
fi
