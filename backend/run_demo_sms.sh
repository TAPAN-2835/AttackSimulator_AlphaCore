#!/usr/bin/env bash
# SMS demo for number 9601163573
# Prerequisites: Backend running on http://localhost:8000 (run: uvicorn main:app --port 8000)

set -e
BASE="${BASE_URL:-http://localhost:8000}"
PHONE="${DEMO_PHONE:-9601163573}"

echo "=== SMS Phishing Demo ==="
echo "Target phone: $PHONE"
echo "API base: $BASE"
echo ""

# 1. Optional: login (campaign routes may work without auth in dev)
TOKEN=""
TOKEN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"anishpatel4y@gmail.com","password":"anish123"}')
TOKEN=$(echo "$TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
CURL_AUTH=()
[ -n "$TOKEN" ] && CURL_AUTH=(-H "Authorization: Bearer $TOKEN") && echo "Logged in."

# 2. Create SMS campaign (scheduled so we can add targets then start)
CAMPAIGN_RESP=$(curl -s -X POST "$BASE/campaigns/create" \
  -H "Content-Type: application/json" \
  "${CURL_AUTH[@]}" \
  -d "{
    \"campaign_name\": \"SMS Demo - $PHONE\",
    \"description\": \"Demo smishing simulation\",
    \"channel_type\": \"SMS\",
    \"attack_type\": \"credential_harvest\",
    \"template_name\": \"password_reset\",
    \"schedule_date\": \"2030-01-01T10:00:00\"
  }")
CAMPAIGN_ID=$(echo "$CAMPAIGN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
if [ -z "$CAMPAIGN_ID" ]; then
  echo "Create campaign failed. Response: $CAMPAIGN_RESP"
  exit 1
fi
echo "Created campaign id: $CAMPAIGN_ID"

# 3. Upload single target (CSV with phone_number)
CSV_FILE=$(mktemp)
echo "email,phone_number,name,department
demo@demo.com,$PHONE,Demo User,Engineering" > "$CSV_FILE"
UPLOAD_RESP=$(curl -s -X POST "$BASE/campaigns/upload-users?campaign_id=$CAMPAIGN_ID" \
  "${CURL_AUTH[@]}" \
  -F "file=@$CSV_FILE;filename=targets.csv")
rm -f "$CSV_FILE"
echo "Upload targets: $UPLOAD_RESP"

# 4. Start campaign (sends SMS in SIMULATION_MODE = log only; set SIMULATION_MODE=false and Twilio for real SMS)
START_RESP=$(curl -s -X POST "$BASE/campaigns/$CAMPAIGN_ID/start" \
  "${CURL_AUTH[@]}")
echo "Start campaign: $START_RESP"

echo ""
echo "Done. With SIMULATION_MODE=true the SMS is logged in the backend console (not sent)."
echo "To send a real SMS: set SIMULATION_MODE=false and configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env"
