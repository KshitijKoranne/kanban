"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Card, Column, Label } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { CARD_COVERS } from "@/lib/db";
import {
  updateCard, toggleCardLabel, addChecklistItem,
  toggleChecklistItem, deleteChecklistItem,
} from "@/actions/board-actions";
import { Icon } from "@/components/icons";

function CardDetailModal({
  card, columnId, columns, allLabels, boardId, onClose, onDelete,
}: {
  card: Card; columnId: string; columns: Column[]; allLabels: Label[];
  boardId: string; onClose: () => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description);
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date || "");
  const [coverColor, setCoverColor] = useState(card.cover_color);
  const [cardLabels, setCardLabels] = useState<Label[]>(card.labels);
  const [checklist, setChecklist] = useState(card.checklist);
  const [newCheck, setNewCheck] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [showCovers, setShowCovers] = useState(false);
  const [currentColId, setCurrentColId] = useState(columnId);
  const [saving, setSaving] = useState(false);
  const [editingDesc, setEditingDesc] = useState(!card.description);

  const checkDone = checklist.filter((c) => c.is_done).length;
  const checkTotal = checklist.length;
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    await updateCard(card.id, boardId, {
      title, description: desc, priority, due_date: dueDate || null,
      cover_color: coverColor, column_id: currentColId !== columnId ? currentColId : undefined,
    });
    setSaving(false);
    onClose();
  };

  const handleToggleLabel = async (label: Label) => {
    const exists = cardLabels.some((l) => l.id === label.id);
    if (exists) setCardLabels((prev) => prev.filter((l) => l.id !== label.id));
    else setCardLabels((prev) => [...prev, label]);
    await toggleCardLabel(card.id, label.id, boardId);
  };

  const handleAddCheck = async () => {
    if (!newCheck.trim()) return;
    const tempId = "temp-" + Date.now();
    setChecklist((prev) => [...prev, { id: tempId, card_id: card.id, text: newCheck.trim(), is_done: false, position: prev.length }]);
    setNewCheck("");
    const newId = await addChecklistItem(card.id, newCheck.trim(), boardId);
    setChecklist((prev) => prev.map((c) => c.id === tempId ? { ...c, id: newId } : c));
  };

  const handleToggleCheck = async (itemId: string) => {
    setChecklist((prev) => prev.map((c) => c.id === itemId ? { ...c, is_done: !c.is_done } : c));
    await toggleChecklistItem(itemId, boardId);
  };

  const handleDeleteCheck = async (itemId: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    await deleteChecklistItem(itemId, boardId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-16 px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden slide-up max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        {coverColor && <div className="h-16" style={{ background: coverColor }} />}

        <div className="p-5 md:p-6">
          {/* Close */}
          <div className="flex justify-end -mt-1 mb-2">
            <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}><Icon.X /></button>
          </div>

          {/* Title */}
          <input
            className="w-full bg-transparent border-none outline-none text-xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title..."
          />

          {/* Status / Column */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--color-text-muted)" }}>Status</label>
              <select className="input-field text-sm" value={currentColId} onChange={(e) => setCurrentColId(e.target.value)}>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--color-text-muted)" }}>Priority</label>
              <select
                className="input-field text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Card["priority"])}
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--color-text-muted)" }}>Due Date</label>
            <div className="flex items-center gap-2">
              <input type="date" className="input-field text-sm flex-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ colorScheme: "dark" }} />
              {dueDate && <button className="btn-ghost p-1.5" onClick={() => setDueDate("")}><Icon.X /></button>}
            </div>
          </div>

          {/* Labels */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Labels</label>
              <button className="text-xs btn-ghost py-0.5 px-2" onClick={() => setShowLabels(!showLabels)}>
                {showLabels ? "Close" : "Edit"}
              </button>
            </div>
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cardLabels.map((l) => (
                  <span key={l.id} className="text-xs font-semibold px-2.5 py-1 rounded-md" style={{ background: l.color, color: "#fff" }}>
                    {l.name}
                  </span>
                ))}
              </div>
            )}
            {showLabels && (
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg" style={{ background: "var(--color-input-bg)" }}>
                {allLabels.map((l) => {
                  const active = cardLabels.some((cl) => cl.id === l.id);
                  return (
                    <button
                      key={l.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
                      style={{
                      background: active ? l.color : "var(--color-input-bg)",
                      color: active ? "#fff" : "var(--color-text-secondary)",
                      border: active ? "none" : "1px solid var(--color-border)",
                      }}
                      onClick={() => handleToggleLabel(l)}
                    >
                      <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                      {l.name}
                      {active && <span className="ml-auto"><Icon.Check /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card Cover */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Card Cover</label>
              <button className="text-xs btn-ghost py-0.5 px-2" onClick={() => setShowCovers(!showCovers)}>
                {showCovers ? "Close" : "Edit"}
              </button>
            </div>
            {showCovers && (
              <div className="flex flex-wrap gap-2 p-2 rounded-lg" style={{ background: "var(--color-input-bg)" }}>
                {CARD_COVERS.map((c, i) => (
                  <button
                    key={i}
                    className="w-8 h-8 rounded-md transition-all"
                    style={{
                    background: c || "var(--color-surface-4)",
                      outline: coverColor === c ? "2px solid var(--color-accent)" : "2px solid transparent",
                      outlineOffset: 2,
                    }}
                    onClick={() => setCoverColor(c)}
                    title={c || "No cover"}
                  >
                    {!c && <Icon.X />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description (Markdown) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Description</label>
              {desc && (
                <button className="text-xs btn-ghost py-0.5 px-2" onClick={() => setEditingDesc(!editingDesc)}>
                  {editingDesc ? "Preview" : "Edit"}
                </button>
              )}
            </div>
            {editingDesc ? (
              <textarea
                className="input-field text-sm font-mono"
                rows={5}
                placeholder="Write in Markdown... (supports **bold**, *italic*, - lists, [links](url), `code`)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7 }}
              />
            ) : (
              <div
                className="prose-sm rounded-lg p-3 cursor-pointer text-sm leading-relaxed"
                style={{ background: "var(--color-input-bg)", color: "var(--color-text-secondary)", minHeight: 60 }}
                onClick={() => setEditingDesc(true)}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc || "_Click to add description..._"}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--color-text-muted)" }}>Checklist</label>
            {checkTotal > 0 && (
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-badge-bg)" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${checkPct}%`, background: checkPct === 100 ? "var(--color-success)" : "linear-gradient(90deg, var(--color-accent), #a855f7)" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{checkPct}%</span>
              </div>
            )}
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1.5 group">
                <button
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: item.is_done ? "var(--color-accent)" : "var(--color-check-border)",
                    background: item.is_done ? "var(--color-accent)" : "transparent",
                    color: item.is_done ? "#fff" : "transparent",
                  }}
                  onClick={() => handleToggleCheck(item.id)}
                >
                  <Icon.Check />
                </button>
                <span className="text-sm flex-1" style={{
                  color: item.is_done ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  textDecoration: item.is_done ? "line-through" : "none",
                }}>{item.text}</span>
                <button
                  className="opacity-0 group-hover:opacity-60 transition-opacity p-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={() => handleDeleteCheck(item.id)}
                >
                  <Icon.X />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                className="input-field text-sm flex-1"
                placeholder="Add item..."
                value={newCheck}
                onChange={(e) => setNewCheck(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCheck()}
              />
              <button className="btn-primary text-xs px-3" onClick={handleAddCheck}>Add</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button className="btn-danger" onClick={onDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardDetailModal;
