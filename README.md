# LearnLoot

JEE Maths practice app with Firebase Auth, Firestore-backed profiles, Firebase Functions for trusted quiz grading, Storage-backed exam recordings, leaderboard views, and an admin dashboard.

## Local Run

Use the included static server:

```bash
node dev-server.js 5500
```

Open:

```text
http://127.0.0.1:5500/
```

The local static server proxies `/api/*` calls to the deployed Firebase Function by default.

## Build

```bash
npm.cmd run build
```

This prepares `netlify-public/` from the root static files. Firebase Hosting is intentionally configured to publish only this generated folder so `functions/`, question banks, scripts, and local project files are never served as public static assets.

## Firebase Functions

The production backend is in `functions/`.

```bash
cd functions
npm.cmd run lint
firebase deploy --only functions,firestore,storage
```

Important environment settings for launch:

```text
ADMIN_EMAILS=admin@example.com
CORS_ORIGINS=https://learnloot.netlify.app,https://earnlearn-68952.web.app
NODE_ENV=production
DAILY_REWARD_CAP=1000
MAX_QUIZ_STARTS_PER_HOUR=12
QUIZ_ATTEMPT_TTL_MS=10800000
REQUIRE_APP_CHECK=true
```

If `REQUIRE_APP_CHECK=true`, also set `window.appCheckConfig.enabled = true` and add the Firebase App Check reCAPTCHA site key in `firebase-config.js`.

## Security Notes

- The browser receives only question text, options, and a backend-issued attempt id.
- The backend stores each issued attempt under the signed-in user, grades only the issued question ids, and consumes the attempt once.
- Direct browser writes to profile and attempt totals are blocked by Firestore rules.
- Positive rewards are capped per UTC day with `DAILY_REWARD_CAP`; deductions can still reduce the displayed balance.
- Keep service account JSON files and `.env` files out of the project tree and never package them into deploy archives.

## Deploy Notes

- `functions/api.js` exposes the authenticated API.
- `functions/index.js` hosts the API function and recording merge functions.
- `functions/question-bank.js` contains server-side questions, answers, and grading helpers.
- `firestore.rules`, `storage.rules`, and `firestore.indexes.json` must be deployed with the app.
- `netlify-public/` is generated build output and can be recreated with `npm.cmd run build`.
- Do not change Firebase Hosting back to `"public": "."`; that can expose backend source and answer banks.
# Secure Razorpay course payments

LearnLoot creates a new Razorpay Payment Link for each signed-in user. Course
access is granted only after the Firebase backend verifies a signed Razorpay
webhook and stores an active purchase in Firestore.

Configure the required Firebase Function secrets:

```powershell
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

Then deploy the API and Firestore rules:

```powershell
firebase deploy --only functions:api,firestore:rules
```

Configure this webhook in the Razorpay Dashboard:

```text
https://us-central1-earnlearn-68952.cloudfunctions.net/api/api/payments/razorpay-webhook
```

Use the same value entered for `RAZORPAY_WEBHOOK_SECRET` and enable these
events:

- `payment_link.paid`
- `payment.captured`

Razorpay credentials and webhook secrets must never be added to frontend files
or committed to Git.
