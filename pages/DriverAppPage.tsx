import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { authDriver, dbDriver } from "../services/firebase";
import { getTenantIdForUser, tColDb, tDocDb } from "../services/saas";
import { Driver, Order, DriverOffer } from "../types";
import { onSnapshot, query, where, orderBy, updateDoc } from "firebase/firestore";
import DriverInterface from "../components/DriverInterface";
import { acceptDriverOffer } from "../services/dispatch";
import { disableDriverPush, enableDriverPush, hydrateDriverPush, PushSetupResult } from "../services/messaging";

// ✅ SISTEMA DE NOTIFICAÇÃO PROFISSIONAL FLUTUANTE
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-0 left-1/2 z-[9999] px-6 py-3 rounded-full text-white font-bold text-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center text-center max-w-[90vw] transition-all duration-300 pointer-events-none ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`;
    toast.style.transform = 'translate(-50%, -100%)';
    toast.style.opacity = '0';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translate(-50%, 20px)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translate(-50%, -100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

export default function DriverAppPage() {
  const [user, setUser] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tenantId, setTenantId] = useState<string>(() => localStorage.getItem("driverTenantId") || "");

  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [push, setPush] = useState<PushSetupResult>({
    supported: true,
    permission: (typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(authDriver, (u) => {
      setUser(u);
      const tid = localStorage.getItem("driverTenantId") || "";
      setTenantId(tid);
      setDriver(null);
      setOrders([]);
      setUnassignedOrders([]);
      setOffers([]);
      setErr("");
      setLoading(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const tid = await getTenantIdForUser(user.uid, dbDriver);
        if (!alive) return;
        if (tid) {
          setTenantId(tid);
          localStorage.setItem("driverTenantId", tid);
        }
      } catch (e) {
        console.warn("[DriverApp] erro sincronizar tenantId:", e);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !tenantId) return;
    let alive = true;
    (async () => {
      try {
        const res = await hydrateDriverPush({ tenantId, driverId: user.uid });
        if (!alive) return;
        setPush(res);
      } catch (e: any) {
        console.warn("[DriverApp] hydrate push failed", e);
      }
    })();
    return () => { alive = false; };
  }, [user, tenantId]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid) {
      setErr("Motoboy não vinculado a uma loja.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const driverRef = tDocDb(dbDriver, tid, "drivers", user.uid);
    const unsubDriver = onSnapshot(driverRef as any, (snap) => {
      if (!snap.exists()) {
        setErr("Motorista não encontrado.");
        setDriver(null);
        setLoading(false);
        return;
      }
      setDriver({ id: snap.id, ...(snap.data() as any) } as Driver);
      setLoading(false);
    });

    const oq = query(tColDb(dbDriver, tid, "orders"), where("driverId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(oq as any, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[];
      setOrders(list);
    });

    const oqUnassigned = query(tColDb(dbDriver, tid, "orders"), where("status", "in", ["pending", "preparing", "ready"]));
    const unsubUnassigned = onSnapshot(oqUnassigned as any, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((o: any) => {
            const hasNoDriver = !o.driverId || o.driverId.trim() === "";
            const isReadyOrRequested = o.status === 'ready' || o.driverRequested === true;
            return hasNoDriver && isReadyOrRequested;
        }) 
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) as Order[];
      setUnassignedOrders(list);
    }, (error) => {
      console.error("Erro na leitura da Fila Livre:", error);
    });

    const oqOffers = query(tColDb(dbDriver, tid, "driverOffers"), where("driverId", "==", user.uid), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsubOffers = onSnapshot(oqOffers as any, (snapshot) => {
      const now = Date.now();
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((o: any) => {
          const exp = o.expiresAt?.toMillis?.() ?? (o.expiresAt?.seconds ? o.expiresAt.seconds * 1000 : null);
          return !exp || exp > now;
        }) as DriverOffer[];
      setOffers(list);
    });

    return () => { unsubDriver(); unsubOrders(); unsubUnassigned(); unsubOffers(); };
  }, [user, tenantId]);


  // ✅ CORREÇÃO AQUI: Em vez de redirecionar para a URL de instalação, apenas desloga e deixa o React voltar para o Login form
  const onLogout = async () => {
    try {
      const tid = tenantId || localStorage.getItem("driverTenantId") || "";
      if (user?.uid && tid) await disableDriverPush({ tenantId: tid, driverId: user.uid });
    } catch (e) { console.warn("Erro disable push:", e); }
    
    await signOut(authDriver);
    setEmail("");     // Limpa o email
    setPassword("");  // Limpa a senha
  };

  const onToggleStatus = async () => {
    if (!driver || !user) return;
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid) return;
    const goingOnline = driver.status === "offline";

    if (goingOnline) {
      const res = await enableDriverPush({ tenantId: tid, driverId: driver.id });
      setPush(res);
      if (!res.supported || res.permission !== "granted" || !res.token) {
        showToast(res.error || "Ative as notificações para ficar ONLINE.", "error");
        return;
      }
    }

    await updateDoc(tDocDb(dbDriver, tid, "drivers", user.uid) as any, {
      status: goingOnline ? "available" : "offline",
      updatedAt: new Date(),
    });
  };

  const onAcceptOrder = async (orderId: string) => {
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid || !user) return;
    
    await updateDoc(tDocDb(dbDriver, tid, "orders", orderId) as any, {
      status: "accepted", 
      driverId: user.uid,
      assignedAt: new Date(),
      updatedAt: new Date(),
    });
    await updateDoc(tDocDb(dbDriver, tid, "drivers", user.uid) as any, {
      status: "busy",
      updatedAt: new Date(),
    });
  };

  const onAcceptOffer = async (orderId: string) => {
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid || !user) return;
    try {
      await acceptDriverOffer({ tenantId: tid, orderId });
      await updateDoc(tDocDb(dbDriver, tid, "orders", orderId) as any, {
        status: "accepted", 
        updatedAt: new Date(),
      });
      await updateDoc(tDocDb(dbDriver, tid, "drivers", user.uid) as any, { status: "busy", updatedAt: new Date() });
    } catch (e: any) {
      showToast(e?.message || "Não foi possível pegar a corrida.", "error");
    }
  };

  const onPickupOrder = async (orderId: string, inputCode: string, correctCode: string) => {
    const typed = String(inputCode || "").trim();
    const correct = String(correctCode || "").trim();

    if (!correct) {
      showToast("Erro: Este pedido não gerou código de loja.", "error");
      return;
    }
    if (typed !== correct) {
      showToast("⚠️ CÓDIGO INCORRETO! Peça o código correto ao atendente.", "error");
      return;
    }

    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid) return;

    await updateDoc(tDocDb(dbDriver, tid, "orders", orderId) as any, {
      status: "delivering",
      pickedUpAt: new Date(),
      updatedAt: new Date(),
    });
    showToast("✅ Retirada confirmada!", "success");
  };

  const onCompleteOrder = async (oid: string, inputCode: string, correctCode: string) => {
    const typed = String(inputCode || "").trim();
    const correct = String(correctCode || "").trim();

    if (!correct) {
      showToast("Erro: Código do cliente não encontrado.", "error");
      return;
    }
    if (typed !== correct) {
      showToast("⚠️ CÓDIGO INCORRETO! Peça a senha de 4 dígitos ao cliente.", "error");
      return;
    }

    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid || !user) return;

    try {
      const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
      successAudio.play().catch(e => console.log('Erro de áudio:', e));

      await updateDoc(tDocDb(dbDriver, tid, "orders", oid) as any, {
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      await updateDoc(tDocDb(dbDriver, tid, "drivers", user.uid) as any, {
        status: "available",
        updatedAt: new Date(),
      });
      
      showToast("🎉 Sucesso! Pedido entregue.", "success");
    } catch (e) {
      console.error("Erro ao finalizar:", e);
      showToast("Erro ao salvar no banco de dados.", "error");
    }
  };

  const onUpdateOrder = async (id: string, data: any) => {
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid) return;
    await updateDoc(tDocDb(dbDriver, tid, "orders", id) as any, { ...data, updatedAt: new Date() });
  };

  const onUpdateDriver = async (id: string, data: any) => {
    const tid = tenantId || localStorage.getItem("driverTenantId") || "";
    if (!tid) return;
    await updateDoc(tDocDb(dbDriver, tid, "drivers", id) as any, { ...data, updatedAt: new Date() });
  };

  // ✅ TELA DE LOGIN DO MOTOBOY (Fica visível quando desloga)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4" style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(16, 185, 129, 0.1), transparent), radial-gradient(ellipse at bottom, rgba(0, 0, 0, 1), transparent)" }}>
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-widest">App Motoboy</h1>
            <p className="text-slate-400 text-sm mt-1">Faça login para iniciar as entregas</p>
          </div>
          <div className="space-y-4">
            <input 
              className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide placeholder:text-slate-600" 
              placeholder="E-mail" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide placeholder:text-slate-600" 
              placeholder="Senha" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            {loginError ? <div className="text-red-400 text-xs font-bold text-center bg-red-900/20 py-2 rounded-lg border border-red-500/30 uppercase tracking-widest">{loginError}</div> : null}
          </div>
          <button 
            className="w-full px-4 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white uppercase tracking-widest active:scale-95 transition-all shadow-[0_10px_40px_rgba(16,185,129,0.3)] mt-2" 
            disabled={loginBusy} 
            onClick={async () => {
              setLoginError(""); setLoginBusy(true);
              try { await signInWithEmailAndPassword(authDriver, email.trim().toLowerCase(), password); } 
              catch (e: any) { setLoginError("Email ou senha incorretos."); } 
              finally { setLoginBusy(false); }
            }}
          >
            {loginBusy ? "Acessando..." : "Entrar na Conta"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-emerald-500 flex items-center justify-center font-bold uppercase tracking-widest">Carregando seus dados...</div>;

  if (err || !driver) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-4 text-center">
          <div className="text-2xl font-black text-red-500 uppercase tracking-widest">Acesso Negado</div>
          <div className="text-slate-400 text-sm leading-relaxed">{err || "Cadastro não encontrado no sistema."}</div>
          <button className="px-6 py-4 mt-4 rounded-xl bg-white/5 hover:bg-white/10 w-full font-bold uppercase tracking-widest transition-colors" onClick={onLogout}>Sair e Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <DriverInterface
      driver={driver}
      orders={orders}
      unassignedOrders={unassignedOrders}
      offers={offers}
      onToggleStatus={onToggleStatus}
      onAcceptOrder={onAcceptOrder}
      onAcceptOffer={onAcceptOffer}
      onPickupOrder={onPickupOrder}
      onCompleteOrder={onCompleteOrder}
      onUpdateOrder={onUpdateOrder}
      onDeleteOrder={async () => showToast("Ação não permitida.", "error")}
      onLogout={onLogout}
      onUpdateDriver={onUpdateDriver}
      vales={[]}
    />
  );
}