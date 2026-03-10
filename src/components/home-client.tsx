"use client";

import { useState, useRef, useEffect } from "react";
import { BOARD_BACKGROUNDS } from "@/lib/db";

export function CreateBoardButton({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bg, setBg] = useState("gradient-1");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("background", bg);
    await action(fd);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        New Board
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)}>
      <div className="rounded-2xl p-6 w-full max-w-md slide-up" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>Create New Board</h2>

        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Board Name</label>
        <input
          ref={inputRef}
          className="input-field mb-4"
          placeholder="e.g., Side Project Tracker"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Background</label>
        <div className="grid grid-cols-6 gap-2 mb-6">
          {BOARD_BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              className="h-10 rounded-lg transition-all duration-150"
              style={{
                background: b.css,
                outline: bg === b.id ? "2px solid #6C5CE7" : "2px solid transparent",
                outlineOffset: 2,
              }}
              onClick={() => setBg(b.id)}
              title={b.label}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Board"}
          </button>
          <button className="btn-ghost" onClick={() => { setOpen(false); setName(""); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteBoardButton({ boardId, action }: { boardId: string; action: (formData: FormData) => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="absolute top-2 right-2 z-10 rounded-lg p-3 slide-up" style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}>
        <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>Delete this board?</p>
        <div className="flex gap-2">
          <button className="btn-danger text-xs px-3 py-1" onClick={async () => {
            const fd = new FormData();
            fd.set("boardId", boardId);
            await action(fd);
          }}>Delete</button>
          <button className="btn-ghost text-xs px-3 py-1" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5"
      style={{ background: "rgba(0,0,0,0.5)", color: "var(--color-text-muted)" }}
      onClick={(e) => { e.preventDefault(); setConfirm(true); }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1m-8 1v9a2 2 0 002 2h6a2 2 0 002-2V4H3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 4h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    </button>
  );
}
