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
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#e11d48",
  "#a855f7",
  "#0ea5e9",
  "#f43f5e",
  "#14b8a6",
  "#fb923c",
  "#8b5cf6",
  "#06b6d4",
  "#f87171",
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

const DEFAULT_CODE = "// Start coding...";

export default function CodeEditor({ roomId, language = "javascript", username = "Anonymous" }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const bindingRef = useRef(null);
  const remoteCursorDecorations = useRef({});
  const userCursorClasses = useRef(new Map());
  const cursorStyleSheet = useRef(null);
  const remoteUpdateOrigin = useRef({});

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("editor");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    const handleDocUpdate = (update, origin) => {
      console.log("CodeEditor.handleDocUpdate", { origin, updateSize: update.length });
      if (origin === remoteUpdateOrigin.current) {
        console.log("CodeEditor.handleDocUpdate ignored remote-origin update");
        return;
      }
      const socket = getSocket();
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log("CodeEditor.handleDocUpdate socket not open", socket?.readyState);
        return;
      }
      const encoded = encodeUpdate(update);
      const code = ytext.toString();
      console.log("CodeEditor sending YJS_UPDATE", { codeLength: code.length });
      sendMessage({
        type: "YJS_UPDATE",
        roomId,
        sender: username,
        update: encoded,
        code,
      });
    };

    ydoc.on("update", handleDocUpdate);

    return () => {
      ydoc.off("update", handleDocUpdate);
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      bindingRef.current = null;
    };
  }, [roomId, username]);

  const applyUpdateState = (state) => {
    if (!state) return;
    const ydoc = ydocRef.current;
    const ytext = ytextRef.current;
    if (!ydoc || !ytext) return;

    console.log("CodeEditor.applyUpdateState", {
      stateKeys: Object.keys(state),
      ytextLength: ytext.length,
      hasUpdate: !!state.update,
      hasCode: typeof state.code === "string",
      hasCodeEditorState: !!state.codeEditorState,
    });

    if (state.update) {
      try {
        const update = decodeUpdate(state.update);
        Y.applyUpdate(ydoc, update, remoteUpdateOrigin.current);
        console.log("CodeEditor.applyUpdateState applied remote update", {
          ytextLength: ytext.length,
        });

        if (typeof state.code === "string" && ytext.toString() !== state.code) {
          console.log("CodeEditor.applyUpdateState fallback to full code because update did not match", {
            actualLength: ytext.length,
            expectedLength: state.code.length,
          });
          ydoc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, state.code || DEFAULT_CODE);
          }, remoteUpdateOrigin.current);
        }
        return;
      } catch (error) {
        console.warn("Failed to apply Yjs update, falling back to code", error);
      }
    }

    if (typeof state.code === "string") {
      console.log("CodeEditor.applyUpdateState applying code state", { codeLength: state.code.length });
      ydoc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, state.code || DEFAULT_CODE);
      }, remoteUpdateOrigin.current);
      return;
    }

    if (state.codeEditorState && typeof state.codeEditorState.code === "string") {
      console.log("CodeEditor.applyUpdateState applying codeEditorState.code", {
        codeLength: state.codeEditorState.code.length,
      });
      ydoc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, state.codeEditorState.code || DEFAULT_CODE);
      }, remoteUpdateOrigin.current);
    }
  };

  useEffect(() => {
    connectSocket();

    function handleRoomState(data) {
      console.log("CodeEditor received ROOM_STATE", {
        roomId: data?.roomId,
        hasCodeEditorState: !!data?.codeEditorState,
        codeLength: data?.codeEditorState?.code?.length,
      });
      if (!data || !data.codeEditorState) return;
      applyUpdateState(data.codeEditorState);
    }

    function handleYjsUpdateMessage(data) {
      console.log("CodeEditor received YJS_UPDATE", {
        roomId: data?.roomId,
        sender: data?.sender,
        hasUpdate: !!data?.update,
        codeLength: data?.code?.length,
      });
      if (!data || (!data.update && typeof data.code !== "string")) return;
      applyUpdateState(data);
    }

    function handleCursorMoveMessage(data) {
      if (!data || !data.username || data.username === username) return;
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

  function ensureCursorStyleSheet() {
    if (cursorStyleSheet.current) {
      return cursorStyleSheet.current.sheet;
    }
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

  function handleEditorDidMount(editor, monaco) {
    console.log("CodeEditor.handleEditorDidMount", {
      modelExists: !!editor.getModel(),
      ytextLength: ytextRef.current?.length,
    });
    editorRef.current = editor;
    monacoRef.current = monaco;

    const ytext = ytextRef.current;
    if (ytext && editor.getModel()) {
      bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]));
    }

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
  }

  const editorOptions = {
    quickSuggestions: { other: true, comments: true, strings: true },
    suggestOnTriggerCharacters: true,
    parameterHints: { enabled: true },
    autoClosingBrackets: "always",
    autoIndent: "full",
    wordBasedSuggestions: true,
    snippetSuggestions: "top",
    minimap: { enabled: false },
  };

  return (
    <Editor
      height="80vh"
      language={language}
      theme="vs-dark"
      defaultValue=""
      onMount={handleEditorDidMount}
      options={editorOptions}
    />
  );
}
