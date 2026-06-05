# Bugfix Requirements Document

## Introduction

The real-time collaborative code editor (Yjs + Monaco + Spring Boot WebSockets) has nine bugs
that together cause live edits from one tab to be invisible to peers, destroy CRDT history on
late-joiner sync, and risk `ConcurrentModificationException` crashes on the backend. The most
user-visible symptom is: Tab 1 types → Tab 2 sees nothing; Tab 3 joins late and receives a
plain-text snapshot instead of a valid Yjs state vector, breaking all subsequent collaborative
merges.

The nine bugs span two layers:

- **Frontend (Bugs 1–3, 6–9):** React StrictMode lifecycle issues, `messageBuffer` replaying
  stale state, fragile `MonacoBinding` timing, incorrect `applyUpdateState` fallback that
  destroys CRDT state on every live keystroke, and WebSocket socket-lifecycle race conditions.
- **Backend (Bugs 4–5):** The Yjs binary update is silently discarded (only plain text is
  stored), so late joiners receive a plain-text ROOM_STATE that wipes CRDT history; and
  `ArrayList` session iteration is not thread-safe.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — StrictMode double-mount breaks socket/subscription lifecycle**

1.1 WHEN React StrictMode mounts a component, unmounts it, then remounts it in development,
    THEN the system returns the existing module-level socket from `connectSocket()` without
    calling `onConnected`, leaving the remounted component with no registered subscriptions.

**Bug 2 — messageBuffer replays stale ROOM_STATE / ROOM_USERS to remounted subscribers**

1.2 WHEN a component remounts (due to StrictMode or user navigation) and calls `subscribe()`,
    THEN the system immediately replays the last buffered `ROOM_STATE` or `ROOM_USERS` message
    to the new subscriber, causing the same state to be applied twice and producing double-init
    of the Y.Doc and chat message list.

**Bug 3 — MonacoBinding created before ROOM_STATE arrives — YJS_UPDATE timing gap**

1.3 WHEN a `YJS_UPDATE` message arrives before `handleEditorDidMount` has fired (Monaco not yet
    loaded), THEN the system applies the update to `ytext` correctly but the `MonacoBinding` does
    not yet exist, so the Monaco editor view is never updated to reflect the change.

**Bug 4 — Backend discards Yjs binary update, stores only plain text**

1.4 WHEN a `YJS_UPDATE` message is received by `CodeEditorService.handleYjsUpdate`, THEN the
    system stores only `socketMessage.getCode()` (plain string) to `CodeEditorState` and
    completely discards `socketMessage.getUpdate()` (the Yjs binary update).

1.5 WHEN a late-joining client requests ROOM_STATE, THEN the system sends
    `{codeEditorState: {code: "..."}}` containing only a plain string, not a Yjs encoded state
    vector, causing the late joiner's `applyUpdateState` to fall through to the full-text
    replacement path (`delete all + insert`), which destroys all CRDT history.

**Bug 5 — ConcurrentModificationException on session list**

1.6 WHEN a new session joins or leaves a room while another WebSocket handler thread is
    iterating over `room.getSessions()` (a plain `ArrayList`), THEN the system throws
    `ConcurrentModificationException`, crashing the WebSocket handler and potentially dropping
    messages.

**Bug 6 — socket.close() in handleLeave does not wait for CLOSING state**

1.7 WHEN `RoomPage.handleLeave` calls `socket.close()` and the user immediately rejoins,
    THEN the system finds the module-level `socket` variable still non-null (it is only nulled
    in `onclose`), returns the CLOSING socket from `connectSocket()`, and all subsequent
    `sendMessage` calls silently fail because `readyState !== OPEN`.

**Bug 7 — connectSocket race condition when socket is CONNECTING**

1.8 WHEN `connectSocket(onConnected)` is called while the socket's `readyState` is `CONNECTING`
    (0), THEN the system returns the existing socket without registering or calling the
    `onConnected` callback, so the caller's post-connect initialization (JOIN message, etc.)
    never runs.

**Bug 8 — applyUpdateState fallback causes full-text replacement on every live YJS_UPDATE**

1.9 WHEN `handleYjsUpdateMessage` receives a live `YJS_UPDATE` from a peer and calls
    `applyUpdateState(data)`, THEN after successfully applying the binary diff via
    `Y.applyUpdate`, the system additionally checks `ytext.toString() !== state.code` and, if
    they differ even by whitespace or transient CRDT state, executes a full `delete + insert`
    transaction on every single keystroke — wiping all CRDT history and remote-cursor positions
    on every update received.

---

### Expected Behavior (Correct)

**Bug 1 — StrictMode double-mount fix**

2.1 WHEN React StrictMode remounts a component in development, THEN the system SHALL correctly
    re-register all subscriptions so that the remounted component receives live messages,
    regardless of the existing socket state.

**Bug 2 — messageBuffer stale-replay fix**

2.2 WHEN a component remounts and calls `subscribe()`, THEN the system SHALL NOT automatically
    replay buffered `ROOM_STATE` or `ROOM_USERS` to the new subscriber; instead, state
    initialization SHALL be driven by the room-join flow which guarantees a fresh ROOM_STATE from
    the server.

**Bug 3 — MonacoBinding timing fix**

2.3 WHEN a `YJS_UPDATE` arrives before `MonacoBinding` is initialized, THEN the system SHALL
    still apply the update to the Y.Doc, and once `MonacoBinding` is created it SHALL reflect the
    current Y.Doc contents so that no updates are silently lost.

**Bug 4 — Backend stores Yjs binary state**

2.4 WHEN `CodeEditorService.handleYjsUpdate` receives a message with a non-null `update` field,
    THEN the system SHALL decode the base64 update, merge it into a persistent Yjs encoded state
    vector stored on `CodeEditorState`, and retain the latest plain-text `code` as a human-
    readable snapshot alongside it.

2.5 WHEN a late-joining client requests ROOM_STATE, THEN the system SHALL include the base64-
    encoded Yjs state vector in the response so that the client can apply it via `Y.applyUpdate`
    and preserve full CRDT history without any full-text replacement.

**Bug 5 — Thread-safe session list**

2.6 WHEN multiple WebSocket handler threads concurrently add sessions, remove sessions, and
    iterate over `room.getSessions()`, THEN the system SHALL complete all operations without
    throwing `ConcurrentModificationException`.

**Bug 6 — socket.close() cleanup fix**

2.7 WHEN `handleLeave` closes the socket, THEN the system SHALL immediately null the module-level
    socket variable so that a subsequent `connectSocket()` call creates a fresh WebSocket
    connection instead of reusing the CLOSING socket.

**Bug 7 — connectSocket CONNECTING race fix**

2.8 WHEN `connectSocket(onConnected)` is called while the socket is in CONNECTING state, THEN
    the system SHALL queue the `onConnected` callback so it is called as soon as the `onopen`
    event fires, ensuring initialization runs exactly once per connection attempt.

**Bug 8 — applyUpdateState fallback removal**

2.9 WHEN `applyUpdateState` receives a message containing a valid `update` field and
    `Y.applyUpdate` succeeds, THEN the system SHALL NOT perform any additional full-text
    replacement — the binary diff alone SHALL be the complete update operation.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a client sends a chat message, THEN the system SHALL CONTINUE TO broadcast it to all
    room members and display it in the chat panel.

3.2 WHEN a client moves the cursor, THEN the system SHALL CONTINUE TO broadcast `CURSOR_MOVE`
    to all peers and render remote-cursor decorations in Monaco.

3.3 WHEN a first client joins an empty room and starts typing, THEN the system SHALL CONTINUE TO
    initialize a Y.Doc, create a MonacoBinding, and send `YJS_UPDATE` messages on each local
    edit.

3.4 WHEN a late-joining client receives ROOM_STATE and the room's Yjs state vector is empty or
    null (first user in the room), THEN the system SHALL CONTINUE TO initialize the editor with
    the default placeholder text without crashing.

3.5 WHEN a user leaves the room and no other sessions remain, THEN the system SHALL CONTINUE TO
    remove the room from memory.

3.6 WHEN the frontend subscribes to `YJS_UPDATE`, `ROOM_STATE`, and `CURSOR_MOVE` message types,
    THEN the system SHALL CONTINUE TO route each message to all registered callbacks of the
    correct type.

3.7 WHEN a user rejoins a room after leaving, THEN the system SHALL CONTINUE TO re-establish the
    WebSocket connection, re-send JOIN, and receive a fresh ROOM_STATE with the latest
    collaborative state.
