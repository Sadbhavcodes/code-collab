import { useEffect, useState } from "react";

export default function RoomModal({
    onClose,
    onJoin
}) {
    const [roomId, setRoomId] = useState("");

    const joinRoom = () => {
        console.log("Join Button clicked");
        if (!roomId.trim()) return;

        const sock = new WebSocket("ws://localhost:8080/chat");
        sock.onopen = () => {
            console.log("Connected to websocket.");

            sock.send(
                JSON.stringify({
                    type: "JOIN",
                    roomId: roomId
                })
            )
            onJoin({
                roomId,
                socket: sock
            })
        }
        sock.onclose = () => {
            console.log("Disconnected");
        }
    };
    return (
        <div>
            <div>
                <h2>
                    Join Room
                </h2>
                <button
                    onClick={onClose}
                >
                    ✕
                </button>

            </div>
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
        </div>
    );
}