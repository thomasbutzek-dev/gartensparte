"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toEditorHtml } from "@/lib/rich-text";

type Props = {
  name: string;
  id?: string;
  label?: string;
  defaultValue?: string;
  minHeightClass?: string;
};

function ToolButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        active ? "bg-green-700 text-white" : "text-stone-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ name, id, defaultValue = "", minHeightClass = "min-h-32" }: Props) {
  const [html, setHtml] = useState(() => toEditorHtml(defaultValue));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
    ],
    content: toEditorHtml(defaultValue),
    editorProps: {
      attributes: {
        class: `${minHeightClass} px-3 py-2 text-sm leading-relaxed focus:outline-none`,
      },
    },
    onUpdate: ({ editor: next }) => setHtml(next.getHTML()),
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setTick((value) => value + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  function setLink() {
    if (!editor) return;
    const previous = String(editor.getAttributes("link").href ?? "");
    const next = window.prompt("Adresse der Seite, z.B. https://…", previous || "https://");
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm focus-within:border-green-600 focus-within:ring-1 focus-within:ring-green-600">
      <div className="flex flex-wrap gap-0.5 border-b border-stone-200 bg-stone-50 px-1.5 py-1">
        <ToolButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          Fett
        </ToolButton>
        <ToolButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Kursiv
        </ToolButton>
        <ToolButton active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          Überschrift
        </ToolButton>
        <ToolButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          Liste
        </ToolButton>
        <ToolButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          Nummern
        </ToolButton>
        <ToolButton active={editor?.isActive("link")} onClick={setLink}>
          Link
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" id={id} name={name} value={html} />
    </div>
  );
}
