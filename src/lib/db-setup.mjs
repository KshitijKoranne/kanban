import { createClient } from "@libsql/client";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Board',
    background TEXT NOT NULL DEFAULT 'gradient-1',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Column',
    color TEXT NOT NULL DEFAULT '#6C5CE7',
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'none',
    due_date TEXT,
    cover_color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS card_labels (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
  )`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    card_id TEXT,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

const DEFAULT_LABELS = [
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

async function setup() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("❌ TURSO_DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("🔄 Connecting to Turso...");
  const client = createClient({ url, authToken: authToken || undefined });

  console.log("📋 Creating tables...");
  for (const stmt of SCHEMA_STATEMENTS) {
    await client.execute(stmt);
  }

  console.log("🏷️  Seeding default labels...");
  for (const label of DEFAULT_LABELS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO labels (id, name, color) VALUES (?, ?, ?)`,
      args: [label.id, label.name, label.color],
    });
  }

  console.log("✅ Database setup complete!");
  process.exit(0);
}

setup().catch((e) => {
  console.error("❌ Setup failed:", e);
  process.exit(1);
});
