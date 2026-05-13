import { useEffect, useMemo, useState } from "react";
import {
  mergeRecordingChunks,
  subscribeToRecording,
  subscribeToRecordingChunks
} from "../recording/recordingService";
import "./recordingAdmin.css";

function sortChunks(chunks = []) {
  return [...chunks].sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
}

function getMergeStateMessage({ recording, uploadedChunkCount, failedChunkCount, mergeBusy }) {
  if (!recording) return "";
  if (recording.finalVideoUrl) return "";
  if (recording.status === "recording") {
    return `Recording is still in progress. ${uploadedChunkCount} chunk${uploadedChunkCount === 1 ? "" : "s"} saved so far.`;
  }
  if (recording.status === "merging" || mergeBusy) {
    return "Preparing the full merged video. Only the final recording will be shown here.";
  }
  if (failedChunkCount > 0) {
    return `A complete merged video is unavailable because ${failedChunkCount} chunk${failedChunkCount === 1 ? "" : "s"} failed to upload.`;
  }
  if (uploadedChunkCount > 0) {
    return "Queued for automatic merge. The chunk files are stored, but only the full recording is shown here.";
  }
  return "No uploaded recording chunks were found for this attempt.";
}

export default function AdminRecordingDetails({ attemptId, onBack }) {
  const [recording, setRecording] = useState(null);
  const [rawChunks, setRawChunks] = useState([]);
  const [error, setError] = useState("");
  const [mergeBusy, setMergeBusy] = useState(false);
  const [autoMergeAttemptId, setAutoMergeAttemptId] = useState("");
  const chunks = useMemo(() => sortChunks(rawChunks).filter((chunk) => chunk.status !== "failed"), [rawChunks]);
  const failedChunks = useMemo(() => sortChunks(rawChunks).filter((chunk) => chunk.status === "failed"), [rawChunks]);
  const uploadedChunkCount = Number(recording?.chunkCount || chunks.length || 0);
  const failedChunkCount = Number(recording?.failedChunkCount || failedChunks.length || 0);
  const canAutoMerge = Boolean(
    attemptId
      && recording
      && !recording.finalVideoUrl
      && recording.status === "completed"
      && uploadedChunkCount > 0
      && failedChunkCount === 0
  );
  const canRetryMerge = Boolean(
    attemptId
      && recording
      && !recording.finalVideoUrl
      && recording.status !== "recording"
      && uploadedChunkCount > 0
      && failedChunkCount === 0
  );

  useEffect(() => {
    if (!attemptId) return undefined;
    return subscribeToRecording(attemptId, setRecording, (err) => {
      console.error("Could not load recording", err);
      setError(err.message || "Could not load recording.");
    });
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return undefined;
    return subscribeToRecordingChunks(attemptId, setRawChunks, (err) => {
      console.error("Could not load recording chunks", err);
      setError(err.message || "Could not load recording chunks.");
    });
  }, [attemptId]);

  async function handleMerge(markAutoQueued = false, force = false) {
    if (markAutoQueued) setAutoMergeAttemptId(attemptId);
    setMergeBusy(true);
    setError("");
    try {
      await mergeRecordingChunks(attemptId, { force });
    } catch (err) {
      console.error("Merge failed", err);
      setError(err.message || "Merge failed.");
    } finally {
      setMergeBusy(false);
    }
  }

  useEffect(() => {
    if (!canAutoMerge || autoMergeAttemptId === attemptId) return;
    void handleMerge(true);
  }, [attemptId, autoMergeAttemptId, canAutoMerge]);

  if (!attemptId) return null;

  const mergeStateMessage = getMergeStateMessage({
    recording,
    uploadedChunkCount,
    failedChunkCount,
    mergeBusy
  });

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h2>Recording Details</h2>
          <p>{attemptId}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          Back
        </button>
      </div>

      {error ? <p className="auth-status error">{error}</p> : null}
      {!recording ? <p>Loading recording...</p> : null}

      {recording ? (
        <>
          <div className="recording-detail-grid">
            <div><strong>Student ID</strong><span>{recording.studentId}</span></div>
            <div><strong>Quiz ID</strong><span>{recording.quizId}</span></div>
            <div><strong>Status</strong><span>{recording.status}</span></div>
            <div><strong>Chunks</strong><span>{uploadedChunkCount}</span></div>
            <div><strong>Failed Chunks</strong><span>{failedChunkCount}</span></div>
          </div>

          {recording.finalVideoUrl ? (
            <div className="recording-player-block">
              <h3>Full Recording</h3>
              <video src={recording.finalVideoUrl} controls playsInline preload="metadata" />
            </div>
          ) : (
            <div className="recording-player-block">
              <div className="recording-merge-state">
                <strong>Full Recording</strong>
                <span>{mergeStateMessage}</span>
                {canRetryMerge && !mergeBusy ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleMerge(false, recording.status === "merging")}
                  >
                    {recording.status === "merging" ? "Restart merge" : "Retry merge"}
                  </button>
                ) : null}
              </div>
              {failedChunks.length ? (
                <div className="failed-chunk-list">
                  <h3>Failed Chunks</h3>
                  {failedChunks.map((chunk) => (
                    <p key={chunk.id}>Chunk {chunk.index}: {chunk.error || "Upload failed"}</p>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
