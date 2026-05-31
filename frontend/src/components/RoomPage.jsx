import CodeEditor from "./CodeEditor";
import ChatPanel from "./ChatPanel";

export default function RoomPage({ roomId, socket, onLeave }) {
  const handleLeave = () => {
    socket.send(JSON.stringify({ type: "LEAVE" }));
    socket.close();
    onLeave();
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
            <CodeEditor />
          </div>
        </div>

        {/* Chat pane */}
        <ChatPanel socket={socket} />

      </div>

      {/* Status bar */}
      <div className="statusbar">
        <span className="statusbar-item">⬡ 4 Active Developers</span>
        <span className="statusbar-item">⚡ Latency: 14ms</span>
        <span className="statusbar-item">🔒 E2E Encrypted</span>
        <span className="statusbar-spacer" />
        <span className="statusbar-item">Room: {roomId}</span>
        <button className="btn-leave" onClick={handleLeave}>Leave</button>
      </div>

    </div>
  );
}
