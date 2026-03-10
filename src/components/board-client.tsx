"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Board, Column, Card, Label, CardTemplate } from "@/lib/types";
import { PRIORITY_CONFIG, COLUMN_PRESETS } from "@/lib/types";
import { BOARD_BACKGROUNDS, CARD_COVERS } from "@/lib/db";
import {
  createColumn, updateColumn, deleteColumn, reorderColumns,
  createCard, updateCard, deleteCard, reorderCards,
  toggleCardLabel, addChecklistItem, toggleChecklistItem,
  deleteChecklistItem, updateBoard, getActivity,
  createTemplate, deleteTemplate, createCardFromTemplate,
  exportBoardAsJSON,
} from "@/actions/board-actions";
import type { ActivityEntry } from "@/lib/types";
import { ThemeToggle, useTheme } from "@/components/theme-provider";

// ─── Icons ───
const Icon = {
  Plus: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1m-8 1v9a2 2 0 002 2h6a2 2 0 002-2V4H3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 4h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7h13M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Sidebar: () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Back: () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Activity: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h3l1.5-4 3 8L11 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Stats: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="6.5" y="4" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="12" y="1" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Template: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 6h12M6 6v8" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Keyboard: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6h1M7 6h2M11 6h1M4 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Desc: () => <span style={{ fontSize: 14, opacity: 0.4 }}>≡</span>,
};

interface Props {
  board: Board;
  initialColumns: Column[];
  allLabels: Label[];
  allBoards: Board[];
  initialTemplates: CardTemplate[];
}

export default function BoardClient({ board, initialColumns, allLabels, allBoards, initialTemplates }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [search, setSearch] = useState("");
  const [editingCard, setEditingCard] = useState<{ card: Card; columnId: string } | null>(null);
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState("");
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templates, setTemplates] = useState<CardTemplate[]>(initialTemplates);
  const newCardRef = useRef<HTMLTextAreaElement>(null);

  // Sync with server data
  useEffect(() => { setColumns(initialColumns); }, [initialColumns]);
  useEffect(() => { setTemplates(initialTemplates); }, [initialTemplates]);

  useEffect(() => {
    if (addingCardColId && newCardRef.current) newCardRef.current.focus();
  }, [addingCardColId]);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        // Add card to first column
        if (columns.length > 0) {
          setAddingCardColId(columns[0].id);
          setNewCardTitle("");
        }
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((p) => !p);
      }
      if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowStats((p) => !p);
      }
      if (e.key === "Escape") {
        setEditingCard(null);
        setShowBoardSettings(false);
        setShowActivity(false);
        setShowStats(false);
        setShowTemplates(false);
        setShowShortcuts(false);
        setAddingCardColId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [columns]);

  const bgObj = BOARD_BACKGROUNDS.find((b) => b.id === board.background);

  // ─── Search Filter ───
  const filteredColumns = useMemo(() => {
    if (!search.trim()) return columns;
    const q = search.toLowerCase();
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.labels.some((l) => l.name.toLowerCase().includes(q))
      ),
    }));
  }, [columns, search]);

  // ─── Drag & Drop ───
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === "COLUMN") {
      const reordered = [...columns];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setColumns(reordered);
      await reorderColumns(board.id, reordered.map((c) => c.id));
      return;
    }

    // Card drag
    const sourceCol = columns.find((c) => c.id === source.droppableId);
    const destCol = columns.find((c) => c.id === destination.droppableId);
    if (!sourceCol || !destCol) return;

    if (source.droppableId === destination.droppableId) {
      // Reorder within column
      const cards = [...sourceCol.cards];
      const [moved] = cards.splice(source.index, 1);
      cards.splice(destination.index, 0, moved);
      setColumns((prev) => prev.map((c) => c.id === sourceCol.id ? { ...c, cards } : c));
      await reorderCards(sourceCol.id, cards.map((c) => c.id));
    } else {
      // Move between columns
      const sourceCards = [...sourceCol.cards];
      const destCards = [...destCol.cards];
      const [moved] = sourceCards.splice(source.index, 1);
      destCards.splice(destination.index, 0, { ...moved, column_id: destCol.id });
      setColumns((prev) => prev.map((c) => {
        if (c.id === sourceCol.id) return { ...c, cards: sourceCards };
        if (c.id === destCol.id) return { ...c, cards: destCards };
        return c;
      }));
      await reorderCards(sourceCol.id, sourceCards.map((c) => c.id));
      await reorderCards(destCol.id, destCards.map((c) => c.id));
    }
  }, [columns, board.id]);

  // ─── Column CRUD ───
  const handleAddColumn = async () => {
    const color = COLUMN_PRESETS[columns.length % COLUMN_PRESETS.length];
    const tempId = "temp-" + Date.now();
    setColumns((prev) => [...prev, { id: tempId, board_id: board.id, title: "New Column", color, position: prev.length, wip_limit: 0, cards: [] }]);
    const newId = await createColumn(board.id, "New Column", color);
    setColumns((prev) => prev.map((c) => c.id === tempId ? { ...c, id: newId } : c));
    setEditingColId(newId);
    setEditingColTitle("New Column");
  };

  const handleDeleteColumn = async (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    await deleteColumn(board.id, colId);
  };

  const handleSaveColumnTitle = async (colId: string) => {
    if (editingColTitle.trim()) {
      setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, title: editingColTitle.trim() } : c));
      await updateColumn(colId, { title: editingColTitle.trim() });
    }
    setEditingColId(null);
  };

  // ─── Card CRUD ───
  const handleAddCard = async (colId: string) => {
    if (!newCardTitle.trim()) return;
    const title = newCardTitle.trim();
    const tempId = "temp-" + Date.now();
    const tempCard: Card = {
      id: tempId, column_id: colId, title, description: "", priority: "none",
      due_date: null, cover_color: null, position: 0, created_at: new Date().toISOString(),
      labels: [], checklist: [],
    };
    setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, cards: [...c.cards, tempCard] } : c));
    setNewCardTitle("");
    setAddingCardColId(null);
    const newId = await createCard(colId, board.id, title);
    setColumns((prev) => prev.map((c) => c.id === colId
      ? { ...c, cards: c.cards.map((card) => card.id === tempId ? { ...card, id: newId } : card) }
      : c
    ));
  };

  const handleDeleteCard = async (cardId: string, colId: string) => {
    setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, cards: c.cards.filter((card) => card.id !== cardId) } : c));
    setEditingCard(null);
    await deleteCard(cardId, board.id);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: bgObj?.css || "var(--color-surface-0)" }}>
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 glass-panel z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-ghost p-2 hidden md:flex" title="All boards"><Icon.Back /></Link>
          <button className="btn-ghost p-2 md:hidden" onClick={() => setSidebarOpen(true)}><Icon.Sidebar /></button>
          <h1 className="text-lg md:text-xl font-bold truncate max-w-[200px] md:max-w-none" style={{ fontFamily: "var(--font-display)" }}>
            {board.name}
          </h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline-block" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
            {columns.reduce((s, c) => s + c.cards.length, 0)} tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:flex items-center" style={{ background: "var(--color-input-bg)", borderRadius: 8, padding: "6px 10px" }}>
            <Icon.Search />
            <input
              className="bg-transparent border-none outline-none text-sm ml-2 w-32 md:w-48"
              style={{ color: "var(--color-text-primary)" }}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="ml-1" style={{ color: "var(--color-text-muted)" }} onClick={() => setSearch("")}><Icon.X /></button>}
          </div>
          <ThemeToggle />
          <button className="btn-ghost p-2" onClick={() => setShowStats(true)} title="Board stats (S)"><Icon.Stats /></button>
          <button className="btn-ghost p-2" onClick={() => setShowTemplates(true)} title="Card templates"><Icon.Template /></button>
          <button className="btn-ghost p-2" onClick={async () => {
            const data = await exportBoardAsJSON(board.id);
            if (!data) return;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${board.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;
            a.click(); URL.revokeObjectURL(url);
          }} title="Export JSON"><Icon.Download /></button>
          <button className="btn-ghost p-2" onClick={() => setShowActivity(true)} title="Activity"><Icon.Activity /></button>
          <button className="btn-ghost p-2" onClick={() => setShowBoardSettings(true)} title="Board settings"><Icon.Settings /></button>
        </div>
      </header>

      {/* ─── Mobile Sidebar ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" style={{ background: "var(--color-overlay)" }} onClick={() => setSidebarOpen(false)}>
          <div className="w-72 h-full slide-up" style={{ background: "var(--color-surface-1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <span className="font-bold" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg, #6C5CE7, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ◈ KanFlow
                </span>
                <button className="btn-ghost p-1" onClick={() => setSidebarOpen(false)}><Icon.X /></button>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: "var(--color-text-muted)" }}>Boards</p>
              {allBoards.map((b) => (
                <Link
                  key={b.id}
                  href={`/board/${b.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors"
                  style={{ background: b.id === board.id ? "var(--color-accent-subtle)" : "transparent" }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="w-4 h-4 rounded" style={{ background: BOARD_BACKGROUNDS.find((bg) => bg.id === b.background)?.css || "#333" }} />
                  <span className="text-sm font-medium truncate">{b.name}</span>
                </Link>
              ))}
              <Link href="/" className="flex items-center gap-2 px-3 py-2.5 mt-2 text-sm rounded-lg" style={{ color: "var(--color-text-muted)" }} onClick={() => setSidebarOpen(false)}>
                <Icon.Back /> All Boards
              </Link>
            </div>
            {/* Mobile search */}
            <div className="p-3 sm:hidden">
              <div className="flex items-center input-field">
                <Icon.Search />
                <input className="bg-transparent border-none outline-none text-sm ml-2 flex-1" placeholder="Search cards..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Board Columns ─── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-6 py-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 h-full items-start pr-6"
                style={{ minWidth: "max-content" }}
              >
                {filteredColumns.map((col, colIdx) => (
                  <Draggable key={col.id} draggableId={col.id} index={colIdx}>
                    {(colProvided, colSnapshot) => (
                      <div
                        ref={colProvided.innerRef}
                        {...colProvided.draggableProps}
                        className="column-container flex flex-col shrink-0"
                        style={{
                          ...colProvided.draggableProps.style,
                          width: 300,
                          maxHeight: "calc(100vh - 120px)",
                          opacity: colSnapshot.isDragging ? 0.85 : 1,
                        }}
                      >
                        {/* Column Header */}
                        <div {...colProvided.dragHandleProps} className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 cursor-grab">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: col.color }} />
                          {editingColId === col.id ? (
                            <input
                              className="input-field text-sm font-semibold flex-1 py-1"
                              value={editingColTitle}
                              onChange={(e) => setEditingColTitle(e.target.value)}
                              onBlur={() => handleSaveColumnTitle(col.id)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSaveColumnTitle(col.id); if (e.key === "Escape") setEditingColId(null); }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-sm font-semibold flex-1 cursor-pointer truncate"
                              style={{ fontFamily: "var(--font-display)" }}
                              onDoubleClick={() => { setEditingColId(col.id); setEditingColTitle(col.title); }}
                            >
                              {col.title}
                            </span>
                          )}
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md cursor-pointer"
                            style={{
                              background: col.wip_limit > 0 && col.cards.length > col.wip_limit ? "var(--color-danger-subtle)" : "var(--color-badge-bg)",
                              color: col.wip_limit > 0 && col.cards.length > col.wip_limit ? "var(--color-danger)" : "var(--color-text-muted)",
                            }}
                            title="Click to set WIP limit"
                            onClick={(e) => {
                              e.stopPropagation();
                              const input = prompt(`WIP limit for "${col.title}" (0 = no limit):`, String(col.wip_limit));
                              if (input !== null) {
                                const limit = Math.max(0, parseInt(input) || 0);
                                setColumns((prev) => prev.map((c) => c.id === col.id ? { ...c, wip_limit: limit } : c));
                                updateColumn(col.id, { wip_limit: limit });
                              }
                            }}
                          >
                            {col.cards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                          </span>
                          <button
                            className="p-1 rounded transition-colors"
                            style={{ color: "var(--color-text-muted)" }}
                            onClick={() => {
                              if (col.cards.length > 0) {
                                if (confirm(`Delete "${col.title}" and its ${col.cards.length} cards?`)) handleDeleteColumn(col.id);
                              } else handleDeleteColumn(col.id);
                            }}
                          >
                            <Icon.Trash />
                          </button>
                        </div>

                        {/* Cards */}
                        <Droppable droppableId={col.id} type="CARD">
                          {(dropProvided, dropSnapshot) => (
                            <div
                              ref={dropProvided.innerRef}
                              {...dropProvided.droppableProps}
                              className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5"
                              style={{
                                minHeight: 60,
                                background: dropSnapshot.isDraggingOver ? "var(--color-drag-highlight)" : "transparent",
                                borderRadius: 8,
                                transition: "background 0.15s ease",
                              }}
                            >
                              {col.cards.map((card, cardIdx) => (
                                <Draggable key={card.id} draggableId={card.id} index={cardIdx}>
                                  {(cardProvided, cardSnapshot) => (
                                    <div
                                      ref={cardProvided.innerRef}
                                      {...cardProvided.draggableProps}
                                      {...cardProvided.dragHandleProps}
                                      className="card-hover rounded-lg cursor-pointer"
                                      style={{
                                        ...cardProvided.draggableProps.style,
                                        background: "var(--color-card-bg)",
                                        border: "1px solid var(--color-border)",
                                        opacity: cardSnapshot.isDragging ? 0.9 : 1,
                                        transform: cardSnapshot.isDragging
                                          ? `${cardProvided.draggableProps.style?.transform || ""} rotate(2deg)`
                                          : cardProvided.draggableProps.style?.transform,
                                      }}
                                      onClick={() => setEditingCard({ card, columnId: col.id })}
                                    >
                                      {/* Card Cover */}
                                      {card.cover_color && (
                                        <div className="h-8 rounded-t-lg" style={{ background: card.cover_color }} />
                                      )}
                                      <div className="p-2.5">
                                        {/* Labels */}
                                        {card.labels.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mb-1.5">
                                            {card.labels.map((l) => (
                                              <span key={l.id} className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: l.color, color: "#fff" }}>
                                                {l.name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-[13px] font-medium leading-snug mb-1.5" style={{ color: "var(--color-text-primary)" }}>
                                          {card.title}
                                        </p>
                                        {/* Meta */}
                                        <div className="flex items-center flex-wrap gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                          {card.priority !== "none" && (
                                            <span className="font-semibold" style={{ color: PRIORITY_CONFIG[card.priority].color }}>
                                              {PRIORITY_CONFIG[card.priority].icon} {PRIORITY_CONFIG[card.priority].label}
                                            </span>
                                          )}
                                          {card.due_date && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{
                                              background: new Date(card.due_date) < new Date() ? "var(--color-danger-subtle)" : "var(--color-badge-bg)",
                                              color: new Date(card.due_date) < new Date() ? "var(--color-danger)" : "var(--color-text-muted)",
                                            }}>
                                              <Icon.Calendar />
                                              {new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                          )}
                                          {card.checklist.length > 0 && (
                                            <span className="flex items-center gap-1">
                                              <Icon.Check />
                                              {card.checklist.filter((c) => c.is_done).length}/{card.checklist.length}
                                            </span>
                                          )}
                                          {card.description && <Icon.Desc />}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {dropProvided.placeholder}

                              {/* Add card inline */}
                              {addingCardColId === col.id ? (
                                <div className="mt-1">
                                  <textarea
                                    ref={newCardRef}
                                    className="input-field text-sm resize-none"
                                    placeholder="Enter card title..."
                                    value={newCardTitle}
                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(col.id); }
                                      if (e.key === "Escape") { setAddingCardColId(null); setNewCardTitle(""); }
                                    }}
                                    rows={2}
                                  />
                                  <div className="flex gap-2 mt-1.5">
                                    <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleAddCard(col.id)}>Add</button>
                                    <button className="btn-ghost text-xs px-2 py-1.5" onClick={() => { setAddingCardColId(null); setNewCardTitle(""); }}><Icon.X /></button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="w-full text-left flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-colors"
                                  style={{ color: "var(--color-text-muted)" }}
                                  onClick={() => { setAddingCardColId(col.id); setNewCardTitle(""); }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-hover-bg)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Icon.Plus /> Add a card
                                </button>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add Column */}
                <button
                  className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    width: 280,
                    background: "var(--color-input-bg)",
                    border: "1px dashed var(--color-border)",
                    color: "var(--color-text-muted)",
                  }}
                  onClick={handleAddColumn}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-hover-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-input-bg)")}
                >
                  <Icon.Plus /> Add column
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* ─── Card Detail Modal ─── */}
      {editingCard && (
        <CardDetailModal
          card={editingCard.card}
          columnId={editingCard.columnId}
          columns={columns}
          allLabels={allLabels}
          boardId={board.id}
          onClose={() => { setEditingCard(null); router.refresh(); }}
          onDelete={() => handleDeleteCard(editingCard.card.id, editingCard.columnId)}
        />
      )}

      {/* ─── Board Settings Modal ─── */}
      {showBoardSettings && (
        <BoardSettingsModal board={board} onClose={() => { setShowBoardSettings(false); router.refresh(); }} />
      )}

      {/* ─── Activity Modal ─── */}
      {showActivity && (
        <ActivityModal boardId={board.id} onClose={() => setShowActivity(false)} />
      )}

      {/* ─── Stats Modal ─── */}
      {showStats && (
        <StatsModal columns={columns} onClose={() => setShowStats(false)} />
      )}

      {/* ─── Templates Modal ─── */}
      {showTemplates && (
        <TemplatesModal
          templates={templates}
          setTemplates={setTemplates}
          columns={columns}
          allLabels={allLabels}
          boardId={board.id}
          onClose={() => { setShowTemplates(false); router.refresh(); }}
        />
      )}

      {/* ─── Keyboard Shortcuts Modal ─── */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════ Card Detail Modal ═══════════════════════ */
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

/* ═══════════════════════ Board Settings Modal ═══════════════════════ */
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

/* ═══════════════════════ Activity Modal ═══════════════════════ */
function ActivityModal({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivity(boardId).then((data) => { setEntries(data); setLoading(false); });
  }, [boardId]);

  const actionIcons: Record<string, string> = {
    card_created: "🟢",
    card_updated: "🔵",
    card_moved: "↔️",
    card_deleted: "🔴",
    column_created: "📋",
    column_deleted: "🗑️",
    board_created: "⭐",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-16 px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden slide-up max-h-[80vh]" style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Activity Log</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-70px)]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>No activity yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="text-base mt-0.5">{actionIcons[e.action] || "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{e.details}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Stats Modal ═══════════════════════ */
function StatsModal({ columns, onClose }: { columns: Column[]; onClose: () => void }) {
  const allCards = columns.flatMap((c) => c.cards);
  const totalCards = allCards.length;
  const overdue = allCards.filter((c) => c.due_date && new Date(c.due_date) < new Date()).length;
  const withDue = allCards.filter((c) => c.due_date).length;
  const priorities = Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => ({
    ...cfg, key, count: allCards.filter((c) => c.priority === key).length,
  })).filter((p) => p.key !== "none" || p.count > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 slide-up" style={{ background: "var(--color-modal-bg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-modal)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Board Stats</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><Icon.X /></button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--color-input-bg)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{totalCards}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--color-text-muted)" }}>Total Cards</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: overdue > 0 ? "var(--color-danger-subtle)" : "var(--color-input-bg)" }}>
            <div className="text-2xl font-bold" style={{ color: overdue > 0 ? "var(--color-danger)" : "var(--color-text-primary)" }}>{overdue}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--color-text-muted)" }}>Overdue</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--color-input-bg)" }}>
            <div className="text-2xl font-bold">{withDue}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--color-text-muted)" }}>With Due Date</div>
          </div>
        </div>

        {/* Cards by Column */}
        <div className="mb-5">
          <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--color-text-muted)" }}>Cards by Status</label>
          <div className="space-y-2">
            {columns.map((col) => {
              const pct = totalCards > 0 ? (col.cards.length / totalCards) * 100 : 0;
              return (
                <div key={col.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: col.color }} />
                  <span className="text-sm flex-1 truncate">{col.title}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-badge-bg)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col.color }} />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right" style={{ color: "var(--color-text-muted)" }}>{col.cards.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--color-text-muted)" }}>By Priority</label>
          <div className="flex flex-wrap gap-2">
            {priorities.map((p) => (
              <div key={p.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--color-input-bg)" }}>
                <span style={{ color: p.color }}>{p.icon}</span>
                <span>{p.label}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--color-badge-bg)", color: "var(--color-text-muted)" }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Templates Modal ═══════════════════════ */
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

/* ═══════════════════════ Shortcuts Modal ═══════════════════════ */
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
