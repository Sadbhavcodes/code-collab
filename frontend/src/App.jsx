import { useState } from "react";
import { isAuthenticated, getUsername, logout } from "./services/authService";
import LoginPage    from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import RoomModal    from "./components/RoomModal";
import RoomPage     from "./components/RoomPage";

/* ── SVG icons ─────────────────────────────────────────────── */
function IconRocket({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l-.55-.55"/>
      <path d="M12 8L6.7 13.3c-.4.4-.4 1 0 1.4l2.6 2.6c.4.4 1 .4 1.4 0L16 12"/>
      <path d="M14 6.5l3.5 3.5"/>
      <path d="M22 2l-7.5 7.5M22 2l-5 .5.5-5"/>
    </svg>
  );
}

function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function IconHistory({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );
}

function IconUsers({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBarChart({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function IconLogout({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function IconUser({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

/* ── App ────────────────────────────────────────────────────── */
export default function App() {
  const [authView, setAuthView] = useState(() =>
    isAuthenticated() ? "app" : "register"
  );
  const [username, setUsername] = useState(() => getUsername());
  const [open, setOpen]         = useState(false);
  const [roomId, setRoomId]     = useState(null);

  const handleAuthSuccess = () => {
    setUsername(getUsername());
    setAuthView("app");
  };

  const handleLogout = () => {
    logout();
    setRoomId(null);
    setAuthView("login");
  };

  /* Auth screens */
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

  /* Main app shell */
  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <span className="topbar-logo">CodeCollab</span>

        <nav className="topbar-nav">
          <button className="topbar-nav-link active">Home</button>
        </nav>

        {roomId && (
          <div className="topbar-room-badge">
            <span className="dot" />
            {roomId}
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {!roomId && (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              Join Room
            </button>
          )}
          <button className="btn-icon" title={username} aria-label="User profile">
            <IconUser size={15} />
          </button>
          <button className="btn-ghost" onClick={handleLogout}>
            <IconLogout size={13} />
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="main-layout">
        <div className="content-area">
          {!roomId ? (
            <>
              <div className="home-page">
                {/* Status */}
                <div className="home-status-badge">
                  <span className="home-status-dot" />
                  System Live
                </div>

                {/* Hero */}
                <div className="home-hero">
                  <h1 className="home-hero-title">
                    Hello, <span>{username}</span>
                  </h1>
                  <p className="home-hero-subtitle">
                    Ready to bridge the gap? Dive into your collaborative workspace.
                    Code, review, and ship faster together.
                  </p>
                </div>

                {/* CTAs */}
                <div className="home-cta-row">
                  <button className="btn-cta-primary" onClick={() => setOpen(true)}>
                    <IconRocket size={16} />
                    Join Room
                  </button>
                  <button className="btn-cta-secondary" onClick={() => setOpen(true)}>
                    <IconPlus size={16} />
                    Create New Session
                  </button>
                </div>

                {/* Info cards */}
                <div className="home-cards">
                  <div className="home-card">
                    <div className="home-card-icon">
                      <IconHistory size={18} />
                    </div>
                    <p className="home-card-title">Recent Rooms</p>
                    <p className="home-card-desc">
                      Continue where you left off in a previous collaboration session.
                    </p>
                  </div>

                  <div className="home-card">
                    <div className="home-card-icon">
                      <IconUsers size={18} />
                    </div>
                    <p className="home-card-title">Active Peers</p>
                    <p className="home-card-desc">
                      See who&apos;s currently live and collaborate in real time.
                    </p>
                  </div>

                  <div className="home-card">
                    <div className="home-card-icon">
                      <IconBarChart size={18} />
                    </div>
                    <p className="home-card-title">Session Metrics</p>
                    <p className="home-card-desc">
                      Track your pair-programming activity and session history.
                    </p>
                  </div>
                </div>
              </div>

              {/* Connected chip */}
              <div className="connected-chip">
                <div className="connected-chip-avatar">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="connected-chip-label">Connected as</p>
                  <p className="connected-chip-name">{username}</p>
                </div>
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
