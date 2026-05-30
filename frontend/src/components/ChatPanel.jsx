import { useEffect, useState } from "react";

export default function ChatPanel({
    socket
}) {
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
        socket.send(
            JSON.stringify({
                type: "CHAT",
                content: message
            })
        );

        setMessage("");
    }
    return (
        <div>
            {messages.map((msg, idx) => (
                <p key={idx}>{msg}</p>
            ))}

            <input
                value={message}
                onChange={(e) =>
                    setMessage(e.target.value)
                }
            />

            <button
                onClick={sendMessage}
            >
                Send
            </button>
        </div>
    );
}