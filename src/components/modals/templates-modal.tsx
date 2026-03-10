"use client";

import { useState } from "react";
import type { Column, Label, CardTemplate } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { createTemplate, deleteTemplate, createCardFromTemplate } from "@/actions/board-actions";
import { Icon } from "@/components/icons";

function TemplatesModal({
  templates, setTemplates, columns, allLabels, boardId, onClose,
}: {
  templates: CardTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<CardTemplate[]>>;
  columns: Column[];
  allLabels: Label[];
  boardId: string;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<string>("none");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [checkItems, setCheckItems] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [addToCol, setAddToCol] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const id = await createTemplate(boardId, {
      name: name.trim(), title: title.trim(), description: desc, priority,
      labels_json: JSON.stringify(selectedLabels), checklist_json: JSON.stringify(checkItems),
    });
    setTemplates((prev) => [{
      id, board_id: boardId, name: name.trim(), title: title.trim(), description: desc,
      priority: priority as CardTemplate["priority"], labels_json: JSON.stringify(selectedLabels),
      checklist_json: JSON.stringify(checkItems), created_at: new Date().toISOString(),
    }, ...prev]);
    setCreating(false);
    setName(""); setTitle(""); setDesc(""); setPriority("none"); setSelectedLabels([]); setCheckItems([]);
  };

  const handleUse = async (template: CardTemplate, colId: string) => {
    await createCardFromTemplate(colId, boardId, template);
    setAddToCol(null);
    onClose();
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id, boardId);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-16 px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden slide-up max-h-[85vh] overflow-y-auto" style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Card Templates</h2>
          <div className="flex items-center gap-2">
            {!creating && <button className="btn-primary text-xs" onClick={() => setCreating(true)}><Icon.Plus /> New</button>}
            <button className="btn-ghost p-1.5" onClick={onClose}><Icon.X /></button>
          </div>
        </div>

        <div className="p-5">
          {creating && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-border)" }}>
              <input className="input-field text-sm mb-2" placeholder="Template name..." value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input-field text-sm mb-2" placeholder="Card title..." value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="input-field text-sm mb-2" rows={2} placeholder="Description (markdown)..." value={desc} onChange={(e) => setDesc(e.target.value)} />
              <select className="input-field text-sm mb-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              {/* Labels toggle */}
              <div className="flex flex-wrap gap-1 mb-2">
                {allLabels.map((l) => (
                  <button key={l.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all" style={{
                    background: selectedLabels.includes(l.id) ? l.color : "var(--color-badge-bg)",
                    color: selectedLabels.includes(l.id) ? "#fff" : "var(--color-text-muted)",
                  }} onClick={() => setSelectedLabels((p) => p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id])}>
                    {l.name}
                  </button>
                ))}
              </div>
              {/* Checklist items */}
              {checkItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <span className="text-xs flex-1" style={{ color: "var(--color-text-secondary)" }}>☐ {item}</span>
                  <button className="text-xs" style={{ color: "var(--color-text-muted)" }} onClick={() => setCheckItems((p) => p.filter((_, j) => j !== i))}><Icon.X /></button>
                </div>
              ))}
              <div className="flex gap-2 mb-3">
                <input className="input-field text-xs flex-1" placeholder="Add checklist item..." value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCheckItem.trim()) { setCheckItems((p) => [...p, newCheckItem.trim()]); setNewCheckItem(""); } }} />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-xs" onClick={handleCreate}>Save Template</button>
                <button className="btn-ghost text-xs" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </div>
          )}

          {templates.length === 0 && !creating ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No templates yet. Create one to quickly add cards with pre-filled content.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {t.title && `"${t.title}" · `}
                      {t.priority !== "none" && `${PRIORITY_CONFIG[t.priority].icon} `}
                      {JSON.parse(t.checklist_json).length > 0 && `${JSON.parse(t.checklist_json).length} items`}
                    </div>
                  </div>
                  {addToCol === t.id ? (
                    <select className="input-field text-xs w-28" autoFocus onChange={(e) => { if (e.target.value) handleUse(t, e.target.value); }} onBlur={() => setAddToCol(null)}>
                      <option value="">Column...</option>
                      {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  ) : (
                    <button className="btn-primary text-xs px-3" onClick={() => setAddToCol(t.id)}>Use</button>
                  )}
                  <button className="btn-ghost p-1" onClick={() => handleDelete(t.id)}><Icon.Trash /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplatesModal;
