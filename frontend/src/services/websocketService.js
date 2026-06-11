let socket = null;
const listeners = {};
const pendingConnectedCallbacks = [];

export function subscribe(type, callback) {
    if (!listeners[type]) {
        listeners[type] = [];
    }
    listeners[type].push(callback);
}

export function unsubscribe(type, callback) {
    if (!listeners[type]) return;
    listeners[type] = listeners[type].filter(cb => cb !== callback);
}

export function connectSocket(onConnected) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        if (onConnected) onConnected();
        return socket;
    }

    if (socket && socket.readyState === WebSocket.CONNECTING) {
        if (onConnected) pendingConnectedCallbacks.push(onConnected);
        return socket;
    }

    if (socket) {
        socket = null;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/chat';
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("WebSocket connected");
        if (onConnected) onConnected();
        // Flush any callbacks that were queued during CONNECTING
        while (pendingConnectedCallbacks.length > 0) {
            const cb = pendingConnectedCallbacks.shift();
            cb();
        }
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected");
        socket = null;
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    socket.onmessage = handleMessage;

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        // Null it out immediately so connectSocket() won't reuse a CLOSING socket
        const s = socket;
        socket = null;
        s.close();
    }
}

export function getSocket() {
    return socket;
}

export function handleMessage(event) {
    const data = JSON.parse(event.data);
    const type = data.type;

    if (type) {
        const callbacks = listeners[type];
        if (!callbacks) return;
        callbacks.forEach((callback) => callback(data));
        return;
    }

    if (data && (data.content !== undefined || data.sender !== undefined)) {
        const chatCbs = listeners["CHAT"];
        if (!chatCbs) return;
        chatCbs.forEach((cb) => cb(data));
    }
}

export function sendMessage(message) {
    if (!socket) {
        console.warn("sendMessage: socket is null");
        return;
    }
    if (socket.readyState !== WebSocket.OPEN) {
        console.warn("sendMessage: socket not open, state =", socket.readyState);
        return;
    }
    socket.send(JSON.stringify(message));
}
