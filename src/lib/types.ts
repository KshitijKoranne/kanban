export interface Board {
  id: string;
  name: string;
  background: string;
  position: number;
  created_at: string;
  updated_at: string;
  columns?: Column[];
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  color: string;
  position: number;
  cards: Card[];
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  cover_color: string | null;
  position: number;
  created_at: string;
  labels: Label[];
  checklist: ChecklistItem[];
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  card_id: string;
  text: string;
  is_done: boolean;
  position: number;
}

export interface ActivityEntry {
  id: string;
  board_id: string;
  card_id: string | null;
  action: string;
  details: string;
  created_at: string;
}

export const PRIORITY_CONFIG = {
  none: { label: "No priority", icon: "—", color: "#5A6180" },
  low: { label: "Low", icon: "▽", color: "#22C55E" },
  medium: { label: "Medium", icon: "◆", color: "#F59E0B" },
  high: { label: "High", icon: "▲", color: "#EF4444" },
  urgent: { label: "Urgent", icon: "⚡", color: "#DC2626" },
} as const;

export const COLUMN_PRESETS = [
  "#6C5CE7", "#3B82F6", "#0EA5E9", "#14B8A6", "#22C55E",
  "#F59E0B", "#F97316", "#EF4444", "#EC4899", "#A855F7",
];
