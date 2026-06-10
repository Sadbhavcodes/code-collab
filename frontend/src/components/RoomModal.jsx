import { useState } from "react";

function IconDoor({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/>
      <path d="M13 4l7 5"/>
      <path d="M13 4v5h7"/>
    </svg>
  );
}

function IconKey({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  );
}

function IconArrowRight({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function IconClose({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/**
 * RoomModal — prompts for a Room ID and joins.
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-header-icon">
              <IconDoor size={18} />
            </span>
            <h2 className="modal-title">Join a Room</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconClose size={14} />
          </button>
        </div>

        {/* Room ID field */}
        <div className="modal-field">
          <label className="modal-label" htmlFor="room-id-input">
            Enter Room ID
          </label>
          <div className="modal-input-wrap">
            <span className="modal-input-icon-slot">
              <IconKey size={15} />
            </span>
            <input
              id="room-id-input"
              className="modal-input"
              type="text"
              placeholder="e.g. CODE-1234-XYZ"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              autoFocus
            />
          </div>
          <span className="modal-hint">IDs are case-sensitive.</span>
        </div>

        {/* Join button */}
        <button
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          onClick={joinRoom}
          disabled={!roomId.trim()}
        >
          Join Room
          <IconArrowRight size={15} />
        </button>

        {/* Footer meta */}
        <div className="modal-footer-meta">
          <span className="modal-active-sessions">
            <span className="modal-active-dot" />
            Your session name is your registered username
          </span>
        </div>

      </div>
    </div>
  );
}
