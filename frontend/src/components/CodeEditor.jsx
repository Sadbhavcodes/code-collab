import Editor from "@monaco-editor/react";

export default function CodeEditor() {
    return (
        <Editor
            height="80vh"
            language="java"
            theme="vs-dark"
            defaultValue="// Start coding..."
        />
    );
}