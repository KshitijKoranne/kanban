"use client";

import type { Column } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { Icon } from "@/components/icons";

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

export default StatsModal;
