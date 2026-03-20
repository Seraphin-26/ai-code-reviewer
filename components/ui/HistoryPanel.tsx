"use client";

import { motion, AnimatePresence } from "framer-motion";
import { type HistoryEntry, formatRelativeTime, useReviewHistory } from "./useReviewHistory";

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

const SCORE_COLOR = (s: number | null) =>
  s === null ? "#4a4a58"
  : s >= 8   ? "#22c55e"
  : s >= 6   ? "#7c6af7"
  : s >= 4   ? "#f59e0b"
  :            "#ef4444";

const LANG_DOT: Record<string, string> = {
  javascript: "#f59e0b",
  typescript: "#3b82f6",
  python:     "#22c55e",
};

export function HistoryPanel({ open, onClose, onRestore }: HistoryPanelProps) {
  const { history, removeEntry, clearHistory } = useReviewHistory();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: "min(100vw, 400px)",
              background: "rgba(10,10,15,0.97)",
              backdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(124,106,247,0.15)", border: "1px solid rgba(124,106,247,0.25)" }}>
                  <HistoryIcon size={14} className="text-[#7c6af7]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/80">Review History</p>
                  <p className="text-[10px] text-white/25">{history.length} / 20 saved</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[11px] text-white/25 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30
                             hover:text-white/60 hover:bg-white/[0.06] transition-all"
                >
                  <XIcon size={13} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <HistoryIcon size={24} className="text-white/15" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/30">No reviews yet</p>
                    <p className="text-xs text-white/15 mt-1">Your reviews will appear here automatically.</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {history.map((entry) => (
                    <HistoryCard
                      key={entry.id}
                      entry={entry}
                      onRestore={() => { onRestore(entry); onClose(); }}
                      onDelete={() => removeEntry(entry.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.05]">
              <p className="text-[10px] text-white/15 text-center">
                Stored locally in your browser · never sent to our servers
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Single History Card ─── */
function HistoryCard({ entry, onRestore, onDelete }: {
  entry: HistoryEntry;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const scoreColor = SCORE_COLOR(entry.score);
  const langColor  = LANG_DOT[entry.language] ?? "#8888aa";
  const preview    = entry.code.trim().split("\n").slice(0, 2).join(" ").slice(0, 80);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group rounded-xl border border-white/[0.06] overflow-hidden cursor-pointer
                 hover:border-white/[0.12] transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.025)" }}
      onClick={onRestore}
    >
      <div className="p-3 space-y-2.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: langColor }} />
            <span className="text-[12px] font-mono text-white/65 truncate">{entry.filename || "untitled"}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Score badge */}
            {entry.score !== null && (
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md"
                style={{ color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}30` }}>
                {entry.score}/10
              </span>
            )}
            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center
                         rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <XIcon size={10} />
            </button>
          </div>
        </div>

        {/* Code preview */}
        <p className="text-[10.5px] font-mono text-white/20 leading-relaxed truncate">
          {preview}…
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono">
            <span>{entry.linesAnalysed} lines</span>
            <span>·</span>
            <span>{(entry.durationMs / 1000).toFixed(1)}s</span>
            <span>·</span>
            <span className="capitalize">{entry.language}</span>
          </div>
          <span className="text-[10px] text-white/18">{formatRelativeTime(entry.createdAt)}</span>
        </div>
      </div>

      {/* Restore hint */}
      <div className="px-3 py-2 border-t border-white/[0.04] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(124,106,247,0.06)" }}>
        <RestoreIcon size={10} className="text-[#7c6af7]" />
        <span className="text-[10px] text-[#7c6af7]/70 font-medium">Click to restore this review</span>
      </div>
    </motion.div>
  );
}

/* ─── Icons ─── */
type IP = { size?: number; className?: string };
function HistoryIcon({ size = 16, className = "" }: IP) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.5 5A5.5 5.5 0 1 1 3 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M1 5h2.5V2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function XIcon({ size = 16, className = "" }: IP) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function RestoreIcon({ size = 16, className = "" }: IP) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M2 6a4 4 0 1 0 .7-2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M2 3v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
