import { useState } from "react";

/**
 * RoomModal — only asks for a Room ID.
 * Username is sourced from the authenticated session (authService),
 * so there's no need to ask the user to type it again.
 *
 * Props:
 *   onClose  () => void
 *   onJoin   (roomId: string) => void
 */
export default function RoomModal({ onClose, onJoin }) {
  const [roomId, setRoomId] = useState("");

  const joinRoom = () => {
    const trimmed = roomId.trim();
    if (!trimmed) return;
    onJoin(trimmed);
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
              Enter a Room ID to connect with your team in a live coding session.
            </p>
          </div>

          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Room ID Input */}
        <div className="modal-field">
          <label className="modal-label" htmlFor="room-id-input">
            Room ID
          </label>

          <div className="modal-input-wrap">
            <input
              id="room-id-input"
              className="modal-input"
              type="text"
              placeholder="e.g. alpha-bravo-123"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              autoFocus
            />
            <span className="modal-input-icon">⊞</span>
          </div>
        </div>

        {/* Join button */}
        <button
          className="btn-join"
          onClick={joinRoom}
          disabled={!roomId.trim()}
        >
          Join Room →
        </button>

        {/* Footer */}
        <p className="modal-footer">
          Your session name is your registered username.
        </p>

      </div>
    </div>
  );
}