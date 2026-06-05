import { useState } from "react";

export default function RoomModal({ onClose, onJoin }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) return;
    // CodeEditor handles connectSocket + JOIN after its subscriptions are live
    onJoin({ roomId, username });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon">✦</div>
            <h2 className="modal-title">Join Collaboration Room</h2>
            <p className="modal-subtitle">
              Connect with your team in a high-fidelity sync session.
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Username Input */}
        <div className="modal-field">
          <label className="modal-label">
            Enter Username
          </label>

          <div className="modal-input-wrap">
            <input
              className="modal-input"
              type="text"
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                joinRoom()
              }
            />

            <span className="modal-input-icon">
              👤
            </span>
          </div>
        </div>

        {/* Room ID Input */}
        <div className="modal-field">
          <label className="modal-label">
            Enter Room ID
          </label>

          <div className="modal-input-wrap">
            <input
              className="modal-input"
              type="text"
              placeholder="e.g. alpha-bravo-123"
              value={roomId}
              onChange={(e) =>
                setRoomId(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                joinRoom()
              }
            />

            <span className="modal-input-icon">
              ⊞
            </span>
          </div>
        </div>

        {/* Join button */}
        <button
          className="btn-join"
          onClick={joinRoom}
        >
          Join Room →
        </button>

        {/* Footer */}
        <p className="modal-footer">
          Don't have a room?{" "}
          <button onClick={onClose}>
            Create New Room
          </button>
        </p>

      </div>
    </div>
  );
}