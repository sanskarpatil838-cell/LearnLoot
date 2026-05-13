import { useEffect, useState } from "react";
import { subscribeToRecordings } from "../recording/recordingService";
import "./recordingAdmin.css";

function formatTime(value) {
  if (!value) return "-";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function AdminRecordingsList({ onViewRecording }) {
  const [recordings, setRecordings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToRecordings(setRecordings, (err) => {
      console.error("Could not load recordings", err);
      setError(err.message || "Could not load recordings.");
    });
  }, []);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Quiz Recordings</h2>
      </div>

      {error ? <p className="auth-status error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Quiz ID</th>
              <th>Attempt ID</th>
              <th>Status</th>
              <th>Started At</th>
              <th>Ended At</th>
              <th>Recording</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((recording) => (
              <tr key={recording.attemptId}>
                <td>{recording.studentId}</td>
                <td>{recording.quizId}</td>
                <td>{recording.attemptId}</td>
                <td>
                  <span className={`status-pill status-${recording.status}`}>
                    {recording.status}
                  </span>
                </td>
                <td>{formatTime(recording.startedAt)}</td>
                <td>{formatTime(recording.endedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onViewRecording?.(recording.attemptId)}
                  >
                    View Recording
                  </button>
                </td>
              </tr>
            ))}
            {!recordings.length ? (
              <tr>
                <td colSpan="7">No recordings found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
