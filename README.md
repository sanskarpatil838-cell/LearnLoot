# Jee-maths-master
JEE-Maths-Practice

## Run

Open the project with VS Code Live Server or any static hosting service.

For local testing, open:

```text
http://127.0.0.1:5500/
```

Or run the included static server:

```bash
node dev-server.js 5500
```

## Backend

The project now includes a Node/Firebase Admin backend in `backend/`.

Local backend setup:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Then set `window.backendConfig.apiBaseUrl` in `firebase-config.js`:

```js
window.backendConfig = {
  apiBaseUrl: "http://127.0.0.1:3000",
  requireBackend: true,
  allowClientFirestoreFallback: false
};
```

For production, `apiBaseUrl` must point to the deployed backend. Direct browser writes to Firestore are disabled unless `requireBackend` is set to `false` and `allowClientFirestoreFallback` is set to `true` for a deliberate local-only test.

## Production notes

- `script.js` contains app/auth/admin logic.
- `backend/question-bank.js` contains quiz questions, answers, and scoring helpers. The browser now receives only question text/options from the backend.
- `firebase.json` adds basic Firebase Hosting cache headers for static files.
- `firebase.json` also deploys Firestore rules/indexes and Storage rules.
- `backend/server.js` handles profile, attempts, leaderboard, and admin reads through Firebase Admin.
- The backend recalculates attempt scores and reward points from submitted answers before saving.
- Keep production `CORS_ORIGINS` restricted to the live site URL.
