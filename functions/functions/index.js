const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onObjectDeleted } = require("firebase-functions/v2/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", memory: "1GiB", timeoutSeconds: 540 });

const db = admin.firestore();
const bucket = admin.storage().bucket();
const FieldValue = admin.firestore.FieldValue;
const { apiApp } = require("./api");

function parseQuizRecordingStoragePath(objectName = "") {
  const name = String(objectName || "").trim();
  const parts = name.split("/").filter(Boolean);

  if (parts[0] !== "quiz-recordings" || parts.length < 4) {
    return null;
  }

  const studentId = parts[1] || "";
  const quizId = parts[2] || "";
  let attemptId = parts[3] || "";
  let kind = "recording";
  let chunkDocId = "";

  if (parts.length === 4 && /\.[a-z0-9]+$/i.test(attemptId)) {
    attemptId = attemptId.replace(/\.[^.]+$/i, "");
    kind = "legacy";
  } else if (parts[4] === "final") {
    kind = "final";
  } else if (parts[4] === "chunks") {
    kind = "chunk";
    chunkDocId = parts[5] ? parts[5].replace(/\.[^.]+$/i, "") : "";
  }

  if (!/^[A-Za-z0-9_-]{3,160}$/.test(attemptId)) {
    return null;
  }

  return {
    name,
    studentId,
    quizId,
    attemptId,
    kind,
    chunkDocId
  };
}

async function deleteRecordingDocumentWithChunks(recordingRef) {
  while (true) {
    const chunksSnapshot = await recordingRef.collection("chunks").limit(500).get();
    if (chunksSnapshot.empty) break;

    const batch = db.batch();
    chunksSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (chunksSnapshot.size < 500) break;
  }

  await recordingRef.delete();
}

async function clearAttemptRecordingReferences(attemptId, deletedPath) {
  const refsByPath = new Map();
  const addDocs = (snapshot) => {
    snapshot.docs.forEach((doc) => refsByPath.set(doc.ref.path, doc.ref));
  };

  const byAttemptId = await db.collectionGroup("attempts")
    .where("recordingAttemptId", "==", attemptId)
    .limit(50)
    .get();
  addDocs(byAttemptId);

  if (deletedPath) {
    const byPath = await db.collectionGroup("attempts")
      .where("recordingPath", "==", deletedPath)
      .limit(50)
      .get();
    addDocs(byPath);
  }

  if (refsByPath.size === 0) return 0;

  const batch = db.batch();
  refsByPath.forEach((ref) => {
    batch.update(ref, {
      recordingUrl: FieldValue.delete(),
      recordingPath: FieldValue.delete(),
      recordingAttemptId: FieldValue.delete(),
      recordingDeletedAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
  return refsByPath.size;
}

function assertAdmin(request) {
  const adminEmails = String(process.env.ADMIN_EMAILS || "sanskarpatil838@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = String(request.auth?.token?.email || "").toLowerCase();

  if (!request.auth || !adminEmails.includes(email)) {
    throw new HttpsError("permission-denied", "Admin access is required.");
  }
}

function assertAttemptId(value) {
  const attemptId = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(attemptId)) {
    throw new HttpsError("invalid-argument", "A valid attemptId is required.");
  }
  return attemptId;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
  });
}

async function cleanupDir(dir) {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

function isMergedRecording(recording = {}) {
  return recording.status === "merged" && recording.finalVideoUrl;
}

function isMergingRecording(recording = {}) {
  return recording.status === "merging";
}

async function claimRecordingForMerge(recordingRef, attemptId, force = false) {
  let claimResult = null;

  await db.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(recordingRef);
    if (!latestSnapshot.exists) {
      throw new HttpsError("not-found", "Recording was not found.");
    }

    const latestRecording = latestSnapshot.data() || {};
    if (isMergedRecording(latestRecording) && !force) {
      claimResult = {
        attemptId,
        finalVideoUrl: latestRecording.finalVideoUrl,
        finalVideoPath: latestRecording.finalVideoPath,
        alreadyMerged: true
      };
      return;
    }

    if (isMergingRecording(latestRecording) && !force) {
      claimResult = {
        attemptId,
        status: "merging",
        alreadyMerging: true
      };
      return;
    }

    if (latestRecording.status === "recording") {
      throw new HttpsError("failed-precondition", "Recording is still in progress.");
    }

    if (Number(latestRecording.failedChunkCount || 0) > 0) {
      throw new HttpsError("failed-precondition", "Recording has failed chunk uploads and cannot be merged safely.");
    }

    transaction.update(recordingRef, {
      status: "merging",
      mergeStartedAt: FieldValue.serverTimestamp(),
      mergeError: admin.firestore.FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return claimResult;
}

async function mergeRecordingByAttemptId(attemptId, options = {}) {
  const recordingRef = db.collection("recordings").doc(attemptId);
  const snapshot = await recordingRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Recording was not found.");
  }

  const recording = snapshot.data() || {};
  if (isMergedRecording(recording) && !options.force) {
    return {
      attemptId,
      finalVideoUrl: recording.finalVideoUrl,
      finalVideoPath: recording.finalVideoPath,
      alreadyMerged: true
    };
  }

  if (isMergingRecording(recording) && !options.force) {
    return {
      attemptId,
      status: "merging",
      alreadyMerging: true
    };
  }

  if (recording.status === "recording") {
    throw new HttpsError("failed-precondition", "Recording is still in progress.");
  }

  if (Number(recording.failedChunkCount || 0) > 0) {
    throw new HttpsError("failed-precondition", "Recording has failed chunk uploads and cannot be merged safely.");
  }

  const chunksSnapshot = await recordingRef.collection("chunks").orderBy("index", "asc").get();
  const chunks = chunksSnapshot.docs
    .map((entry) => entry.data())
    .filter((chunk) => chunk.status === "uploaded");

  if (!chunks.length) {
    throw new HttpsError("failed-precondition", "Recording has no uploaded chunks.");
  }

  const expectedChunkCount = Math.max(Number(recording.chunkCount || 0), chunks.length);
  if (chunks.length !== expectedChunkCount) {
    throw new HttpsError("failed-precondition", `Recording is missing ${expectedChunkCount - chunks.length} uploaded chunk(s).`);
  }

  for (let expectedIndex = 1; expectedIndex <= expectedChunkCount; expectedIndex += 1) {
    if (Number(chunks[expectedIndex - 1].index) !== expectedIndex) {
      throw new HttpsError("failed-precondition", `Recording is missing chunk ${expectedIndex}.`);
    }
  }

  const claimResult = await claimRecordingForMerge(recordingRef, attemptId, Boolean(options.force));
  if (claimResult) return claimResult;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `recording-${attemptId}-`));
  const finalLocalPath = path.join(tempDir, "full-recording.webm");
  const joinedLocalPath = path.join(tempDir, "joined-recording.webm");

  try {
    const studentId = String(recording.studentId || "").trim();
    const quizId = String(recording.quizId || "").trim();
    if (!studentId || !quizId) {
      throw new Error("Recording metadata is missing studentId or quizId.");
    }

    const localChunkPaths = [];

    for (const chunk of chunks) {
      const chunkPath = String(chunk.path || "");
      if (!chunkPath) continue;
      const localPath = path.join(tempDir, `chunk_${String(chunk.index).padStart(4, "0")}.webm`);
      await bucket.file(chunkPath).download({ destination: localPath });
      localChunkPaths.push(localPath);
    }

    if (!localChunkPaths.length) {
      throw new Error("No chunk files could be downloaded.");
    }

    const writeHandle = await fs.open(joinedLocalPath, "w");
    try {
      for (const chunkPath of localChunkPaths) {
        const chunkBuffer = await fs.readFile(chunkPath);
        await writeHandle.write(chunkBuffer);
      }
    } finally {
      await writeHandle.close();
    }

    try {
      await runFfmpeg([
        "-hide_banner",
        "-y",
        "-i",
        joinedLocalPath,
        "-c",
        "copy",
        finalLocalPath
      ]);
    } catch (remuxError) {
      console.warn("Byte-ordered WebM remux failed; uploading byte-joined recording", remuxError);
      await fs.copyFile(joinedLocalPath, finalLocalPath);
    }

    const finalVideoPath = `quiz-recordings/${studentId}/${quizId}/${attemptId}/final/full-recording.webm`;
    const downloadToken = crypto.randomUUID();
    await bucket.upload(finalLocalPath, {
      destination: finalVideoPath,
      metadata: {
        contentType: "video/webm",
        metadata: {
          studentId,
          quizId,
          attemptId,
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    const finalVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(finalVideoPath)}?alt=media&token=${downloadToken}`;

    await recordingRef.update({
      status: "merged",
      finalVideoUrl,
      finalVideoPath,
      mergeEndedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { attemptId, finalVideoUrl, finalVideoPath };
  } catch (error) {
    console.error("Recording merge failed", error);
    const errorMessage = String(error.message || error || "Unknown merge error");
    await recordingRef.update({
      status: "failed",
      mergeError: errorMessage,
      mergeEndedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    throw new HttpsError("internal", `Recording merge failed: ${errorMessage}`);
  } finally {
    await cleanupDir(tempDir);
  }
}

exports.mergeRecordingChunks = onCall(async (request) => {
  assertAdmin(request);
  const attemptId = assertAttemptId(request.data?.attemptId);
  return mergeRecordingByAttemptId(attemptId, {
    force: Boolean(request.data?.force)
  });
});

exports.autoMergeRecordingChunks = onDocumentWritten("recordings/{attemptId}", async (event) => {
  const afterSnapshot = event.data?.after;
  if (!afterSnapshot?.exists) return null;

  const recording = afterSnapshot.data() || {};
  if (recording.status !== "completed") return null;
  if (recording.finalVideoUrl || Number(recording.failedChunkCount || 0) > 0) return null;

  const beforeSnapshot = event.data?.before;
  const previous = beforeSnapshot?.exists ? beforeSnapshot.data() || {} : {};
  const sameCompletedState = previous.status === "completed"
    && previous.chunkCount === recording.chunkCount
    && previous.failedChunkCount === recording.failedChunkCount;
  if (sameCompletedState) return null;

  try {
    return await mergeRecordingByAttemptId(assertAttemptId(event.params.attemptId));
  } catch (error) {
    console.error("Automatic recording merge failed", {
      attemptId: event.params.attemptId,
      error: error?.message || error
    });
    return null;
  }
});

exports.cleanupDeletedQuizRecording = onObjectDeleted({ region: "us-east1" }, async (event) => {
  const deletedObjectName = event.data?.name || "";
  const recordingPath = parseQuizRecordingStoragePath(deletedObjectName);
  if (!recordingPath) return null;

  const recordingRef = db.collection("recordings").doc(recordingPath.attemptId);
  const recordingSnapshot = await recordingRef.get();
  const recording = recordingSnapshot.exists ? recordingSnapshot.data() || {} : {};
  const hasFinalRecording = Boolean(recording.finalVideoPath || recording.finalVideoUrl);

  if (recordingPath.kind === "chunk" && hasFinalRecording) {
    const chunkRef = recordingRef.collection("chunks").doc(recordingPath.chunkDocId || "deleted_chunk");
    await chunkRef.set({
      status: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      storagePath: recordingPath.name
    }, { merge: true });
    return null;
  }

  await Promise.all([
    deleteRecordingDocumentWithChunks(recordingRef),
    clearAttemptRecordingReferences(recordingPath.attemptId, recordingPath.name)
  ]);

  console.log("Cleaned deleted quiz recording from admin metadata", {
    attemptId: recordingPath.attemptId,
    storagePath: recordingPath.name,
    kind: recordingPath.kind
  });

  return null;
});

exports.api = onRequest(apiApp);
