import React, { useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { authMaster as auth, dbMaster, appMaster } from "../services/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Tenant } from "../types";
import { migrateGlobalDataToTenant } from "../utils/migrationHelper";
import {
  Loader2,
  Users,
  Calendar,
  Check,
  Ban,
  LogOut,
  Database,
  Lock,
  RefreshCw,
  Copy,
  Search,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { copyToClipboard } from "../utils";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import CreateTenantModal from "../components/CreateTenantModal";
import { getAuth } from "firebase/auth";


type BillingFilter = "ativos" | "vencendo" | "vencidos" | "todos";

function daysBetween(dateA: Date, dateB: Date) {
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((utcB - utcA) / msPerDay);
}

function getPaidUntilDate(t: any): Date | null {
  if (!t?.paidUntil) return null;
  if (typeof t.paidUntil?.toDate === "function") return t.paidUntil.toDate();
  if (typeof t.paidUntil?.seconds === "number") return new Date(t.paidUntil.seconds * 1000);
  try {
    return new Date(t.paidUntil);
  } catch {
    return null;
  }
}

export default function MasterAdminPage() {
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // UX do botão Atualizar
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [refreshOk, setRefreshOk] = useState(false);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Migration
  const [migrationTargetId, setMigrationTargetId] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  // Billing dashboard
  const [billingFilter, setBillingFilter] = useState<BillingFilter>("vencendo");
  const [searchTerm, setSearchTerm] = useState("");
  const [daysWindow, setDaysWindow] = useState(7);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Create (1 passo)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingOneStep, setCreatingOneStep] = useState(false);

  const SUPER_ADMINS = useMemo(() => ["Bz6OvZ0e58jSX6aPpyc6WPVj4QQe"], []);

  // Callable Function
const functions = useMemo(() => getFunctions(appMaster, "us-central1"), []);
  const adminCreateOwnerUserAndLink = useMemo(
    () => httpsCallable(functions, "adminCreateOwnerUserAndLink"),
    [functions]
  );

  // ✅ CORREÇÃO PRINCIPAL:
  // - NÃO dar signOut/logout automático quando "não é master"
  // - porque isso derruba a sessão em TODAS as abas (master/painel)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log("MASTER AUTH CHANGED:", { uid: u?.uid, email: u?.email });



      if (u && SUPER_ADMINS.includes(u.uid)) {
        setUser(u);
        setLoading(false);
        await loadTenants({ silent: true });
        return;
      }

      // Não é master -> só bloqueia a tela do master (sem deslogar global)
      setUser(null);
      setLoading(false);

      if (u) {
        console.warn("Acesso negado ao Master:", u.uid, u.email);
        // opcional: toast aqui, mas NÃO signOut
        // toast.error("Seu usuário não tem permissão de Master.", "Acesso negado");
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SUPER_ADMINS]);

  const loadTenants = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    try {
      setRefreshing(true);
      setRefreshOk(false);

      const snap = await getDocs(collection(dbMaster, "tenants"));
      setTenants(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant)));

      setLastRefreshAt(Date.now());
      setRefreshOk(true);

      if (!silent) toast.success("Lista atualizada!", "Tenants");

      setTimeout(() => setRefreshOk(false), 1200);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar lista.", "Tenants");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      toast.success("Login master realizado.", "Master");
    } catch (err) {
      console.error("MASTER LOGIN ERROR:", err);
      toast.error("Erro no login do Master. Verifique email/senha.", "Login Master");
    }
  };

  const extendSubscription = async (tenantId: string) => {
    const t: any = tenants.find((x: any) => x.id === tenantId);
    if (!t) return;

    try {
      const paidUntil = getPaidUntilDate(t);
      const base = paidUntil && paidUntil > new Date() ? paidUntil : new Date();
      const nextMonth = new Date(base);
      nextMonth.setDate(nextMonth.getDate() + 30);

      await updateDoc(doc(dbMaster, "tenants", tenantId), {
        paidUntil: Timestamp.fromDate(nextMonth),
        subscriptionStatus: "active",
      });

      toast.success("Renovado +30 dias.", "Assinatura");
      loadTenants({ silent: true });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao renovar.", "Assinatura");
    }
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "suspended" : "active";
      await updateDoc(doc(dbMaster, "tenants", tenantId), { subscriptionStatus: newStatus });
      toast.success(`Status alterado para ${newStatus}.`, "Tenant");
      loadTenants({ silent: true });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar status.", "Tenant");
    }
  };

  const handleMigration = async () => {
    if (!migrationTargetId) {
      toast.info("Selecione um Tenant ID de destino.", "Migração");
      return;
    }
    setIsMigrating(true);
    try {
      const counts = await migrateGlobalDataToTenant(dbMaster, migrationTargetId);
      toast.success(
        `Migração OK. Orders:${counts.orders} Products:${counts.products} Clients:${counts.clients}`,
        "Migração"
      );
    } catch (e: any) {
      toast.error(e?.message || "Erro na migração.", "Migração");
    } finally {
      setIsMigrating(false);
    }
  };

  // Delete
  const openDeleteTenantModal = (t: any) => {
    setDeleteTarget(t);
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const confirmDeleteTenant = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);

      if (deleteTarget.slug) {
        await deleteDoc(doc(dbMaster, "tenantSlugs", String(deleteTarget.slug)));
      }

      await deleteDoc(doc(dbMaster, "tenants", String(deleteTarget.id)));

      toast.success("Tenant excluído com sucesso!", "Excluir");
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      loadTenants({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir tenant.", "Excluir");
    } finally {
      setDeleting(false);
    }
  };

  // Create tenant + owner (1 passo)
  const createTenantAndOwnerOneStep = async (data: {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  plan: string;
  daysToAdd: number;
}) => {
  try {
    setCreatingOneStep(true);

    console.log("=== CREATE TENANT START ===");

    // ✅ pega o usuário logado SEM depender de authMaster
    const masterUser = getAuth(appMaster).currentUser;
    console.log("MASTER USER:", {
      uid: masterUser?.uid,
      email: masterUser?.email,
    });

    console.log("DATA RECEBIDA:", {
      name: data.name,
      slug: data.slug,
      ownerEmail: data.ownerEmail,
      plan: data.plan,
      daysToAdd: data.daysToAdd,
    });

    console.log("1) VALIDANDO SLUG (checando se já existe)...");
    const slugRef = doc(dbMaster, "tenantSlugs", data.slug);
    const slugSnap = await getDoc(slugRef);

    console.log("   slug existe?", slugSnap.exists());
    if (slugSnap.exists()) {
      toast.error("Esse slug já existe. Escolha outro.", "Slug duplicado");
      console.log("=== CREATE TENANT ABORT (slug duplicado) ===");
      return;
    }

    console.log("2) CALCULANDO paidUntil...");
    const paidUntil = new Date(Date.now() + data.daysToAdd * 24 * 60 * 60 * 1000);
    console.log("   paidUntil:", paidUntil.toISOString());

    console.log("3) CRIANDO tenant em /tenants ...");
    const tenantRef = await addDoc(collection(dbMaster, "tenants"), {
      name: data.name,
      slug: data.slug,
      ownerEmail: data.ownerEmail,
      subscriptionStatus: "active",
      plan: data.plan,
      createdAt: serverTimestamp(),
      paidUntil: Timestamp.fromDate(paidUntil),

      // ✅ Loja já nasce aberta
      publicEnabled: true,

      // ✅ Raio padrão do dispatch (você pode mudar depois no painel)
      dispatchRadiusKm: 5,

    });
    console.log("   ✅ tenant criado. tenantId:", tenantRef.id);

    console.log("4) CRIANDO tenantSlug em /tenantSlugs/{slug} ...");
    await setDoc(doc(dbMaster, "tenantSlugs", data.slug), {
      tenantId: tenantRef.id,
      createdAt: serverTimestamp(),
    });
    console.log("   ✅ tenantSlug criado para:", data.slug);

    console.log("5) CHAMANDO function adminCreateOwnerUserAndLink ...");
    console.log("   payload:", { tenantId: tenantRef.id, email: data.ownerEmail });

    const res: any = await adminCreateOwnerUserAndLink({
      tenantId: tenantRef.id,
      email: data.ownerEmail,
      password: data.ownerPassword,
    });

    console.log("   ✅ function respondeu:", res);

    const uid = res?.data?.uid || "";
    console.log("   UID retornado:", uid);

    toast.success(`Criado com sucesso! UID: ${uid}`, "Tenant + Acesso");

    setCreateModalOpen(false);

    console.log("6) RECARREGANDO lista de tenants (loadTenants)...");
    await loadTenants({ silent: true });
    console.log("   ✅ loadTenants OK");

    console.log("=== CREATE TENANT FINISH (OK) ===");
  } catch (err: any) {
    console.error("❌ ERRO createTenantAndOwnerOneStep:", err);
    toast.error(err?.message || "Erro ao criar tenant + acesso.", "Erro");
  } finally {
    setCreatingOneStep(false);
  }
};


  // ---- Billing computed list ----
  const enrichedTenants = useMemo(() => {
    return (tenants as any[]).map((t) => {
      const paidUntil = getPaidUntilDate(t);
      const daysLeft = paidUntil ? daysBetween(new Date(), paidUntil) : null;
      const name = (t.name || "").toString();
      const slug = (t.slug || "").toString();
      const ownerEmail = (t.ownerEmail || "").toString();
      const status = (t.subscriptionStatus || "").toString();
      return {
        ...t,
        _paidUntil: paidUntil,
        _daysLeft: daysLeft,
        _nameLC: name.toLowerCase(),
        _slugLC: slug.toLowerCase(),
        _emailLC: ownerEmail.toLowerCase(),
        _status: status,
      };
    });
  }, [tenants]);

  const counts = useMemo(() => {
    const vencidos = enrichedTenants.filter((t) => t._paidUntil && t._paidUntil < new Date()).length;
    const vencendo = enrichedTenants.filter((t) => {
      if (!t._paidUntil) return false;
      const dl = t._daysLeft;
      if (dl === null) return false;
      return dl >= 0 && dl <= daysWindow;
    }).length;
    const ativos = enrichedTenants.filter((t) => {
      if (!t._paidUntil) return false;
      const dl = t._daysLeft;
      return dl !== null && dl > daysWindow;
    }).length;
    return { vencidos, vencendo, ativos, total: enrichedTenants.length };
  }, [enrichedTenants, daysWindow]);

  const filteredTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = enrichedTenants;

    if (billingFilter === "vencidos") {
      list = list.filter((t) => t._paidUntil && t._paidUntil < new Date());
    } else if (billingFilter === "vencendo") {
      list = list.filter((t) => {
        if (!t._paidUntil) return false;
        const dl = t._daysLeft;
        if (dl === null) return false;
        return dl >= 0 && dl <= daysWindow;
      });
    } else if (billingFilter === "ativos") {
      list = list.filter((t) => {
        if (!t._paidUntil) return false;
        const dl = t._daysLeft;
        return dl !== null && dl > daysWindow;
      });
    }

    if (term) {
      list = list.filter(
        (t) =>
          t._nameLC.includes(term) ||
          t._slugLC.includes(term) ||
          t._emailLC.includes(term) ||
          (t.id || "").toLowerCase().includes(term)
      );
    }

    const sortByDays = (a: any, b: any) => {
      const da = a._daysLeft;
      const db2 = b._daysLeft;
      if (da === null && db2 === null) return 0;
      if (da === null) return 1;
      if (db2 === null) return -1;
      return da - db2;
    };

    const sortByMostExpired = (a: any, b: any) => {
      const da = a._daysLeft ?? 999999;
      const db2 = b._daysLeft ?? 999999;
      return da - db2;
    };

    if (billingFilter === "vencidos") return [...list].sort(sortByMostExpired);
    return [...list].sort(sortByDays);
  }, [enrichedTenants, billingFilter, searchTerm, daysWindow]);

  const billingBadge = (t: any) => {
    const dl = t._daysLeft;
    const status = t.subscriptionStatus;

    if (!t._paidUntil) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border bg-slate-800 text-slate-300 border-slate-700">
          Sem data
        </span>
      );
    }

    if (dl !== null && dl < 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border bg-red-900/20 text-red-400 border-red-500/30 flex items-center gap-1">
          <AlertTriangle size={10} /> Vencido {Math.abs(dl)}d
        </span>
      );
    }

    if (dl !== null && dl <= daysWindow) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border bg-amber-900/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
          <Clock size={10} /> Vence em {dl}d
        </span>
      );
    }

    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
          status === "active"
            ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/30"
            : "bg-red-900/20 text-red-400 border-red-500/30"
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <form
          onSubmit={handleLogin}
          className="p-8 bg-slate-800 rounded-xl space-y-4 w-full max-w-sm border border-slate-700 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <Lock size={24} />
            </div>
            <h1 className="text-xl font-bold">Master Admin</h1>
            <p className="text-slate-500 text-xs">Acesso restrito ao proprietário do SaaS</p>
          </div>

          <input
            type="email"
            placeholder="Master Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white outline-none focus:border-red-500"
          />

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Senha</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-3 text-white outline-none text-sm"
                placeholder="Senha do Master"
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="w-full bg-red-600 p-3 rounded font-bold hover:bg-red-500 transition-colors">
            Acessar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
              Jhans System
            </h1>
            <p className="text-slate-500 text-sm">Gerenciamento de Multi-Tenants</p>
          </div>
          <div className="text-right flex items-center gap-4">
            <p className="text-xs text-slate-400 font-mono hidden md:block">{user.email}</p>
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 transition-colors hover:border-red-500/50"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Create Tenant - only 1 step */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
              <h2 className="text-lg font-bold mb-2 text-emerald-400 flex items-center gap-2">
                <Plus size={18} /> Novo Tenant
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Crie tenant + usuário do dono em um passo (recomendado).
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold transition-colors shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Novo Tenant (1 passo)
              </button>
            </div>

            {/* Migration Tool */}
            <div className="bg-slate-900 p-6 rounded-xl border border-amber-500/30 shadow-lg relative overflow-hidden">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-amber-500">
                <Database size={18} /> Migração de Dados
              </h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Mova coleções globais (legado) para a estrutura isolada de um tenant.
              </p>
              <input
                placeholder="ID do Tenant de Destino"
                value={migrationTargetId}
                onChange={(e) => setMigrationTargetId(e.target.value)}
                className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white text-sm mb-3 font-mono outline-none focus:border-amber-500"
              />
              <button
                onClick={handleMigration}
                disabled={isMigrating}
                className="w-full bg-amber-900/20 hover:bg-amber-900/40 text-amber-500 border border-amber-500/30 py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMigrating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {isMigrating ? "Migrando..." : "Executar Migração"}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-slate-400" /> Tenants ({counts.total})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Controle de vencimentos: {counts.vencidos} vencidos • {counts.vencendo} vencendo (≤ {daysWindow}d) •{" "}
                    {counts.ativos} ativos
                  </p>
                  {lastRefreshAt && (
                    <p className="text-[10px] text-slate-600 mt-1">
                      Atualizado às {new Date(lastRefreshAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => loadTenants()}
                  disabled={refreshing}
                  className={`relative overflow-hidden text-xs font-bold flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                    ${
                      refreshing
                        ? "bg-slate-900 text-slate-400 border-slate-800 cursor-not-allowed"
                        : "bg-slate-950 text-blue-400 hover:text-white border-slate-800 hover:border-slate-700"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {refreshing ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : refreshOk ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {refreshing ? "Atualizando..." : refreshOk ? "Atualizado!" : "Atualizar"}
                  </span>

                  {/* progress bar */}
                  {refreshing && (
                    <span className="absolute left-0 bottom-0 h-[2px] w-full bg-slate-800">
                      <span className="absolute left-0 top-0 h-full w-1/3 bg-blue-500 animate-[slide_0.8s_linear_infinite]" />
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setBillingFilter("vencendo")}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                      billingFilter === "vencendo"
                        ? "bg-amber-900/20 text-amber-400 border-amber-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Vencendo ({counts.vencendo})
                  </button>
                  <button
                    onClick={() => setBillingFilter("vencidos")}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                      billingFilter === "vencidos"
                        ? "bg-red-900/20 text-red-400 border-red-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Vencidos ({counts.vencidos})
                  </button>
                  <button
                    onClick={() => setBillingFilter("ativos")}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                      billingFilter === "ativos"
                        ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Ativos ({counts.ativos})
                  </button>
                  <button
                    onClick={() => setBillingFilter("todos")}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                      billingFilter === "todos"
                        ? "bg-blue-900/20 text-blue-300 border-blue-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Todos ({counts.total})
                  </button>

                  <div className="flex items-center gap-2 ml-0 md:ml-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Janela</span>
                    <select
                      value={daysWindow}
                      onChange={(e) => setDaysWindow(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value={3}>3 dias</option>
                      <option value={7}>7 dias</option>
                      <option value={10}>10 dias</option>
                      <option value={15}>15 dias</option>
                      <option value={30}>30 dias</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 w-full md:w-[320px]">
                    <Search size={14} className="text-slate-500" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent outline-none text-sm text-white w-full"
                      placeholder="Buscar por nome, slug, email, id..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {filteredTenants.length === 0 && (
              <div className="text-center py-16 bg-slate-900 rounded-xl border border-dashed border-slate-800 text-slate-500">
                Nenhum tenant encontrado neste filtro.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTenants.map((t: any) => (
                <div
                  key={t.id}
                  className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col gap-4 hover:border-slate-600 transition-colors shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        {t.name}
                        <a
                          href={`/loja/${t.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:text-blue-400 text-xs bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/30 font-normal no-underline flex items-center gap-1"
                        >
                          Ver Loja
                        </a>
                      </h3>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {billingBadge(t)}
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700">
                          <Calendar size={10} /> {t._paidUntil ? t._paidUntil.toLocaleDateString() : "Sem paidUntil"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(t.id)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                      title="Copiar ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-500 font-mono break-all">
                      <span className="text-slate-600 font-bold select-none">ID:</span> {t.id}
                    </p>
                    <p className="text-xs text-slate-500 break-all">
                      <span className="text-slate-600 font-bold select-none">Owner:</span> {t.ownerEmail}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="text-slate-600 font-bold select-none">Slug:</span> /{t.slug}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800">
                    <button
                      onClick={() => toggleStatus(t.id, t.subscriptionStatus)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                        t.subscriptionStatus === "active"
                          ? "border-red-500/30 text-red-400 hover:bg-red-900/20"
                          : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/20"
                      }`}
                    >
                      {t.subscriptionStatus === "active" ? (
                        <>
                          <Ban size={14} /> Suspender
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Ativar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => extendSubscription(t.id)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                      <Calendar size={14} /> Renovar (+30)
                    </button>

                    <button
                      onClick={() => openDeleteTenantModal(t)}
                      className="flex-1 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center justify-center gap-2 border-red-500/30 text-red-400 hover:bg-red-900/20"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-600">
              Ordenação automática: <b>Vencendo</b> (mais próximo primeiro) • <b>Vencidos</b> (mais atrasado primeiro) •{" "}
              <b>Todos</b> (mais próximo primeiro)
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteModalOpen}
        title={`Excluir tenant: ${deleteTarget?.name || ""}`}
        description="Isso remove o tenant e o slug mapping. Esta ação não pode ser desfeita."
        danger
        confirmText="Excluir"
        cancelText="Cancelar"
        requireText="DELETE"
        inputValue={deleteConfirmText}
        onInputChange={setDeleteConfirmText}
        loading={deleting}
        onClose={() => {
          if (deleting) return;
          setDeleteModalOpen(false);
          setDeleteTarget(null);
          setDeleteConfirmText("");
        }}
        onConfirm={confirmDeleteTenant}
      />

      <CreateTenantModal
        open={createModalOpen}
        loading={creatingOneStep}
        onClose={() => {
          if (creatingOneStep) return;
          setCreateModalOpen(false);
        }}
        onConfirm={createTenantAndOwnerOneStep}
      />
    </div>
  );
}
