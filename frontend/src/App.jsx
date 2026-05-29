import { useEffect, useState } from "react";
import RoomModal from "./components/RoomModal";

function App() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <h1>Realtime Chat </h1>

      <button
        onClick={() => setOpen(true)}
      >
        Join Room
      </button>

      {open && (
        <RoomModal
          onClose={() => setOpen(false)}
        />
      )}

    </div>
  );
}

export default App;