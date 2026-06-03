import { useEffect, useState, useRef } from "react";
import {
  subscribe,
  unsubscribe,
  sendMessage
} from "../services/websocketService";

export default function ChatPanel({ roomId, username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const roomStateHandled = useRef(false);

  useEffect(() => {

    const handleRoomState = (data) => {
      // Load initial room state (messages) on join
      console.log("🔵 ChatPanel received ROOM_STATE:", data);
      if (!roomStateHandled.current && data && data.messages) {
        roomStateHandled.current = true;
        const initialMessages = data.messages.map((msg) => ({
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp || "just now",
        }));
        console.log("✅ Loading messages from ROOM_STATE:", initialMessages);
        setMessages(initialMessages);
      }
    };

    const handleRoomUsers = (data) => {
      console.log("🔵 ChatPanel received ROOM_USERS:", data);
      if (data && data.users) {
        setUsers(data.users);
      }
    };

    const handleChatMessage = (data) => {
      console.log("Message received:", data);

      setMessages(prev => [
        ...prev,
        {
          content: data.content,
          sender: data.sender,
          timestamp: "just now",
        }
      ]);
    };

    subscribe(
      "ROOM_STATE",
      handleRoomState
    );
    subscribe(
      "ROOM_USERS",
      handleRoomUsers
    );
    subscribe(
      "CHAT",
      handleChatMessage
    );

    return () => {
      unsubscribe(
        "ROOM_STATE",
        handleRoomState
      );
      unsubscribe(
        "ROOM_USERS",
        handleRoomUsers
      );
      unsubscribe(
        "CHAT",
        handleChatMessage
      );
    };

  }, []);

  const handleSendMessage = () => {
    console.log("Send button clicked");
    if (!message.trim()) return;

    sendMessage({
      type: "CHAT",
      content: message,
      sender: username || "Anonymous",
      roomId
    });

    setMessage("");
  };

  return (
    <div className="chat-pane">

      <div className="chat-header">
        <span className="chat-header-title">
          Project Chat
        </span>

        <span
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            cursor: "pointer"
          }}
        >
          ✎
        </span>
      </div>

      <div className="chat-presence" style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        {users.length === 0 ? (
          "No collaborators online yet"
        ) : (
          <>
            <strong>Present:</strong> {users.map((user) => user.username).join(", ")}
          </>
        )}
      </div>

      <div className="chat-messages">

        {messages.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 16
            }}
          >
            No messages yet
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            className="chat-bubble"
            key={idx}
          >
            <div className="chat-bubble-meta">
              <div className="chat-avatar">{msg.sender ? msg.sender.charAt(0).toUpperCase() : "U"}</div>

              <span className="chat-sender">
                {msg.sender || "User"}
              </span>

              <span className="chat-time">
                {msg.timestamp}
              </span>
            </div>

            <p className="chat-text">
              {msg.content}
            </p>
          </div>
        ))}

      </div>

      <div className="chat-input-area">

        <input
          className="chat-input"
          placeholder="Message #room-chat"
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            handleSendMessage()
          }
        />

        <button
          className="btn-send"
          onClick={handleSendMessage}
        >
          ↑
        </button>

      </div>

    </div>
  );
}