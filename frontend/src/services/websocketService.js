let socket = null;
const listeners = {};
const messageBuffer = {}; // Buffer recent messages by type

export function subscribe(type, callback) {
    if (!listeners[type]) {
        listeners[type] = [];
    }
    listeners[type].push(callback);
    
    // If there's a buffered message for this type, immediately call the callback
    if (messageBuffer[type]) {
        callback(messageBuffer[type]);
    }
}
export function unsubscribe(type, callback) {
    if (!listeners[type]) return;

    listeners[type] =
        listeners[type].filter(
            cb => cb !== callback
        );
}

export function connectSocket(onConnected) {

    if (socket) return socket;

    socket = new WebSocket(
        "ws://localhost:8080/chat"
    );

    socket.onopen = () => {

        console.log("Connected");

        if (onConnected) {
            onConnected();
        }
    };

    socket.onclose = () => {
        console.log("Disconnected");
        socket = null;
    };

    socket.onerror = (error) => {
        console.log(error);
    };

    socket.onmessage = handleMessage;

    return socket;
}
export function getSocket() {
    return socket;
}
export function handleMessage(event) {
    const data =
        JSON.parse(event.data);

    const type = data.type;

    if (type) {
        // Buffer certain message types for late subscribers
        if (type === "ROOM_STATE" || type === "ROOM_USERS") {
            messageBuffer[type] = data;
        }
        
        const callbacks = listeners[type];
        if (!callbacks) return;
        callbacks.forEach((callback) => callback(data));
        return;
    }

    // Fallback: some server messages (chat) are sent without a `type` wrapper.
    // If the incoming payload looks like a chat message, dispatch to CHAT listeners.
    if (data && (data.content !== undefined || data.sender !== undefined)) {
        const chatCbs = listeners["CHAT"];
        if (!chatCbs) return;
        chatCbs.forEach((cb) => cb(data));
    }
}
export function sendMessage(message) {

    console.log("Trying to send", message);

    if (!socket) {
        console.log("Socket is actually null");
        return;
    }

    console.log(
        "Socket state:",
        socket.readyState
    );

    if (socket.readyState !== WebSocket.OPEN) {
        console.log(
            "Socket not open yet"
        );
        return;
    }

    socket.send(
        JSON.stringify(message)
    );
}