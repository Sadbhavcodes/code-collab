import { useEffect, useState } from "react";

export default function ChatPanel({ socket }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Messages received: ", data);
      setMessages((prev) => [...prev, data.content]);
    };
  }, [socket]);

  const sendMessage = () => {
    if (!message.trim()) return;
    console.log("Sending message: ", message);
    socket.send(JSON.stringify({ type: "CHAT", content: message }));
    setMessage("");
  };

  return (
    <div className="chat-pane">

      <div className="chat-header">
        <span className="chat-header-title">Project Chat</span>
        <span style={{ fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>✎</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>
            No messages yet
          </p>
        )}
        {messages.map((msg, idx) => (
          <div className="chat-bubble" key={idx}>
            <div className="chat-bubble-meta">
              <div className="chat-avatar">U</div>
              <span className="chat-sender">User</span>
              <span className="chat-time">just now</span>
            </div>
            <p className="chat-text">{msg}</p>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Message #room-chat"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="btn-send" onClick={sendMessage}>↑</button>
      </div>

    </div>
  );
}
