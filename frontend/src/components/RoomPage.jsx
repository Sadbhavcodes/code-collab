import { useEffect, useState } from "react";
import CodeEditor from "./CodeEditor";
import ChatPanel from "./ChatPanel";
import { sendMessage, disconnectSocket } from "../services/websocketService";

function IconSettings({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

const LANG_LABELS = {
  javascript: "JavaScript",
  python:     "Python",
  java:       "Java",
  cpp:        "C++",
};

export default function RoomPage({ roomId, username, onLeave }) {
  const [activeLanguage, setActiveLanguage] = useState("javascript");

  useEffect(() => {
    return () => {};
  }, []);

  const handleLeave = () => {
    sendMessage({ type: "LEAVE", roomId });
    disconnectSocket();
    onLeave();
  };

  return (
    <div className="room-layout">

      {/* Editor + Chat */}
      <div className="room-content">

        {/* Editor pane */}
        <div className="editor-pane">
          <div className="editor-topbar">
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              {roomId}
            </span>
            <div style={{ flex: 1 }} />
            <button className="btn-icon" title="Settings" aria-label="Settings">
              <IconSettings size={15} />
            </button>
          </div>
          <div className="editor-body">
            <CodeEditor
              roomId={roomId}
              username={username}
              onLanguageChange={setActiveLanguage}
            />
          </div>
        </div>

        {/* Chat pane */}
        <ChatPanel roomId={roomId} username={username} />
      </div>

      {/* Status bar */}
      <div className="statusbar">
        <span className="statusbar-item">
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#fff", display: "inline-block", opacity: 0.7
          }} />
          {roomId}
        </span>
        <span className="statusbar-spacer" />
        <span className="statusbar-item">
          {LANG_LABELS[activeLanguage] || activeLanguage}
        </span>
        <button className="btn-leave" onClick={handleLeave}>Leave</button>
      </div>

    </div>
  );
}
