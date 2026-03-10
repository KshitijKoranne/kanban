import { createClient } from "@libsql/client";

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

let _client: ReturnType<typeof createClient> | null = null;

export function db() {
  if (!_client) {
    _client = getClient();
  }
  return _client;
}

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Board',
    background TEXT NOT NULL DEFAULT 'gradient-1',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Column',
    color TEXT NOT NULL DEFAULT '#6C5CE7',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'none',
    due_date TEXT,
    cover_color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS card_labels (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    card_id TEXT,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const DEFAULT_LABELS = [
  { id: "lbl-bug", name: "Bug", color: "#EF4444" },
  { id: "lbl-feature", name: "Feature", color: "#3B82F6" },
  { id: "lbl-improvement", name: "Improvement", color: "#22C55E" },
  { id: "lbl-docs", name: "Docs", color: "#F59E0B" },
  { id: "lbl-design", name: "Design", color: "#EC4899" },
  { id: "lbl-refactor", name: "Refactor", color: "#A855F7" },
  { id: "lbl-test", name: "Testing", color: "#14B8A6" },
  { id: "lbl-devops", name: "DevOps", color: "#F97316" },
  { id: "lbl-research", name: "Research", color: "#6366F1" },
  { id: "lbl-urgent", name: "Urgent", color: "#DC2626" },
];

export const BOARD_BACKGROUNDS = [
  { id: "gradient-1", css: "linear-gradient(135deg, #0B0E1A 0%, #1a1040 50%, #0B0E1A 100%)", label: "Deep Space" },
  { id: "gradient-2", css: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0a1628 100%)", label: "Midnight" },
  { id: "gradient-3", css: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", label: "GitHub Dark" },
  { id: "gradient-4", css: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)", label: "Indigo Night" },
  { id: "gradient-5", css: "linear-gradient(135deg, #0c1220 0%, #1c2333 50%, #0f172a 100%)", label: "Ocean Floor" },
  { id: "gradient-6", css: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", label: "Navy Fade" },
  { id: "gradient-7", css: "linear-gradient(135deg, #0B0E1A 0%, #1B2838 100%)", label: "Steam" },
  { id: "gradient-8", css: "linear-gradient(135deg, #141E30 0%, #243B55 100%)", label: "Royal Blue" },
  { id: "solid-1", css: "#0B0E1A", label: "Void" },
  { id: "solid-2", css: "#0d1117", label: "Charcoal" },
  { id: "solid-3", css: "#1e1b4b", label: "Deep Indigo" },
  { id: "solid-4", css: "#172554", label: "Dark Blue" },
];

export const CARD_COVERS = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#0EA5E9",
  null, // no cover
];

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
