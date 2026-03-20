"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Copy Button ─── */
interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
  onCopied?: () => void;
  className?: string;
}

export function CopyButton({ text, label = "Copy", size = "sm", onCopied, className = "" }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      onCopied?.();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const config = {
    idle:   { icon: <CopyIcon />, label, color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
    copied: { icon: <CheckIcon />, label: "Copied!", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)" },
    error:  { icon: <XIcon />, label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  }[state];

  const pad = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const text_size = size === "md" ? "text-[12px]" : "text-[11px]";

  return (
    <motion.button
      onClick={handleCopy}
      whileTap={{ scale: 0.94 }}
      className={`flex items-center gap-1.5 rounded-lg font-medium border transition-all duration-200 ${pad} ${text_size} ${className}`}
      style={{ color: config.color, background: config.bg, borderColor: config.border }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state} className="flex items-center gap-1.5"
          initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
          transition={{ duration: 0.15 }}>
          <span className="w-3.5 h-3.5">{config.icon}</span>
          {config.label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── Download Button ─── */
interface DownloadButtonProps {
  content: string;
  filename?: string;
  label?: string;
  size?: "sm" | "md";
  onDownloaded?: () => void;
  className?: string;
}

export function DownloadButton({
  content,
  filename = "review.txt",
  label = "Download",
  size = "sm",
  onDownloaded,
  className = "",
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownloaded?.();
    } catch {
      console.error("Download failed");
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const pad = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const text_size = size === "md" ? "text-[12px]" : "text-[11px]";

  return (
    <motion.button
      onClick={handleDownload}
      disabled={downloading}
      whileTap={{ scale: 0.94 }}
      className={`flex items-center gap-1.5 rounded-lg font-medium border transition-all duration-200
                  disabled:opacity-60 ${pad} ${text_size} ${className}`}
      style={{
        color: downloading ? "#7c6af7" : "rgba(255,255,255,0.35)",
        background: downloading ? "rgba(124,106,247,0.1)" : "rgba(255,255,255,0.04)",
        borderColor: downloading ? "rgba(124,106,247,0.3)" : "rgba(255,255,255,0.08)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {downloading ? (
          <motion.span key="dl" className="flex items-center gap-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SpinnerIcon />
            Downloading…
          </motion.span>
        ) : (
          <motion.span key="idle" className="flex items-center gap-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DownloadIcon />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── Generate download content ─── */
export function buildDownloadText(raw: string, meta: {
  filename: string;
  language: string;
  linesAnalysed: number;
  durationMs: number;
  createdAt: string;
}): string {
  const sep = "─".repeat(60);
  return [
    "AI CODE REVIEWER — ANALYSIS REPORT",
    sep,
    `File      : ${meta.filename}`,
    `Language  : ${meta.language}`,
    `Lines     : ${meta.linesAnalysed}`,
    `Duration  : ${(meta.durationMs / 1000).toFixed(1)}s`,
    `Date      : ${new Date(meta.createdAt).toLocaleString()}`,
    sep,
    "",
    raw,
    "",
    sep,
    "Generated by AI Code Reviewer — https://localhost:3000",
  ].join("\n");
}

/* ─── Micro Icons ─── */
function CopyIcon() {
  return <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function XIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function DownloadIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v7M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 9v2h10V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function SpinnerIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".2"/>
    <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
