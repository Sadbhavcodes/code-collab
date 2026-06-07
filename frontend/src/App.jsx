import { useState } from "react";
import { isAuthenticated, getUsername, logout } from "./services/authService";
import LoginPage    from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import RoomModal    from "./components/RoomModal";
import RoomPage     from "./components/RoomPage";

function App() {
  // Decide initial view based on stored token validity
  const [authView, setAuthView] = useState(() =>
    isAuthenticated() ? "app" : "register"
  );

  // username is read from localStorage (set by authService on login/register)
  // Re-read whenever authView changes to "app" by using a lazy initialiser per render
  const [username, setUsername] = useState(() => getUsername());

  const [open, setOpen]         = useState(false);
  const [roomId, setRoomId]     = useState(null);

  // Called after a successful login or register — refresh username from storage
  const handleAuthSuccess = () => {
    setUsername(getUsername());
    setAuthView("app");
  };

  const handleLogout = () => {
    logout();
    setRoomId(null);
    setAuthView("login");
  };

  // ── Auth screens ─────────────────────────────────────────────────
  if (authView === "register") {
    return (
      <RegisterPage
        onAuthSuccess={handleAuthSuccess}
        onGoLogin={() => setAuthView("login")}
      />
    );
  }

  if (authView === "login") {
    return (
      <LoginPage
        onAuthSuccess={handleAuthSuccess}
        onGoRegister={() => setAuthView("register")}
      />
    );
  }

  // ── Main app shell (authenticated) ───────────────────────────────
  return (
    <div className="app-shell">

      {/* Top nav bar */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">C</div>
          Code Collab
        </div>

        {roomId && (
          <div className="topbar-room-badge">
            <span className="dot" />
            {roomId}
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {/* Greeting */}
          <span className="topbar-greeting">
            <span className="topbar-greeting-wave">👋</span>
            Hello, <strong>{username}</strong>
          </span>

          {!roomId && (
            <button className="btn-deploy" onClick={() => setOpen(true)}>
              JOIN ROOM
            </button>
          )}

          <button
            className="btn-logout"
            onClick={handleLogout}
            title="Logout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
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
          {!roomId ? (
            <>
              <div className="landing">
                {/* Personalised greeting */}
                <div className="landing-greeting">
                  Hello, <span className="landing-greeting-name">{username}</span> 👋
                </div>
                <h1 className="landing-title">Realtime Collaboration</h1>
                <p className="landing-subtitle">
                  Join a room to start coding together with your team.
                </p>
                <button className="btn-open-modal" onClick={() => setOpen(true)}>
                  Join Room
                </button>
              </div>

              {open && (
                <RoomModal
                  onClose={() => setOpen(false)}
                  onJoin={(id) => {
                    setRoomId(id);
                    setOpen(false);
                  }}
                />
              )}
            </>
          ) : (
            <RoomPage
              roomId={roomId}
              username={username}
              onLeave={() => setRoomId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;