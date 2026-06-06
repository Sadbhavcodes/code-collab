import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import {
  connectSocket,
  subscribe,
  unsubscribe,
  sendMessage,
  getSocket,
} from "../services/websocketService";

const CURSOR_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#e11d48", "#a855f7",
  "#0ea5e9", "#f43f5e", "#14b8a6", "#fb923c", "#8b5cf6",
  "#06b6d4", "#f87171",
];

function hashStringToIndex(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % CURSOR_COLORS.length;
}

function encodeUpdate(update) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < update.length; i += chunkSize) {
    binary += String.fromCharCode(...update.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeUpdate(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function CodeEditor({ roomId, username = "Anonymous", onReady }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const bindingRef = useRef(null);
  const remoteCursorDecorations = useRef({});
  const userCursorClasses = useRef(new Map());
  const cursorStyleSheet = useRef(null);

  // Stable object used as Yjs update origin to mark remote-applied updates
  // so we don't re-broadcast them back to the server.
  const remoteOrigin = useRef({});

  // Queue for ROOM_STATE/YJS_UPDATE messages that arrive before the
  // MonacoBinding is ready. Drained once the editor mounts.
  const pendingUpdates = useRef([]);
  const bindingReady = useRef(false);

  // ── Effect 1: create Y.Doc and outbound update sender ──────────────────────
  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("editor");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    const handleDocUpdate = (update, origin) => {
      // Don't echo back updates we applied from a remote source
      if (origin === remoteOrigin.current) return;

      const socket = getSocket();
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      sendMessage({
        type: "YJS_UPDATE",
        roomId,
        sender: username,
        update: encodeUpdate(update),
        code: ytext.toString(),
      });
    };

    ydoc.on("update", handleDocUpdate);

    return () => {
      ydoc.off("update", handleDocUpdate);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      bindingReady.current = false;
      pendingUpdates.current = [];
    };
  }, [roomId, username]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  // Apply a single base64-encoded Yjs update to the local doc.
  function applyYjsUpdate(base64) {
    const ydoc = ydocRef.current;
    if (!ydoc || !base64) return;
    try {
      Y.applyUpdate(ydoc, decodeUpdate(base64), remoteOrigin.current);
    } catch (err) {
      console.warn("CodeEditor: Y.applyUpdate failed", err);
    }
  }

  // Drain any updates that arrived before binding was ready.
  function drainPending() {
    const queue = pendingUpdates.current.splice(0);
    queue.forEach((base64) => applyYjsUpdate(base64));
  }

  // ── Effect 2: connect + subscribe to WebSocket messages ────────────────────
  useEffect(() => {
    // Connect then send JOIN so the server sends back ROOM_STATE
    connectSocket(() => {
      sendMessage({
        type: "JOIN",
        roomId,
        sender: username,
      });
    });

    function handleRoomState(data) {
      if (!data) return;
      // yjsUpdates is the ordered list of all Yjs updates stored by the backend.
      // Apply each one individually — Yjs CRDT deduplicates automatically.
      const updates = data.yjsUpdates;
      if (!updates || updates.length === 0) return;

      if (!bindingReady.current) {
        // Editor not mounted yet — queue all of them
        updates.forEach((u) => pendingUpdates.current.push(u));
      } else {
        updates.forEach((u) => applyYjsUpdate(u));
      }
    }

    function handleYjsUpdateMessage(data) {
      if (!data?.update) return;
      if (!bindingReady.current) {
        pendingUpdates.current.push(data.update);
      } else {
        applyYjsUpdate(data.update);
      }
    }

    function handleCursorMoveMessage(data) {
      if (!data?.username || data.username === username) return;
      if (data.lineNumber == null || data.column == null) return;
      updateRemoteCursor(data);
    }

    subscribe("ROOM_STATE", handleRoomState);
    subscribe("YJS_UPDATE", handleYjsUpdateMessage);
    subscribe("CURSOR_MOVE", handleCursorMoveMessage);

    return () => {
      unsubscribe("ROOM_STATE", handleRoomState);
      unsubscribe("YJS_UPDATE", handleYjsUpdateMessage);
      unsubscribe("CURSOR_MOVE", handleCursorMoveMessage);
    };
  }, [roomId, username]);

  // ── Cursor rendering helpers ─────────────────────────────────────────────────

  function ensureCursorStyleSheet() {
    if (cursorStyleSheet.current) return cursorStyleSheet.current.sheet;
    const styleEl = document.createElement("style");
    styleEl.id = "remote-cursor-styles";
    styleEl.textContent =
      ".monaco-editor .remote-cursor-decoration { display: inline-block; width: 2px; height: 1em; margin-left: -1px; vertical-align: text-bottom; }";
    document.head.appendChild(styleEl);
    cursorStyleSheet.current = styleEl;
    return styleEl.sheet;
  }

  function getCursorClassNameForUser(user) {
    const trimmed = user.trim() || "anonymous";
    if (userCursorClasses.current.has(trimmed)) {
      return userCursorClasses.current.get(trimmed);
    }
    const color = CURSOR_COLORS[hashStringToIndex(trimmed)];
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, "_");
    const className = `remote-cursor-${sanitized}`;
    const sheet = ensureCursorStyleSheet();
    sheet.insertRule(
      `.monaco-editor .remote-cursor-decoration.${className} { background-color: ${color}; border-left: 2px solid ${color}; }`,
      sheet.cssRules.length
    );
    userCursorClasses.current.set(trimmed, className);
    return className;
  }

  function updateRemoteCursor({ username: remoteName, lineNumber, column }) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const className = getCursorClassNameForUser(remoteName);
    const decoration = [
      {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          afterContentClassName: `remote-cursor-decoration ${className}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ];

    const oldDecorations = remoteCursorDecorations.current[remoteName] || [];
    const newDecorations = editor.deltaDecorations(oldDecorations, decoration);
    remoteCursorDecorations.current[remoteName] = newDecorations;
  }

  // ── Editor mount ─────────────────────────────────────────────────────────────

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;

    if (ytext && editor.getModel()) {
      // MonacoBinding keeps the Monaco model in sync with the Yjs text.
      // It reads the current ytext content on init so any updates already
      // applied to ytext are reflected immediately.
      bindingRef.current = new MonacoBinding(
        ytext,
        editor.getModel(),
        new Set([editor]),
        null // no awareness — we do our own cursor broadcasting
      );
    }

    // Mark binding as ready then drain any queued updates
    bindingReady.current = true;
    drainPending();

    // Broadcast cursor position changes
    editor.onDidChangeCursorPosition((event) => {
      const socket = getSocket();
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      sendMessage({
        type: "CURSOR_MOVE",
        roomId,
        username,
        lineNumber: event.position.lineNumber,
        column: event.position.column,
      });
    });

    if (onReady) onReady();
  }

  const editorOptions = {
    quickSuggestions: { other: true, comments: true, strings: true },
    suggestOnTriggerCharacters: true,
    parameterHints: { enabled: true },
    autoClosingBrackets: "always",
    autoIndent: "full",
    wordBasedSuggestions: "currentDocument",
    snippetSuggestions: "top",
    minimap: { enabled: false },
  };

  return (
    <Editor
      height="80vh"
      language="javascript"
      theme="vs-dark"
      defaultValue=""
      onMount={handleEditorDidMount}
      options={editorOptions}
    />
  );
}