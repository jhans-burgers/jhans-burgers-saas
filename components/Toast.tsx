import React, { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastContextType = {
  show: (t: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const show = (t: Omit<ToastItem, "id">) => {
    const id = uid();
    const durationMs = t.durationMs ?? 3500;

    const item: ToastItem = { id, ...t };
    setToasts((prev) => [item, ...prev].slice(0, 4));

    window.setTimeout(() => remove(id), durationMs);
  };

  const api = useMemo<ToastContextType>(() => {
    return {
      show,
      success: (message, title) => show({ type: "success", message, title }),
      error: (message, title) => show({ type: "error", message, title, durationMs: 5000 }),
      info: (message, title) => show({ type: "info", message, title }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Container */}
      <div className="fixed z-[9999] top-4 right-4 flex flex-col gap-2 w-[340px] max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 flex gap-3">
              <div className="mt-0.5">
                {t.type === "success" && <CheckCircle2 className="text-emerald-400" size={18} />}
                {t.type === "error" && <AlertTriangle className="text-red-400" size={18} />}
                {t.type === "info" && <Info className="text-blue-400" size={18} />}
              </div>

              <div className="flex-1">
                {t.title && <div className="text-sm font-bold text-white">{t.title}</div>}
                <div className="text-sm text-slate-300 leading-snug">{t.message}</div>
              </div>

              <button
                onClick={() => remove(t.id)}
                className="text-slate-500 hover:text-white transition"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Accent bar */}
            <div
              className={`h-1 ${
                t.type === "success"
                  ? "bg-emerald-500/60"
                  : t.type === "error"
                  ? "bg-red-500/60"
                  : "bg-blue-500/60"
              }`}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
