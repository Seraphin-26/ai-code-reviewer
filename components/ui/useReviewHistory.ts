"use client";

import { useState, useCallback, useEffect } from "react";

/* ─── Types ─── */
export interface HistoryEntry {
  id: string;
  filename: string;
  language: string;
  code: string;
  raw: string;
  score: number | null;
  linesAnalysed: number;
  durationMs: number;
  createdAt: string;
}

const STORAGE_KEY = "ai-code-reviewer:history";
const MAX_ENTRIES = 20;

/* ─── Helpers ─── */
function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore quota errors
  }
}

/* ─── Hook ─── */
export function useReviewHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "createdAt">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
    return newEntry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}

/* ─── Utilities ─── */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function parseScoreFromRaw(raw: string): number | null {
  const m = raw.match(/(?:score[:\s*]*|quality.*?:?\s*)(\d+)\s*(?:\/\s*10|out of 10)/i);
  return m ? Math.min(10, Math.max(0, parseInt(m[1], 10))) : null;
}
