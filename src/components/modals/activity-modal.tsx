"use client";

import { useState, useEffect } from "react";
import type { ActivityEntry } from "@/lib/types";
import { getActivity } from "@/actions/board-actions";
import { Icon } from "@/components/icons";

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

export default ActivityModal;
