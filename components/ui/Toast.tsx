"use client";

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

/* ─── Context ─── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ─── Colors & Icons ─── */
const TOAST_CONFIG: Record<ToastType, { color: string; bg: string; border: string; icon: ReactNode }> = {
  success: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#22c55e" strokeWidth="1.2" />
        <path d="M4 7l2 2 4-4" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2" />
        <path d="M7 4v3.5M7 9.5v.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L1.5 11.5h11L7 2z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M7 6v2.5M7 10v.5" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    color: "#7c6af7",
    bg: "rgba(124,106,247,0.1)",
    border: "rgba(124,106,247,0.25)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#7c6af7" strokeWidth="1.2" />
        <path d="M7 6v4M7 4v.5" stroke="#7c6af7" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
};

/* ─── Single Toast ─── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = TOAST_CONFIG[toast.type];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer select-none"
      style={{
        background: "rgba(14,14,20,0.92)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
        minWidth: 260,
        maxWidth: 360,
      }}
      onClick={() => onDismiss(toast.id)}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: cfg.color }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[11.5px] text-white/40 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Dismiss */}
      <button className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 mt-0.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{ background: cfg.color, opacity: 0.5 }}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

/* ─── Toast Container ─── */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 360 }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto relative">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Provider ─── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 at once
  }, []);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (title, message) => addToast({ type: "success", title, message }),
    error:   (title, message) => addToast({ type: "error",   title, message }),
    info:    (title, message) => addToast({ type: "info",    title, message }),
    warning: (title, message) => addToast({ type: "warning", title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
