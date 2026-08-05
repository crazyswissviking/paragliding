"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

const btnStyle = (aktiv: boolean) => ({
  padding: "4px 8px",
  background: aktiv ? "#3355cc" : "rgba(255,255,255,0.1)",
  color: aktiv ? "white" : "#ccc",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "bold" as const,
});

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]);

  if (!editor) return null;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "4px", padding: "8px", background: "#f5f5f5", flexWrap: "wrap" }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive("bold"))}>
          <strong>F</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive("italic"))}>
          <em>K</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive("underline"))}>
          <u>U</u>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive("strike"))}>
          <s>S</s>
        </button>
        <div style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive("bulletList"))}>
          • Liste
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive("orderedList"))}>
          1. Liste
        </button>
        <div style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btnStyle(editor.isActive("heading", { level: 3 }))}>
          H3
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive("blockquote"))}>
          ❝
        </button>
        <div style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} style={btnStyle(false)}>
          ↩
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} style={btnStyle(false)}>
          ↪
        </button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{ padding: "12px", minHeight: "150px", fontSize: "14px", color: "#333", background: "white" }}
      />

      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin: 4px 0; }
        .ProseMirror ul { padding-left: 20px; }
        .ProseMirror ol { padding-left: 20px; }
        .ProseMirror h3 { margin: 8px 0 4px; font-size: 16px; }
        .ProseMirror blockquote { border-left: 3px solid #3355cc; padding-left: 12px; color: #555; margin: 8px 0; }
      `}</style>
    </div>
  );
}