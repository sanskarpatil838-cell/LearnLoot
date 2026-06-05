# Firebase Setup

## 1. Create your Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Add a **Web App** inside that project.
4. Copy the Firebase config object.

## 2. Enable sign-in methods

1. Open **Authentication**.
2. Go to **Sign-in method**.
3. Enable `Email/Password`.

## 3. Create Firestore database

1. Open **Firestore Database**.
2. Create the database.
3. Choose a nearby region.

## 4. Add your Firebase keys

Open [firebase-config.js](./firebase-config.js) and replace:

- `YOUR_API_KEY`
- `YOUR_PROJECT_ID`
- `YOUR_MESSAGING_SENDER_ID`
- `YOUR_APP_ID`

## 5. Add Firestore rules

1. Open **Firestore Database**.
2. Go to the **Rules** tab.
3. Replace the rules with the contents of [firestore.rules](./firestore.rules).
4. Publish the rules.
5. Deploy [firestore.indexes.json](./firestore.indexes.json) with Firebase CLI so the admin dashboard collection-group query is ready.

## 6. Enable Storage and add Storage rules

1. Open **Storage** in Firebase Console.
2. Click **Get started** if Storage is not enabled yet.
3. Go to the **Rules** tab.
4. Replace the rules with the contents of [storage.rules](./storage.rules).
5. Publish the rules.

Deploy Firestore, Storage, and Functions together for production:

```bash
firebase deploy --only functions,firestore,storage
```

Quiz recordings upload to:

```text
quiz-recordings/{studentId}/{quizId}/{attemptId}/chunks/chunk_0001.webm
```

## 7. What the app now stores in Firestore

- `users/{uid}`
  - public profile fields used for the leaderboard
  - synced totals like points, tests completed, time spent, and accuracy stats
- `users/{uid}/attempts/{attemptId}`
  - each quiz attempt
  - includes `recordingUrl` and `recordingPath` after recording upload succeeds
  - used for history and charts
  - queried with a collection group by the admin dashboard, so recent attempts can load without scanning every user one by one
- `users/{uid}/quizSessions/{attemptId}`
  - backend-issued single-use quiz attempts
  - stores the exact question ids used for trusted grading
  - direct browser reads/writes are blocked by the current rules
- `users/{uid}/rewardLimits/{date}`
  - backend-maintained daily positive reward cap
  - used to prevent unlimited cash accrual from repeated tests

## 8. Important test before launch

1. Create one account with email/password.
2. Log out and log back in.
3. Complete a test.
4. Check:
   - score history is still there after refresh
   - recording upload reaches 100%
   - the recording URL appears in the browser console
   - the same account works on another device
   - leaderboard updates for all users

## 9. Firebase Functions backend

The trusted backend is in `functions/`. The old standalone `backend/` copy has been removed.

Use Functions for profile updates, issued quiz attempts, grading, leaderboard reads, admin dashboard reads, and recording merge tasks.

1. Set `window.backendConfig.apiBaseUrl` in `firebase-config.js`.
2. Keep `requireBackend: true` and `allowClientFirestoreFallback: false` for production.
3. Configure production environment variables such as `ADMIN_EMAILS`, `CORS_ORIGINS`, `DAILY_REWARD_CAP`, `MAX_QUIZ_STARTS_PER_HOUR`, and optionally `REQUIRE_APP_CHECK=true`.
4. Test login, quiz start, quiz submit, leaderboard, admin dashboard, recording upload, and recording merge.
