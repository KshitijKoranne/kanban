"use client";

import { useState } from "react";
import type { Board } from "@/lib/types";
import { BOARD_BACKGROUNDS } from "@/lib/db";
import { updateBoard } from "@/actions/board-actions";
import { useTheme } from "@/components/theme-provider";
import { Icon } from "@/components/icons";

function BoardSettingsModal({ board, onClose }: { board: Board; onClose: () => void }) {
  const [name, setName] = useState(board.name);
  const [bg, setBg] = useState(board.background);
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();

  // Show current theme backgrounds first, then the other set
  const primaryBgs = BOARD_BACKGROUNDS.filter((b) => b.mode === theme);
  const secondaryBgs = BOARD_BACKGROUNDS.filter((b) => b.mode !== theme);

  const handleSave = async () => {
    setSaving(true);
    await updateBoard(board.id, { name: name.trim() || board.name, background: bg });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 slide-up max-h-[85vh] overflow-y-auto" style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Board Settings</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><Icon.X /></button>
        </div>

        <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--color-text-muted)" }}>Board Name</label>
        <input className="input-field mb-4" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--color-text-muted)" }}>
          {theme === "dark" ? "Dark" : "Light"} Backgrounds
        </label>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {primaryBgs.map((b) => (
            <button
              key={b.id}
              className="h-10 rounded-lg transition-all"
              style={{
                background: b.css,
                outline: bg === b.id ? "2px solid var(--color-accent)" : "2px solid transparent",
                outlineOffset: 2,
                border: b.mode === "light" ? "1px solid var(--color-border)" : "none",
              }}
              onClick={() => setBg(b.id)}
              title={b.label}
            />
          ))}
        </div>

        <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--color-text-muted)" }}>
          {theme === "dark" ? "Light" : "Dark"} Backgrounds
        </label>
        <div className="grid grid-cols-6 gap-2 mb-6">
          {secondaryBgs.map((b) => (
            <button
              key={b.id}
              className="h-10 rounded-lg transition-all"
              style={{
                background: b.css,
                outline: bg === b.id ? "2px solid var(--color-accent)" : "2px solid transparent",
                outlineOffset: 2,
                border: b.mode === "light" ? "1px solid var(--color-border)" : "none",
              }}
              onClick={() => setBg(b.id)}
              title={b.label}
            />
          ))}
        </div>

        <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default BoardSettingsModal;
