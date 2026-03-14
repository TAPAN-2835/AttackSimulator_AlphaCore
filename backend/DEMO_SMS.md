# SMS Phishing Demo (9601163573)

## 1. Install dependencies and start backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Leave this terminal running. In a **new terminal**:

## 2. Run the SMS demo

```bash
cd backend
export DEMO_PHONE=9601163573
./run_demo_sms.sh
```

Or with default base URL and phone:

```bash
./run_demo_sms.sh
```

The script will:
- Log in (admin: anishpatel4y@gmail.com / anish123)
- Create an SMS campaign
- Upload one target with phone **9601163573**
- Start the campaign

With **SIMULATION_MODE=true** (default): the “SMS” is only **logged** in the backend console (no real SMS). You’ll see something like:

`[SIMULATION_MODE] SMS (mock) to 9601163573: Urgent: Your company account requires verification...`

## 3. Send a real SMS (optional)

1. Get Twilio credentials and a Twilio phone number.
2. In `backend/.env` set:
   - `SIMULATION_MODE=false`
   - `TWILIO_ACCOUNT_SID=...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_PHONE_NUMBER=+1...` (your Twilio number)
3. Restart the backend and run `./run_demo_sms.sh` again.
4. Use E.164 for the demo number, e.g. `DEMO_PHONE=+919601163573` for India.

## 4. Frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, go to Campaigns, and you’ll see the new SMS campaign and can run campaigns from the UI.
