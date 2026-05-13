# LearnLoot Quiz Recording System

## File Structure

- `src/firebase/firebaseClient.js` initializes Firebase Modular SDK services for Auth, Firestore, Storage, and Functions.
- `src/recording/recordingService.js` owns recording metadata, chunk path creation, resumable chunk uploads, retry handling, Firestore subscriptions, and the callable merge trigger. Chunk metadata is stored in `recordings/{attemptId}/chunks/{chunkId}` so 40-minute recordings do not bloat the parent document.
- `src/components/QuizWebcamRecorder.jsx` requests webcam and microphone access, shows live preview, records `video/webm;codecs=vp8,opus` in 5-second chunks, uploads chunks immediately, and stops tracks on quiz end.
- `src/admin/AdminRecordingsList.jsx` lists documents from `recordings`.
- `src/admin/AdminRecordingDetails.jsx` auto-queues a merge for completed recordings and shows only the full merged video when it is ready. It no longer exposes individual chunk players in the admin viewing flow.
- `src/admin/recordingAdmin.css` styles the admin recordings table, status pills, and video player layouts.
- `functions/index.js` exports the callable Firebase Cloud Function `mergeRecordingChunks` and the Firestore trigger `autoMergeRecordingChunks`, which starts the merge automatically when a recording document becomes `completed`.
- `functions/package.json` declares Cloud Functions dependencies, including `ffmpeg-static`.
- `firestore.rules` protects `recordings/{attemptId}` metadata.
- `storage.rules` protects `quiz-recordings/{studentId}/{quizId}/{attemptId}/chunks/*` and final videos.

## React Usage

Render the recorder only while a quiz attempt is active:

```jsx
<QuizWebcamRecorder
  studentId={currentUser.uid}
  quizId={quizId}
  attemptId={attemptId}
  isQuizActive={quizInProgress}
/>
```

On quiz end, set `isQuizActive` to `false`. The component stops `MediaRecorder`, flushes the final chunk, waits for pending chunk uploads, stops camera and microphone tracks, and marks the Firestore recording document as `completed`.

## Firestore Shape

Parent recording document:

```txt
recordings/{attemptId}
```

Stores `studentId`, `quizId`, `attemptId`, `chapter`, `partNumber`, `partLabel`, `userName`, `userAvatar`, `status`, `startedAt`, `endedAt`, `chunkCount`, `failedChunkCount`, `finalVideoUrl`, and `finalVideoPath`.

Chunk metadata documents:

```txt
recordings/{attemptId}/chunks/chunk_0001
recordings/{attemptId}/chunks/chunk_0002
```

Each uploaded chunk stores `index`, `path`, `downloadURL`, `size`, `contentType`, `status`, and `uploadedAt`. Failed chunks store `status: "failed"` and the upload error. This avoids the Firestore 1 MiB parent-document limit for long quizzes.

Admin routing can be as simple as:

```jsx
const [selectedAttemptId, setSelectedAttemptId] = useState(null);

return selectedAttemptId ? (
  <AdminRecordingDetails
    attemptId={selectedAttemptId}
    onBack={() => setSelectedAttemptId(null)}
  />
) : (
  <AdminRecordingsList onViewRecording={setSelectedAttemptId} />
);
```

## Cloud Function Deploy Notes

Install function dependencies in `functions`:

```bash
npm install
```

Set allowed admin emails for the callable function:

```bash
firebase functions:config:set admin.emails="admin@example.com"
```

For local `.env` or modern Firebase environment variables, expose:

```bash
ADMIN_EMAILS=admin@example.com
```

Deploy:

```bash
firebase deploy --only functions,firestore:rules,storage
```

The function reads `recordings/{attemptId}/chunks`, sorts uploaded chunks by `index`, downloads each chunk from Storage, rebuilds the WebM in byte order, tries to remux it with FFmpeg, uploads `final/full-recording.webm`, writes a Firebase download-token URL to `finalVideoUrl`, and updates the recording document to `merged`. If FFmpeg remuxing fails, it still uploads the byte-joined WebM so the merge does not fail just because remuxing rejected a browser-generated file. New quiz attempts merge automatically after upload completion, and the admin library also queues old completed chunked recordings for merge when an admin opens the recordings view. Admins can restart a stuck merge from the recordings card.
