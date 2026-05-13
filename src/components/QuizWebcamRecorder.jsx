import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeRecordingDocument,
  createRecordingDocument,
  failRecordingDocument,
  RECORDING_MIME_TYPE,
  RECORDING_TIMESLICE_MS,
  retryUploadChunk
} from "../recording/recordingService";

const VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 15, max: 15 }
};

function getRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MediaRecorder.isTypeSupported(RECORDING_MIME_TYPE) ? RECORDING_MIME_TYPE : "video/webm";
}

export default function QuizWebcamRecorder({
  studentId,
  quizId,
  attemptId,
  isQuizActive,
  onReady,
  onStopped,
  className = ""
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const pendingUploadsRef = useRef(new Set());
  const [status, setStatus] = useState("idle");
  const [warning, setWarning] = useState("");
  const [lastUpload, setLastUpload] = useState("");

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const waitForPendingUploads = useCallback(async () => {
    await Promise.allSettled(Array.from(pendingUploadsRef.current));
  }, []);

  const uploadChunk = useCallback((blob) => {
    chunkIndexRef.current += 1;
    const index = chunkIndexRef.current;
    const uploadPromise = retryUploadChunk({
      blob,
      studentId,
      quizId,
      attemptId,
      index,
      onProgress: (percent) => setLastUpload(`Chunk ${index}: ${percent}%`)
    }).finally(() => {
      pendingUploadsRef.current.delete(uploadPromise);
    });

    pendingUploadsRef.current.add(uploadPromise);
  }, [attemptId, quizId, studentId]);

  const startRecording = useCallback(async () => {
    if (!studentId || !quizId || !attemptId) {
      throw new Error("studentId, quizId, and attemptId are required for recording.");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone access is not supported in this browser.");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder is not supported in this browser.");
    }

    setWarning("");
    setStatus("requesting-permission");
    chunkIndexRef.current = 0;
    pendingUploadsRef.current.clear();

    await createRecordingDocument({ studentId, quizId, attemptId });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: VIDEO_CONSTRAINTS,
      audio: true
    });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play().catch(() => {});
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: getRecorderMimeType(),
      videoBitsPerSecond: 300000,
      audioBitsPerSecond: 64000
    });

    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) uploadChunk(event.data);
    };

    recorder.onerror = (event) => {
      console.warn("MediaRecorder error", event.error || event);
      setWarning("Recording had an issue, but the quiz can continue.");
    };

    recorder.onstart = () => {
      setStatus("recording");
      onReady?.();
    };

    recorderRef.current = recorder;
    recorder.start(RECORDING_TIMESLICE_MS);
  }, [attemptId, onReady, quizId, studentId, uploadChunk]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      stopTracks();
      return;
    }

    setStatus("stopping");
    await new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
      if (recorder.state !== "inactive") {
        if (typeof recorder.requestData === "function") recorder.requestData();
        recorder.stop();
      } else {
        resolve();
      }
    });

    recorderRef.current = null;
    stopTracks();
    await waitForPendingUploads();
    await completeRecordingDocument(attemptId);
    setStatus("completed");
    onStopped?.();
  }, [attemptId, onStopped, stopTracks, waitForPendingUploads]);

  useEffect(() => {
    if (!isQuizActive) return undefined;

    startRecording().catch(async (error) => {
      console.error("Recording could not start", error);
      setWarning(error.message || "Recording could not start.");
      setStatus("failed");
      if (attemptId) await failRecordingDocument(attemptId, error).catch(() => {});
    });

    return () => {
      stopRecording().catch((error) => {
        console.warn("Recording cleanup failed", error);
      });
    };
  }, [attemptId, isQuizActive, startRecording, stopRecording]);

  return (
    <section className={`recording-panel ${className}`}>
      <video ref={videoRef} className="recording-preview" autoPlay muted playsInline />
      <div className="recording-copy">
        <strong>Quiz Recording</strong>
        <span>{status}</span>
        <span>{lastUpload || "Waiting for first chunk"}</span>
        {warning ? <span className="recording-warning">{warning}</span> : null}
      </div>
    </section>
  );
}
