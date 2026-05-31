import { useState } from "react";

export default function RoomModal({ onClose, onJoin }) {
  const [roomId, setRoomId] = useState("");

  const joinRoom = () => {
    console.log("Join Button clicked");
    if (!roomId.trim()) return;

    const sock = new WebSocket("ws://localhost:8080/chat");
    sock.onopen = () => {
      console.log("Connected to websocket.");
      sock.send(JSON.stringify({ type: "JOIN", roomId }));
      onJoin({ roomId, socket: sock });
    };
    sock.onclose = () => console.log("Disconnected");
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
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Input */}
        <div className="modal-field">
          <label className="modal-label">Enter Room ID</label>
          <div className="modal-input-wrap">
            <input
              className="modal-input"
              type="text"
              placeholder="e.g. alpha-bravo-123"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            />
            <span className="modal-input-icon">⊞</span>
          </div>
        </div>

        {/* Join button */}
        <button className="btn-join" onClick={joinRoom}>
          Join Room →
        </button>

        {/* Footer */}
        <p className="modal-footer">
          Don't have a room?{" "}
          <button onClick={onClose}>Create New Room</button>
        </p>

      </div>
    </div>
  );
}
