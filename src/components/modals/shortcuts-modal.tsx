"use client";

import { Icon } from "@/components/icons";

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "N", desc: "New card in first column" },
    { key: "S", desc: "Toggle board stats" },
    { key: "?", desc: "Show keyboard shortcuts" },
    { key: "Esc", desc: "Close any modal" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 slide-up" style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Keyboard Shortcuts</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="space-y-3">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{s.desc}</span>
              <kbd className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md" style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}>{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
