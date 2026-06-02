import { useState } from "react";
import RoomModal from "./components/RoomModal";
import RoomPage from "./components/RoomPage";

function App() {
  const [open, setOpen] = useState(false);
  const [roomData, setRoomData] = useState(null);

  return (
    <div className="app-shell">

      {/* Top nav bar */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">D</div>
          Code Collab
        </div>

        {roomData && (
          <div className="topbar-room-badge">
            <span className="dot" />
            {roomData.roomId}
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {!roomData && (
            <button className="btn-deploy" onClick={() => setOpen(true)}>
              JOIN ROOM
            </button>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="main-layout">

        {/* Sidebar icons */}
        <aside className="sidebar">
          <div className="sidebar-icon active" title="Explorer">⊞</div>
          <div className="sidebar-icon" title="Chat">💬</div>
          <div className="sidebar-icon" title="Collaborators">👥</div>
          <div className="sidebar-icon" title="Files">📄</div>
          <div className="sidebar-spacer" />
          <div className="sidebar-icon" title="Settings">⚙</div>
        </aside>

        {/* Content */}
        <div className="content-area">
          {!roomData ? (
            <>
              <div className="landing">
                <h1 className="landing-title">Realtime Collaboration</h1>
                <p className="landing-subtitle">Join a room to start coding together</p>
                <button className="btn-open-modal" onClick={() => setOpen(true)}>
                  Join Room
                </button>
              </div>

              {open && (
                <RoomModal
                  onClose={() => setOpen(false)}
                  onJoin={(data) => {
                    setRoomData(data);
                    setOpen(false);
                  }}
                />
              )}
            </>
          ) : (
            <RoomPage
              roomId={roomData.roomId}
              onLeave={() => setRoomData(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;