import { useEffect, useState } from "react";

export default function RoomModal({
    isOpen,
    onClose
}) {
    const [joined, setJoined] = useState(false);
    const [roomId, setRoomId] = useState("");

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    const [socket, setSocket] = useState(null);

    if (!isOpen) return null;

    const joinRoom = () => {
        if (!roomId.trim()) return;

        const sock = new WebSocket("ws://localhost:8080/chat");
        setSocket(sock);

        sock.onopen = () => {
            console.log("Connected to websocket.");

            sock.send(
                JSON.stringify({
                    type: "JOIN",
                    roomId: roomId
                })
            )
            setJoined(true);
        }
        sock.onmessage = (event) => {
            console.log("Handling messages...");
            const data = JSON.parse(event.data);
            setMessages((prev) => [...prev, data.content]);
        }

        sock.onclose = () => {
            console.log("Disconnected");
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;

        socket.send(
            JSON.stringify({
                type: "CHAT",
                content: message
            })
        )
        setMessage("");
    };
    return (
        <div>
            <div>

                <div>
                    <h2>
                        {joined ? `Room: ${roomId}` : "Join room"}
                    </h2>
                    <button
                        onClick={onclose}
                    >
                        ✕
                    </button>

                </div>
                {!joined && (
                    <div>
                        <input
                            type="text"
                            placeholder="Enter room Id"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />

                        <button
                            onClick={joinRoom}
                        >
                            Join
                        </button>
                    </div>
                )}

                {joined && (
                    <div>
                        <div>
                            {messages.map((idx, msg) => (
                                <p key={idx}> {msg} </p>
                            ))}
                        </div>

                        <div>
                            <input
                             type="text"
                             placeholder="Type message.."
                             value={message}
                             onChange={(e) => setMessage(e.target.value)} 
                            />
                            <button
                                onClick={sendMessage}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}