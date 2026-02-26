import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    name: string;
    slug: string;
    ownerEmail: string;
    ownerPassword: string;
    plan: string;
    daysToAdd: number;
  }) => void;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateTenantModal({ open, loading, onClose, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [plan, setPlan] = useState("pro");
  const [daysToAdd, setDaysToAdd] = useState(30);

  const suggestedSlug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    if (!open) return;
    // ao abrir: sugestão automática de slug se estiver vazio
    setTimeout(() => {
      if (!slug.trim() && suggestedSlug) setSlug(suggestedSlug);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit =
    name.trim().length >= 2 &&
    slug.trim().length >= 3 &&
    ownerEmail.trim().includes("@") &&
    ownerPassword.length >= 6;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (loading) return;
          onClose();
        }}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
          {/* header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Criar Tenant + Acesso do Lojista (1 passo)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ao confirmar, cria o tenant, registra o slug e cria o usuário no Firebase Auth já vinculado.
              </p>
            </div>
            <button
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              onClick={() => {
                if (loading) return;
                onClose();
              }}
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* body */}
          <div className="p-5 grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Nome da loja</label>
              <input
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!slug.trim()) setSlug(slugify(v));
                }}
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500 text-sm"
                placeholder="Ex: Jhan's Burgers"
                disabled={!!loading}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500 text-sm font-mono"
                placeholder="Ex: jhans-burgers"
                disabled={!!loading}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Sugestão automática: <span className="font-mono text-slate-400">{suggestedSlug || "-"}</span>
              </p>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Email do dono</label>
              <input
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500 text-sm"
                placeholder="dono@empresa.com"
                type="email"
                disabled={!!loading}
              />
            </div>

            {/* Senha com botão de visualizar */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Senha inicial</label>

              <div className="mt-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3">
                <input
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full bg-transparent py-3 text-white outline-none text-sm"
                  placeholder="mínimo 6 caracteres"
                  type={showPassword ? "text" : "password"}
                  disabled={!!loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  disabled={!!loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-1">Dica: clique no olho para mostrar/ocultar.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500">Plano</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none text-sm"
                  disabled={!!loading}
                >
                  <option value="pro">Pro</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500">Dias (paidUntil)</label>
                <select
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none text-sm"
                  disabled={!!loading}
                >
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                </select>
              </div>
            </div>

            {!canSubmit && (
              <p className="text-[11px] text-amber-400">
                Preencha tudo corretamente (senha ≥ 6, slug ≥ 3, email válido).
              </p>
            )}
          </div>

          {/* footer */}
          <div className="p-5 border-t border-slate-800 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={() => {
                if (loading) return;
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold"
              disabled={!!loading}
            >
              Cancelar
            </button>

            <button
              onClick={() => {
                if (!canSubmit || loading) return;
                onConfirm({
                  name: name.trim(),
                  slug: slug.trim(),
                  ownerEmail: ownerEmail.trim().toLowerCase(),
                  ownerPassword,
                  plan,
                  daysToAdd,
                });
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={!canSubmit || !!loading}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              Criar agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
