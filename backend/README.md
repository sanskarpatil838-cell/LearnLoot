# JEE Maths Master Backend

This backend verifies Firebase Auth ID tokens with Firebase Admin, then handles trusted profile, attempt, leaderboard, and admin dashboard operations.

## Local Setup

1. Install dependencies:

```bash
cd backend
npm install
```

On Windows PowerShell, use `npm.cmd install` if script execution is disabled.

2. Copy environment settings:

```bash
copy .env.example .env
```

3. In Firebase Console, create a service account key:

```text
Project settings > Service accounts > Generate new private key
```

4. Put that file path in `.env` as `GOOGLE_APPLICATION_CREDENTIALS`.

5. Start the backend:

```bash
npm run dev
```

6. In `firebase-config.js`, set:

```js
window.backendConfig = {
  apiBaseUrl: "http://127.0.0.1:3000",
  requireBackend: true,
  allowClientFirestoreFallback: false
};
```

If you open the Firebase-hosted frontend while using the local backend, include the hosted origin in `CORS_ORIGINS` and keep `ALLOW_PRIVATE_NETWORK_ACCESS=true`. Restart the backend after changing `.env`.

For production, set `NODE_ENV=production`, set `CORS_ORIGINS` to the deployed frontend origin, and use a public backend URL instead of `127.0.0.1`.

## API

- `GET /health`
- `POST /api/profile`
- `GET /api/me`
- `GET /api/leaderboard`
- `POST /api/attempts`
- `GET /api/admin/dashboard`

All `/api/*` endpoints require:

```text
Authorization: Bearer <Firebase ID token>
```

## Firestore Rules

Production rules block direct browser writes. Use the client Firestore fallback only for temporary local testing by explicitly setting `requireBackend: false` and `allowClientFirestoreFallback: true`.

The backend recalculates quiz score, accuracy, and reward points from the submitted answer indexes before writing attempts.
