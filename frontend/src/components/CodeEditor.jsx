import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
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

export default function CodeEditor({ roomId, language = "javascript", username = "Anonymous" }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [value, setValue] = useState("// Start coding...");
  const remoteApplying = useRef(false);
  const debounceRef = useRef(null);
  const roomStateHandled = useRef(false);
  const remoteCursorDecorations = useRef({});
  const userCursorClasses = useRef(new Map());
  const cursorStyleSheet = useRef(null);

  useEffect(() => {
    connectSocket();

    function handleRoomState(data) {
      // Receive initial room state (code + messages) on join
      console.log("🔵 CodeEditor received ROOM_STATE:", data);
      if (!roomStateHandled.current && data && data.codeEditorState) {
        roomStateHandled.current = true;
        const code = data.codeEditorState.code || "// Start coding...";
        console.log("✅ Loading code from ROOM_STATE:", code);
        remoteApplying.current = true;
        const ed = editorRef.current;
        if (ed) {
          ed.setValue(code);
        } else {
          setValue(code);
        }
        setTimeout(() => (remoteApplying.current = false), 50);
      }
    }

    function handleCodeChangeMessage(data) {
      if (!data || !data.codeEditorState) return;
      const code = data.codeEditorState.code || "";
      // apply remote changes without echoing
      remoteApplying.current = true;
      const ed = editorRef.current;
      if (ed) {
        ed.setValue(code);
      } else {
        setValue(code);
      }
      // small timeout to allow onChange to ignore
      setTimeout(() => (remoteApplying.current = false), 50);
    }

    function handleCursorMoveMessage(data) {
      if (!data || !data.username || data.username === username) return;
      if (data.lineNumber == null || data.column == null) return;
      updateRemoteCursor(data);
    }

    subscribe("ROOM_STATE", handleRoomState);
    subscribe("CODE-CHANGE", handleCodeChangeMessage);
    subscribe("CURSOR_MOVE", handleCursorMoveMessage);

    return () => {
      unsubscribe("ROOM_STATE", handleRoomState);
      unsubscribe("CODE-CHANGE", handleCodeChangeMessage);
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
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeModelContent((event) => {
      console.log("Model content changed:", event);
    });

    editor.onDidChangeCursorPosition((event) => {
      if (remoteApplying.current) return;

      console.log(event.position.lineNumber, event.position.column);

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

  function onChange(newValue) {
    if (remoteApplying.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const socket = getSocket();
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      sendMessage({
        type: "CODE-CHANGE",
        roomId,
        codeEditorState: { code: newValue },
      });
    }, 250);
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
      value={value}
      onMount={handleEditorDidMount}
      onChange={onChange}
      options={editorOptions}
    />
  );
}