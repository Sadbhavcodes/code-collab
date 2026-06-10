import { useEffect, useRef, useState } from "react";
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

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", icon: "JS" },
  { id: "python",     label: "Python",     icon: "PY" },
  { id: "java",       label: "Java",       icon: "☕" },
  { id: "cpp",        label: "C++",        icon: "C+" },
];

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

export default function CodeEditor({ roomId, username = "Anonymous", onReady, initialLanguage = "javascript", onLanguageChange }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const bindingRef = useRef(null);
  const remoteCursorDecorations = useRef({});
  const userCursorClasses = useRef(new Map());
  const cursorStyleSheet = useRef(null);

  // Language state — shared across all room members
  const [language, setLanguage] = useState(initialLanguage);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      // Clear all label hide timers
      Object.values(labelHideTimers.current).forEach(clearTimeout);
      labelHideTimers.current = {};
      labelVisible.current = {};
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
      // Restore language persisted on the server for this room
      if (data.language) {
        setLanguage(data.language);
        if (onLanguageChange) onLanguageChange(data.language);
      }
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

    function handleLanguageChangeMessage(data) {
      if (!data?.language) return;
      setLanguage(data.language);
      // Also update Monaco model language in real time
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        monaco.editor.setModelLanguage(editor.getModel(), data.language);
      }
      if (onLanguageChange) onLanguageChange(data.language);
    }

    subscribe("ROOM_STATE", handleRoomState);
    subscribe("YJS_UPDATE", handleYjsUpdateMessage);
    subscribe("CURSOR_MOVE", handleCursorMoveMessage);
    subscribe("LANGUAGE_CHANGE", handleLanguageChangeMessage);

    return () => {
      unsubscribe("ROOM_STATE", handleRoomState);
      unsubscribe("YJS_UPDATE", handleYjsUpdateMessage);
      unsubscribe("CURSOR_MOVE", handleCursorMoveMessage);
      unsubscribe("LANGUAGE_CHANGE", handleLanguageChangeMessage);
    };
  }, [roomId, username]);

  // ── Cursor rendering helpers ─────────────────────────────────────────────────

  // Per-user hide timers: username → timeoutId
  // When a cursor moves we show the label and start a 2.5s timer to hide it.
  const labelHideTimers = useRef({});
  // Track which users currently have their label visible
  const labelVisible = useRef({});

  function ensureCursorStyleSheet() {
    if (cursorStyleSheet.current) return cursorStyleSheet.current.sheet;
    const styleEl = document.createElement("style");
    styleEl.id = "remote-cursor-styles";
    // Base rule for the cursor line element
    styleEl.textContent = [
      ".monaco-editor .rc-line {",
      "  display: inline-block;",
      "  width: 2px;",
      "  height: 1.2em;",
      "  margin-left: -1px;",
      "  vertical-align: text-bottom;",
      "  position: relative;",
      "}",
      // Base rule for the label element (hidden by default)
      ".monaco-editor .rc-label {",
      "  display: inline-block;",
      "  position: absolute;",
      "  top: -1.45em;",
      "  left: 0;",
      "  white-space: nowrap;",
      "  font-size: 10px;",
      "  font-family: 'Geist', system-ui, sans-serif;",
      "  font-weight: 600;",
      "  line-height: 1.6;",
      "  padding: 0 5px;",
      "  border-radius: 3px 3px 3px 0;",
      "  pointer-events: none;",
      "  opacity: 0;",
      "  transition: opacity 0.15s ease;",
      "  z-index: 10;",
      "}",
      ".monaco-editor .rc-label.rc-label--visible {",
      "  opacity: 1;",
      "}",
    ].join("\n");
    document.head.appendChild(styleEl);
    cursorStyleSheet.current = styleEl;
    return styleEl.sheet;
  }

  function getCursorClassesForUser(user) {
    const trimmed = user.trim() || "anonymous";
    if (userCursorClasses.current.has(trimmed)) {
      return userCursorClasses.current.get(trimmed);
    }

    const color = CURSOR_COLORS[hashStringToIndex(trimmed)];
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, "_");
    const lineClass  = `rc-line-${sanitized}`;
    const labelClass = `rc-label-${sanitized}`;

    const sheet = ensureCursorStyleSheet();

    // Cursor line — colored bar
    sheet.insertRule(
      `.monaco-editor .rc-line.${lineClass} { background-color: ${color}; border-left: 2px solid ${color}; }`,
      sheet.cssRules.length
    );

    // Label pill — same color background, white text
    // We use ::before on the label span to inject the username text via CSS content
    // so we don't need to touch the DOM directly.
    const escapedName = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    sheet.insertRule(
      `.monaco-editor .rc-label.${labelClass}::before { content: "${escapedName}"; color: #fff; }`,
      sheet.cssRules.length
    );
    sheet.insertRule(
      `.monaco-editor .rc-label.${labelClass} { background-color: ${color}; }`,
      sheet.cssRules.length
    );

    const classes = { lineClass, labelClass };
    userCursorClasses.current.set(trimmed, classes);
    return classes;
  }

  function showLabel(remoteName) {
    // Clear any existing hide timer
    if (labelHideTimers.current[remoteName]) {
      clearTimeout(labelHideTimers.current[remoteName]);
    }
    labelVisible.current[remoteName] = true;

    // Add visible class to all label elements for this user
    document
      .querySelectorAll(`.rc-label-${remoteName.replace(/[^a-zA-Z0-9_-]/g, "_")}`)
      .forEach((el) => el.classList.add("rc-label--visible"));

    // Auto-hide after 2.5 seconds of no movement
    labelHideTimers.current[remoteName] = setTimeout(() => {
      labelVisible.current[remoteName] = false;
      document
        .querySelectorAll(`.rc-label-${remoteName.replace(/[^a-zA-Z0-9_-]/g, "_")}`)
        .forEach((el) => el.classList.remove("rc-label--visible"));
    }, 2500);
  }

  function updateRemoteCursor({ username: remoteName, lineNumber, column }) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const { lineClass, labelClass } = getCursorClassesForUser(remoteName);

    const decoration = [
      {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          // The cursor line rendered via afterContentClassName
          afterContentClassName: `rc-line ${lineClass}`,
          // The label rendered via beforeContentClassName (sits before the cursor char)
          beforeContentClassName: `rc-label ${labelClass}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ];

    const oldDecorations = remoteCursorDecorations.current[remoteName] || [];
    const newDecorations = editor.deltaDecorations(oldDecorations, decoration);
    remoteCursorDecorations.current[remoteName] = newDecorations;

    // Show the username label and start hide timer
    showLabel(remoteName);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLanguageSelect(lang) {
    setDropdownOpen(false);
    if (lang === language) return;
    setLanguage(lang);
    // Update Monaco model language immediately for this user
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (editor && monaco) {
      monaco.editor.setModelLanguage(editor.getModel(), lang);
    }
    // Broadcast to room
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({
        type: "LANGUAGE_CHANGE",
        roomId,
        sender: username,
        language: lang,
      });
    }
    if (onLanguageChange) onLanguageChange(lang);
  }

  const currentLang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  return (
    <div className="editor-with-toolbar">
      {/* Language picker toolbar */}
      <div className="lang-toolbar">
        <div className="lang-picker" ref={dropdownRef}>
          <button
            className="lang-picker-btn"
            onClick={() => setDropdownOpen((o) => !o)}
            title="Change editor language"
          >
            <span className="lang-icon">{currentLang.icon}</span>
            <span className="lang-label">{currentLang.label}</span>
            <span className="lang-chevron" style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {dropdownOpen && (
            <ul className="lang-dropdown" role="listbox">
              {LANGUAGES.map((lang) => (
                <li
                  key={lang.id}
                  className={`lang-option${lang.id === language ? " active" : ""}`}
                  onClick={() => handleLanguageSelect(lang.id)}
                  role="option"
                  aria-selected={lang.id === language}
                >
                  <span className="lang-option-icon">{lang.icon}</span>
                  <span>{lang.label}</span>
                  {lang.id === language && <span className="lang-check">✓</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="lang-toolbar-hint">Language applies to all collaborators</span>
      </div>

      {/* Monaco Editor — fills remaining height inside the flex column */}
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        defaultValue=""
        onMount={handleEditorDidMount}
        options={editorOptions}
      />
    </div>
  );
}