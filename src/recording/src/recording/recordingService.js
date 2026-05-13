import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "../firebase/firebaseClient";

export const RECORDING_MIME_TYPE = "video/webm;codecs=vp8,opus";
export const RECORDING_TIMESLICE_MS = 5000;

export function buildRecordingBasePath({ studentId, quizId, attemptId }) {
  return `quiz-recordings/${studentId}/${quizId}/${attemptId}`;
}

export function buildChunkPath({ studentId, quizId, attemptId, index }) {
  const padded = String(index).padStart(4, "0");
  return `${buildRecordingBasePath({ studentId, quizId, attemptId })}/chunks/chunk_${padded}.webm`;
}

export function recordingDocRef(attemptId) {
  return doc(db, "recordings", attemptId);
}

export function recordingChunkDocRef(attemptId, index) {
  return doc(db, "recordings", attemptId, "chunks", `chunk_${String(index).padStart(4, "0")}`);
}

export async function createRecordingDocument({
  studentId,
  quizId,
  attemptId,
  chapter = "",
  partNumber = 0,
  partLabel = "",
  userName = "Student",
  userAvatar = "ST"
}) {
  await setDoc(recordingDocRef(attemptId), {
    studentId,
    quizId,
    attemptId,
    chapter,
    partNumber,
    partLabel,
    userName,
    userAvatar,
    status: "recording",
    startedAt: serverTimestamp(),
    endedAt: null,
    chunkCount: 0,
    failedChunkCount: 0,
    finalVideoUrl: null,
    finalVideoPath: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function uploadTaskAsPromise(uploadTask, onProgress) {
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (!onProgress) return;
        const percent = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress(percent, snapshot);
      },
      reject,
      () => resolve(uploadTask.snapshot)
    );
  });
}

export async function uploadChunkOnce({ blob, studentId, quizId, attemptId, index, onProgress }) {
  const path = buildChunkPath({ studentId, quizId, attemptId, index });
  const chunkRef = ref(storage, path);
  const snapshot = await uploadTaskAsPromise(
    uploadBytesResumable(chunkRef, blob, {
      contentType: "video/webm",
      customMetadata: {
        studentId,
        quizId,
        attemptId,
        chunkIndex: String(index)
      }
    }),
    onProgress
  );

  const downloadURL = await getDownloadURL(snapshot.ref);
  const metadata = {
    index,
    path,
    downloadURL,
    size: blob.size,
    contentType: blob.type || RECORDING_MIME_TYPE,
    status: "uploaded",
    uploadedAt: serverTimestamp()
  };

  await setDoc(recordingChunkDocRef(attemptId, index), metadata, { merge: true });
  await updateDoc(recordingDocRef(attemptId), {
    chunkCount: index,
    updatedAt: serverTimestamp()
  });

  return metadata;
}

export async function retryUploadChunk(options, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await uploadChunkOnce(options);
    } catch (error) {
      lastError = error;
      console.warn(
        `Recording chunk ${options.index} upload attempt ${attempt}/${maxAttempts} failed`,
        error
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
  }

  const failedChunk = {
    index: options.index,
    size: options.blob?.size || 0,
    status: "failed",
    failedAt: serverTimestamp(),
    error: String(lastError?.message || lastError || "Upload failed")
  };

  await setDoc(recordingChunkDocRef(options.attemptId, options.index), failedChunk, { merge: true });
  await updateDoc(recordingDocRef(options.attemptId), {
    failedChunkCount: increment(1),
    updatedAt: serverTimestamp()
  });

  console.warn("Recording chunk upload failed after retries", failedChunk);
  return null;
}

export async function completeRecordingDocument(attemptId) {
  await updateDoc(recordingDocRef(attemptId), {
    status: "completed",
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function failRecordingDocument(attemptId, error) {
  await updateDoc(recordingDocRef(attemptId), {
    status: "failed",
    error: String(error?.message || error || "Recording failed"),
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getRecording(attemptId) {
  const snapshot = await getDoc(recordingDocRef(attemptId));
  return snapshot.exists() ? snapshot.data() : null;
}

export function subscribeToRecordings(callback, onError) {
  return onSnapshot(
    query(collection(db, "recordings"), orderBy("startedAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    onError
  );
}

export function subscribeToRecording(attemptId, callback, onError) {
  return onSnapshot(recordingDocRef(attemptId), (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
}

export function subscribeToRecordingChunks(attemptId, callback, onError) {
  return onSnapshot(
    query(collection(db, "recordings", attemptId, "chunks"), orderBy("index", "asc")),
    (snapshot) => callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    onError
  );
}

export async function mergeRecordingChunks(attemptId, options = {}) {
  const mergeFn = httpsCallable(functions, "mergeRecordingChunks");
  const result = await mergeFn({ attemptId, force: Boolean(options.force) });
  return result.data;
}
