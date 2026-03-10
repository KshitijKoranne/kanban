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
import type { Board, Column, Card, Label, CardTemplate } from "@/lib/types";
import { PRIORITY_CONFIG, COLUMN_PRESETS } from "@/lib/types";
import { BOARD_BACKGROUNDS } from "@/lib/db";
import {
  createColumn, updateColumn, deleteColumn, reorderColumns,
  createCard, updateCard, deleteCard, reorderCards,
  exportBoardAsJSON,
} from "@/actions/board-actions";
import { ThemeToggle } from "@/components/theme-provider";
import { Icon } from "@/components/icons";
import CardDetailModal from "@/components/modals/card-detail-modal";
import BoardSettingsModal from "@/components/modals/board-settings-modal";
import ActivityModal from "@/components/modals/activity-modal";
import StatsModal from "@/components/modals/stats-modal";
import TemplatesModal from "@/components/modals/templates-modal";
import ShortcutsModal from "@/components/modals/shortcuts-modal";

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

