import { useState } from "react";
import RoomModal from "./components/RoomModal";
import RoomPage from "./components/RoomPage";

function App() {
  const [open, setOpen] = useState(false);
  const [roomData, setRoomData] = useState(null);

  return (
    <div>

      {!roomData ? (
        <>
          <h1>Realtime Chat </h1>

          <button
            onClick={() => setOpen(true)}
          >
            Join Room
          </button>

          {open && (
            <RoomModal
              onClose={() => setOpen(false)}
              onJoin={(data) => {
                setRoomData(data);
                setOpen(false);
              }}
            />
          )}
        </>
      ) : (
        <RoomPage
          roomId={roomData.roomId}
          socket={roomData.socket}
          onLeave={() => setRoomData(null)}
        />
      )}
    </div>
  );
}

export default App;