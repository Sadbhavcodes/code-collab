import { useEffect, useState } from "react";
import CodeEditor from "./CodeEditor";
import ChatPanel from "./ChatPanel";
import { sendMessage, disconnectSocket } from "../services/websocketService";

export default function RoomPage({ roomId, username, onLeave }) {
  const [activeLanguage, setActiveLanguage] = useState("javascript");

  useEffect(() => {
    // Component mounted for the room
    return () => {
      // Cleanup on unmount
    };
  }, []);

  const handleLeave = () => {
    sendMessage({ type: "LEAVE", roomId });
    // disconnectSocket nulls the module-level socket before closing,
    // preventing connectSocket() from reusing a CLOSING socket on rejoin
    disconnectSocket();
    onLeave();
  };

  const LANG_LABELS = {
    javascript: "JavaScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
  };

  return (
    <div className="room-layout">

      {/* Editor + Chat */}
      <div className="room-content">

        {/* Editor pane */}
        <div className="editor-pane">
          <div className="editor-tabs">
            <div className="editor-tab active">
              <span className="editor-tab-dot" style={{ background: "#f97316" }} />
              main.ts
            </div>
            <div className="editor-tab">
              <span className="editor-tab-dot" style={{ background: "#3b82f6" }} />
              server.py
            </div>
            <div className="editor-tab">
              <span className="editor-tab-dot" style={{ background: "#22c55e" }} />
              config.json
            </div>
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
        <span className="statusbar-item">⬡ 4 Active Developers</span>
        <span className="statusbar-item">⚡ Latency: 14ms</span>
        <span className="statusbar-item">🔒 E2E Encrypted</span>
        <span className="statusbar-spacer" />
        <span className="statusbar-item statusbar-lang">
          <span className="statusbar-lang-dot" />
          {LANG_LABELS[activeLanguage] || activeLanguage}
        </span>
        <span className="statusbar-item">Room: {roomId}</span>
        <button className="btn-leave" onClick={handleLeave}>Leave</button>
      </div>

    </div>
  );
}
