import React from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  requireText?: string; // ex: "DELETE"
  inputValue?: string;
  onInputChange?: (v: string) => void;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  requireText,
  inputValue,
  onInputChange,
  loading,
  onClose,
  onConfirm,
  children,
}: Props) {
  if (!open) return null;

  const canConfirm = requireText
    ? (inputValue || "").trim() === requireText
    : true;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => (loading ? null : onClose())}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {description}
            </p>
          )}

          {requireText && (
            <div className="mt-4">
              <label className="text-[10px] uppercase font-bold text-slate-500">
                Digite <span className="text-red-400">{requireText}</span> para confirmar
              </label>
              <input
                value={inputValue || ""}
                onChange={(e) => onInputChange?.(e.target.value)}
                className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-red-500"
                placeholder={requireText}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex gap-2 mt-6">
            {children}
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={loading || !canConfirm}
              className={`flex-1 py-3 rounded-xl font-bold transition disabled:opacity-50 ${
                danger
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {loading ? "Processando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
