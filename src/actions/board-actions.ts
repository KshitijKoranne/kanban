"use server";

import { db, uid, DEFAULT_LABELS, SCHEMA } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Board, Column, Card, Label, ChecklistItem, ActivityEntry } from "@/lib/types";

// ─── DB INIT ───

async function ensureTables() {
  const client = db();
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  // Seed labels
  for (const label of DEFAULT_LABELS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO labels (id, name, color) VALUES (?, ?, ?)`,
      args: [label.id, label.name, label.color],
    });
  }
}

let _initialized = false;
async function init() {
  if (!_initialized) {
    await ensureTables();
    _initialized = true;
  }
}

// ─── ACTIVITY LOG ───

async function logActivity(boardId: string, cardId: string | null, action: string, details: string) {
  const client = db();
  await client.execute({
    sql: `INSERT INTO activity_log (id, board_id, card_id, action, details) VALUES (?, ?, ?, ?, ?)`,
    args: [uid(), boardId, cardId, action, details],
  });
}

// ─── BOARDS ───

export async function getBoards(): Promise<Board[]> {
  await init();
  const client = db();
  const result = await client.execute(`SELECT * FROM boards ORDER BY position ASC, created_at ASC`);
  return result.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    background: r.background as string,
    position: r.position as number,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function createBoard(name: string, background: string = "gradient-1"): Promise<Board> {
  await init();
  const client = db();
  const id = uid();
  const maxPos = await client.execute(`SELECT COALESCE(MAX(position), -1) as mp FROM boards`);
  const pos = ((maxPos.rows[0]?.mp as number) ?? -1) + 1;

  await client.execute({
    sql: `INSERT INTO boards (id, name, background, position) VALUES (?, ?, ?, ?)`,
    args: [id, name, background, pos],
  });

  // Create default columns
  const defaultCols = [
    { title: "Backlog", color: "#6C5CE7" },
    { title: "To Do", color: "#3B82F6" },
    { title: "In Progress", color: "#22C55E" },
    { title: "Review", color: "#F59E0B" },
    { title: "Done", color: "#14B8A6" },
  ];
  for (let i = 0; i < defaultCols.length; i++) {
    await client.execute({
      sql: `INSERT INTO columns (id, board_id, title, color, position) VALUES (?, ?, ?, ?, ?)`,
      args: [uid(), id, defaultCols[i].title, defaultCols[i].color, i],
    });
  }

  await logActivity(id, null, "board_created", `Board "${name}" created`);
  revalidatePath("/");

  return {
    id,
    name,
    background,
    position: pos,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateBoard(id: string, data: { name?: string; background?: string }) {
  await init();
  const client = db();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.background !== undefined) { sets.push("background = ?"); args.push(data.background); }
  sets.push("updated_at = datetime('now')");
  args.push(id);

  await client.execute({ sql: `UPDATE boards SET ${sets.join(", ")} WHERE id = ?`, args });
  revalidatePath("/");
}

export async function deleteBoard(id: string) {
  await init();
  const client = db();
  // Delete all related data
  await client.execute({ sql: `DELETE FROM activity_log WHERE board_id = ?`, args: [id] });
  const cols = await client.execute({ sql: `SELECT id FROM columns WHERE board_id = ?`, args: [id] });
  for (const col of cols.rows) {
    const cards = await client.execute({ sql: `SELECT id FROM cards WHERE column_id = ?`, args: [col.id as string] });
    for (const card of cards.rows) {
      await client.execute({ sql: `DELETE FROM card_labels WHERE card_id = ?`, args: [card.id as string] });
      await client.execute({ sql: `DELETE FROM checklist_items WHERE card_id = ?`, args: [card.id as string] });
    }
    await client.execute({ sql: `DELETE FROM cards WHERE column_id = ?`, args: [col.id as string] });
  }
  await client.execute({ sql: `DELETE FROM columns WHERE board_id = ?`, args: [id] });
  await client.execute({ sql: `DELETE FROM boards WHERE id = ?`, args: [id] });
  revalidatePath("/");
}

// ─── FULL BOARD FETCH ───

export async function getBoardWithData(boardId: string): Promise<{ board: Board; columns: Column[]; labels: Label[] } | null> {
  await init();
  const client = db();

  const boardResult = await client.execute({ sql: `SELECT * FROM boards WHERE id = ?`, args: [boardId] });
  if (boardResult.rows.length === 0) return null;
  const br = boardResult.rows[0];
  const board: Board = {
    id: br.id as string, name: br.name as string, background: br.background as string,
    position: br.position as number, created_at: br.created_at as string, updated_at: br.updated_at as string,
  };

  const colResult = await client.execute({
    sql: `SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC`,
    args: [boardId],
  });

  const columns: Column[] = [];
  for (const cr of colResult.rows) {
    const colId = cr.id as string;
    const cardResult = await client.execute({
      sql: `SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC`,
      args: [colId],
    });

    const cards: Card[] = [];
    for (const cardRow of cardResult.rows) {
      const cardId = cardRow.id as string;

      const labelResult = await client.execute({
        sql: `SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.label_id WHERE cl.card_id = ?`,
        args: [cardId],
      });
      const labels: Label[] = labelResult.rows.map((l) => ({
        id: l.id as string, name: l.name as string, color: l.color as string,
      }));

      const checkResult = await client.execute({
        sql: `SELECT * FROM checklist_items WHERE card_id = ? ORDER BY position ASC`,
        args: [cardId],
      });
      const checklist: ChecklistItem[] = checkResult.rows.map((c) => ({
        id: c.id as string, card_id: c.card_id as string, text: c.text as string,
        is_done: Boolean(c.is_done), position: c.position as number,
      }));

      cards.push({
        id: cardId, column_id: colId, title: cardRow.title as string,
        description: cardRow.description as string, priority: cardRow.priority as Card["priority"],
        due_date: cardRow.due_date as string | null, cover_color: cardRow.cover_color as string | null,
        position: cardRow.position as number, created_at: cardRow.created_at as string,
        labels, checklist,
      });
    }

    columns.push({
      id: colId, board_id: boardId, title: cr.title as string,
      color: cr.color as string, position: cr.position as number, cards,
    });
  }

  const labelsResult = await client.execute(`SELECT * FROM labels ORDER BY name ASC`);
  const labels: Label[] = labelsResult.rows.map((l) => ({
    id: l.id as string, name: l.name as string, color: l.color as string,
  }));

  return { board, columns, labels };
}

// ─── COLUMNS ───

export async function createColumn(boardId: string, title: string, color: string) {
  await init();
  const client = db();
  const id = uid();
  const maxPos = await client.execute({
    sql: `SELECT COALESCE(MAX(position), -1) as mp FROM columns WHERE board_id = ?`,
    args: [boardId],
  });
  const pos = ((maxPos.rows[0]?.mp as number) ?? -1) + 1;

  await client.execute({
    sql: `INSERT INTO columns (id, board_id, title, color, position) VALUES (?, ?, ?, ?, ?)`,
    args: [id, boardId, title, color, pos],
  });
  await logActivity(boardId, null, "column_created", `Column "${title}" added`);
  revalidatePath(`/board/${boardId}`);
  return id;
}

export async function updateColumn(columnId: string, data: { title?: string; color?: string }) {
  await init();
  const client = db();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color); }
  args.push(columnId);
  if (sets.length > 0) {
    await client.execute({ sql: `UPDATE columns SET ${sets.join(", ")} WHERE id = ?`, args });
  }
}

export async function deleteColumn(boardId: string, columnId: string) {
  await init();
  const client = db();
  // delete cards + their relations
  const cards = await client.execute({ sql: `SELECT id FROM cards WHERE column_id = ?`, args: [columnId] });
  for (const card of cards.rows) {
    await client.execute({ sql: `DELETE FROM card_labels WHERE card_id = ?`, args: [card.id as string] });
    await client.execute({ sql: `DELETE FROM checklist_items WHERE card_id = ?`, args: [card.id as string] });
  }
  await client.execute({ sql: `DELETE FROM cards WHERE column_id = ?`, args: [columnId] });
  await client.execute({ sql: `DELETE FROM columns WHERE id = ?`, args: [columnId] });
  await logActivity(boardId, null, "column_deleted", `Column deleted`);
  revalidatePath(`/board/${boardId}`);
}

export async function reorderColumns(boardId: string, orderedIds: string[]) {
  await init();
  const client = db();
  for (let i = 0; i < orderedIds.length; i++) {
    await client.execute({
      sql: `UPDATE columns SET position = ? WHERE id = ? AND board_id = ?`,
      args: [i, orderedIds[i], boardId],
    });
  }
}

// ─── CARDS ───

export async function createCard(columnId: string, boardId: string, title: string) {
  await init();
  const client = db();
  const id = uid();
  const maxPos = await client.execute({
    sql: `SELECT COALESCE(MAX(position), -1) as mp FROM cards WHERE column_id = ?`,
    args: [columnId],
  });
  const pos = ((maxPos.rows[0]?.mp as number) ?? -1) + 1;

  await client.execute({
    sql: `INSERT INTO cards (id, column_id, title, position) VALUES (?, ?, ?, ?)`,
    args: [id, columnId, title, pos],
  });
  await logActivity(boardId, id, "card_created", `Card "${title}" created`);
  revalidatePath(`/board/${boardId}`);
  return id;
}

export async function updateCard(
  cardId: string,
  boardId: string,
  data: {
    title?: string; description?: string; priority?: string;
    due_date?: string | null; cover_color?: string | null; column_id?: string;
  }
) {
  await init();
  const client = db();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.priority !== undefined) { sets.push("priority = ?"); args.push(data.priority); }
  if (data.due_date !== undefined) { sets.push("due_date = ?"); args.push(data.due_date); }
  if (data.cover_color !== undefined) { sets.push("cover_color = ?"); args.push(data.cover_color); }
  if (data.column_id !== undefined) { sets.push("column_id = ?"); args.push(data.column_id); }
  args.push(cardId);

  if (sets.length > 0) {
    await client.execute({ sql: `UPDATE cards SET ${sets.join(", ")} WHERE id = ?`, args });
    await logActivity(boardId, cardId, "card_updated", `Card updated`);
  }
  revalidatePath(`/board/${boardId}`);
}

export async function deleteCard(cardId: string, boardId: string) {
  await init();
  const client = db();
  await client.execute({ sql: `DELETE FROM card_labels WHERE card_id = ?`, args: [cardId] });
  await client.execute({ sql: `DELETE FROM checklist_items WHERE card_id = ?`, args: [cardId] });
  await client.execute({ sql: `DELETE FROM cards WHERE id = ?`, args: [cardId] });
  await logActivity(boardId, cardId, "card_deleted", `Card deleted`);
  revalidatePath(`/board/${boardId}`);
}

export async function moveCard(cardId: string, toColumnId: string, newPosition: number, boardId: string) {
  await init();
  const client = db();

  // Shift existing cards in target column
  await client.execute({
    sql: `UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?`,
    args: [toColumnId, newPosition],
  });

  await client.execute({
    sql: `UPDATE cards SET column_id = ?, position = ? WHERE id = ?`,
    args: [toColumnId, newPosition, cardId],
  });

  // Re-normalize positions in source column
  const sourceCards = await client.execute({
    sql: `SELECT id FROM cards WHERE column_id = (SELECT column_id FROM cards WHERE id = ?) ORDER BY position`,
    args: [cardId],
  });
  // No need — source is already fine since we removed one card

  await logActivity(boardId, cardId, "card_moved", `Card moved`);
}

export async function reorderCards(columnId: string, orderedIds: string[]) {
  await init();
  const client = db();
  for (let i = 0; i < orderedIds.length; i++) {
    await client.execute({
      sql: `UPDATE cards SET position = ?, column_id = ? WHERE id = ?`,
      args: [i, columnId, orderedIds[i]],
    });
  }
}

// ─── LABELS ───

export async function getLabels(): Promise<Label[]> {
  await init();
  const client = db();
  const result = await client.execute(`SELECT * FROM labels ORDER BY name ASC`);
  return result.rows.map((r) => ({
    id: r.id as string, name: r.name as string, color: r.color as string,
  }));
}

export async function toggleCardLabel(cardId: string, labelId: string, boardId: string) {
  await init();
  const client = db();
  const existing = await client.execute({
    sql: `SELECT 1 FROM card_labels WHERE card_id = ? AND label_id = ?`,
    args: [cardId, labelId],
  });
  if (existing.rows.length > 0) {
    await client.execute({
      sql: `DELETE FROM card_labels WHERE card_id = ? AND label_id = ?`,
      args: [cardId, labelId],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)`,
      args: [cardId, labelId],
    });
  }
  revalidatePath(`/board/${boardId}`);
}

// ─── CHECKLIST ───

export async function addChecklistItem(cardId: string, text: string, boardId: string) {
  await init();
  const client = db();
  const id = uid();
  const maxPos = await client.execute({
    sql: `SELECT COALESCE(MAX(position), -1) as mp FROM checklist_items WHERE card_id = ?`,
    args: [cardId],
  });
  const pos = ((maxPos.rows[0]?.mp as number) ?? -1) + 1;

  await client.execute({
    sql: `INSERT INTO checklist_items (id, card_id, text, position) VALUES (?, ?, ?, ?)`,
    args: [id, cardId, text, pos],
  });
  revalidatePath(`/board/${boardId}`);
  return id;
}

export async function toggleChecklistItem(itemId: string, boardId: string) {
  await init();
  const client = db();
  await client.execute({
    sql: `UPDATE checklist_items SET is_done = CASE WHEN is_done = 1 THEN 0 ELSE 1 END WHERE id = ?`,
    args: [itemId],
  });
  revalidatePath(`/board/${boardId}`);
}

export async function deleteChecklistItem(itemId: string, boardId: string) {
  await init();
  const client = db();
  await client.execute({ sql: `DELETE FROM checklist_items WHERE id = ?`, args: [itemId] });
  revalidatePath(`/board/${boardId}`);
}

// ─── ACTIVITY ───

export async function getActivity(boardId: string, limit: number = 30): Promise<ActivityEntry[]> {
  await init();
  const client = db();
  const result = await client.execute({
    sql: `SELECT * FROM activity_log WHERE board_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [boardId, limit],
  });
  return result.rows.map((r) => ({
    id: r.id as string, board_id: r.board_id as string, card_id: r.card_id as string | null,
    action: r.action as string, details: r.details as string, created_at: r.created_at as string,
  }));
}
