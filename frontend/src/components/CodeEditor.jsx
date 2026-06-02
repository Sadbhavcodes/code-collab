import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  connectSocket,
  subscribe,
  unsubscribe,
  sendMessage,
  getSocket,
} from "../services/websocketService";

export default function CodeEditor({ roomId, language = "javascript" }) {
  const editorRef = useRef(null);
  const [value, setValue] = useState("// Start coding...");
  const remoteApplying = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    connectSocket();

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

    subscribe("CODE-CHANGE", handleCodeChangeMessage);

    return () => {
      unsubscribe("CODE-CHANGE", handleCodeChangeMessage);
    };
  }, [roomId]);

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
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

  return (
    <Editor
      height="80vh"
      language={language}
      theme="vs-dark"
      value={value}
      onMount={handleEditorDidMount}
      onChange={onChange}
    />
  );
}
