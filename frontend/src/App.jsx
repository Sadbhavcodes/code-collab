import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const sock = new WebSocket("ws://localhost:8080/chat");
    setSocket(sock);

    sock.onopen = () => {
      console.log("Connected to websocket.");
    };

    sock.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    sock.onclose = () => {
      console.log("Disconnected");
    };

    return () => {
      sock.close();
    }
  }, [])

  const sendMessage = () => {
    if(socket){
      socket.send(
        JSON.stringify({
          type: "CHAT",
          content: message
        })
      );
    }
  };

  return (
    <div>
      <h1>Realtime Chat </h1>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={sendMessage}>
        Send
      </button>

      {
        messages.map((msg, index) => (
          <p key={index}>{msg.content}</p>
        ))
      }
    </div>
  );
}

export default App;