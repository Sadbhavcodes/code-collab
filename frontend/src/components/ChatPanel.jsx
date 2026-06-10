import { useEffect, useState, useRef } from "react";
import { subscribe, unsubscribe, sendMessage } from "../services/websocketService";

function IconSend({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IconChat({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconUsers({ size = 14 }) {
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

export default function ChatPanel({ roomId, username }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const roomStateHandled = useRef(false);
  const messagesEndRef = useRef(null);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleRoomState = (data) => {
      if (!roomStateHandled.current && data?.messages) {
        roomStateHandled.current = true;
        setMessages(
          data.messages.map((msg) => ({
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp || "",
          }))
        );
      }
    };

    const handleRoomUsers = (data) => {
      if (data?.users) setUsers(data.users);
    };

    const handleChatMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        { content: data.content, sender: data.sender, timestamp: "" },
      ]);
    };

    subscribe("ROOM_STATE", handleRoomState);
    subscribe("ROOM_USERS", handleRoomUsers);
    subscribe("CHAT", handleChatMessage);

    return () => {
      unsubscribe("ROOM_STATE", handleRoomState);
      unsubscribe("ROOM_USERS", handleRoomUsers);
      unsubscribe("CHAT", handleChatMessage);
    };
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage({
      type: "CHAT",
      content: message,
      sender: username || "Anonymous",
      roomId,
    });
    setMessage("");
  };

  return (
    <div className="chat-pane">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <p className="chat-header-title">Room Chat</p>
          <p className="chat-header-sub">Active Session: {roomId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="chat-tabs">
        <button
          className={`chat-tab${activeTab === "chat" ? " active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <IconChat size={13} />
          Chat
        </button>
        <button
          className={`chat-tab${activeTab === "collaborators" ? " active" : ""}`}
          onClick={() => setActiveTab("collaborators")}
        >
          <IconUsers size={13} />
          Collaborators
        </button>
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">
                No messages yet.<br />Start the conversation.
              </p>
            )}

            {messages.map((msg, idx) => {
              const isSelf = msg.sender === username;
              return (
                <div
                  key={idx}
                  className={`chat-bubble${isSelf ? " chat-bubble-self" : ""}`}
                >
                  <div className="chat-bubble-meta">
                    <div className="chat-avatar">
                      {msg.sender ? msg.sender.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span className="chat-sender">
                      {isSelf ? "You" : (msg.sender || "User")}
                    </span>
                    {msg.timestamp && (
                      <span className="chat-time">{msg.timestamp}</span>
                    )}
                  </div>
                  <p className="chat-text">{msg.content}</p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button className="btn-send" onClick={handleSend} aria-label="Send message">
                <IconSend size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collaborators tab */}
      {activeTab === "collaborators" && (
        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {users.length === 0 ? (
            <p className="chat-empty">No collaborators online yet.</p>
          ) : (
            users.map((user, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background: "var(--surface-container)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--outline-var)",
                }}
              >
                <div className="chat-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                </div>
                <span style={{ fontSize: 13, color: "var(--on-surface)", fontWeight: 500 }}>
                  {user.username}
                  {user.username === username && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                      (you)
                    </span>
                  )}
                </span>
                <span style={{
                  marginLeft: "auto",
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--green)",
                  boxShadow: "0 0 5px var(--green)",
                  flexShrink: 0,
                }} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
