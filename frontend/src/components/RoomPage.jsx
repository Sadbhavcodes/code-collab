import CodeEditor from "./CodeEditor";
import ChatPanel from "./ChatPanel";

export default function RoomPage({
    roomId,
    socket,
    onLeave
}){
    const handleLeave = () => {
        socket.send(
            JSON.stringify({
                type: "LEAVE"
            })
        )
        socket.close();
        onLeave();
    }
    return(
        <div>
            <h2>
                Room: {roomId}
            </h2>

            <CodeEditor/>

            <ChatPanel 
                socket={socket}
            />
            <button
                onClick={handleLeave}
            >
                Leave Room
            </button>
        </div>
    );
}
