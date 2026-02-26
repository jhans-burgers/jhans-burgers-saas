import React, { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import {
  onSnapshot,
  query as fsQuery,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

import { getTenantById, getTenantIdForUser, tColDb, tDocDb, isSubscriptionActive } from "../services/saas";
import {
  Tenant,
  Product,
  Order,
  Driver,
  Client,
  AppConfig,
  InventoryItem,
  Supplier,
  ShoppingItem,
  DailyStats,
  GiveawayEntry,
  GiveawayWinner,
  Vale,
} from "../types";

import { AdminInterface } from "../components/AdminInterface";
import {
  NewDriverModal,
  DriverInviteModal,
  CloseCycleModal,
  SettingsModal,
  ImportModal,
  EditClientModal,
} from "../components/Modals";
import { Loader2, Lock, ShieldAlert, AlertTriangle } from "lucide-react";
import { createDriverUserAndLink } from "../services/driverAdmin";

import { authPanel, dbPanel } from "../services/firebase";

// ✅ SISTEMA DE NOTIFICAÇÃO PROFISSIONAL FLUTUANTE PARA O ADMIN
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    toast.className = `fixed top-0 left-1/2 z-[9999] px-6 py-3 rounded-full text-white font-bold text-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center text-center max-w-[90vw] transition-all duration-300 pointer-events-none ${bgClass}`;
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

export function removeUndefinedDeep(value: any): any {
  if (Array.isArray(value)) return value.map(removeUndefinedDeep);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = removeUndefinedDeep(v);
    }
    return out;
  }
  return value;
}

export default function AdminPanelPage() {
  console.log("AdminPanelPage renderizou");

  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [giveawayEntries, setGiveawayEntries] = useState<GiveawayEntry[]>([]);
  const [giveawayWinners, setGiveawayWinners] = useState<GiveawayWinner[]>([]);
  const [siteVisits, setSiteVisits] = useState<DailyStats[]>([]);

  const [modal, setModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string, title?: string } | null>(null);

  const unsubscribeDataRef = useRef<null | (() => void)>(null);
  const unsubscribeTenantRef = useRef<null | (() => void)>(null);

  const subscribeToData = (tenantId: string) => {
    const unsubscribes: (() => void)[] = [];

    const sub = (label: string, q: any, setter: any) => {
      unsubscribes.push(
        onSnapshot(
          q,
          (snap: any) => {
            setter(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
          },
          (err: any) => {
            console.error(`[subscribeToData] snapshot error (${label}):`, err);
          }
        )
      );
    };

    sub(
      "orders",
      fsQuery(tColDb(dbPanel, tenantId, "orders"), orderBy("createdAt", "desc"), limit(200)),
      setOrders
    );

    sub("products", tColDb(dbPanel, tenantId, "products"), setProducts);
    sub("drivers", tColDb(dbPanel, tenantId, "drivers"), setDrivers);
    sub("clients", tColDb(dbPanel, tenantId, "clients"), setClients);
    sub("inventory", tColDb(dbPanel, tenantId, "inventory"), setInventory);
    sub("suppliers", tColDb(dbPanel, tenantId, "suppliers"), setSuppliers);
    sub("shoppingList", tColDb(dbPanel, tenantId, "shoppingList"), setShoppingList);
    sub("vales", tColDb(dbPanel, tenantId, "vales"), setVales);
    sub("giveaway_entries", tColDb(dbPanel, tenantId, "giveaway_entries"), setGiveawayEntries);
    sub("giveaway_winners", tColDb(dbPanel, tenantId, "giveaway_winners"), setGiveawayWinners);

    return () => unsubscribes.forEach((u) => u());
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(authPanel, async (u) => {
      try {
        setLoading(true);
        setLoginError("");

        if (unsubscribeDataRef.current) {
          unsubscribeDataRef.current();
          unsubscribeDataRef.current = null;
        }

        if (!u) {
          setUser(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        const userDocRef = doc(dbPanel, "users", u.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data();

        if (!userSnap.exists() || (userData?.role !== "admin" && userData?.role !== "owner")) {
          setLoginError("ACESSO NEGADO: Motoboys não podem acessar o painel administrativo.");
          await signOut(authPanel);
          setUser(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        const tenantId = await getTenantIdForUser(u.uid, dbPanel);

        if (!tenantId) {
          setLoginError("Usuário sem loja atribuída.");
          await signOut(authPanel);
          setUser(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        const t = await getTenantById(tenantId, dbPanel);

        if (unsubscribeTenantRef.current) {
          unsubscribeTenantRef.current();
          unsubscribeTenantRef.current = null;
        }

        if (!t) {
          setLoginError("Conta não vinculada a uma loja válida.");
          await signOut(authPanel);
          setUser(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        if (!isSubscriptionActive(t)) {
          setLoginError("Assinatura inativa ou vencida. Fale com o suporte.");
          await signOut(authPanel);
          setUser(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        setTenant(t);
        setUser(u);

        unsubscribeTenantRef.current = onSnapshot(
          doc(dbPanel, "tenants", tenantId),
          (snap) => {
            if (!snap.exists()) return;
            setTenant({ id: snap.id, ...(snap.data() as any) } as any);
          },
          (err) => console.error("[tenant] snapshot error:", err)
        );

        unsubscribeDataRef.current = subscribeToData(t.id);
        setLoading(false);
      } catch (err) {
        console.error("AUTH STATE ERROR:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDataRef.current) unsubscribeDataRef.current();
      if (unsubscribeTenantRef.current) unsubscribeTenantRef.current();
    };
  }, []);

  const handleCreate = async (collectionName: string, data: any) => {
    if (!tenant) return;
    try {
      await addDoc(tColDb(dbPanel, tenant.id, collectionName), {
        ...removeUndefinedDeep(data),
        createdAt: serverTimestamp(),
      });
      if (collectionName !== "shoppingList") showToast("Registro salvo com sucesso!", "success");
    } catch (error) {
      console.error(`Error creating in ${collectionName}:`, error);
      showToast("Erro ao salvar dados no banco.", "error");
    }
  };

  const handleUpdate = async (collectionName: string, id: string, data: any) => {
    if (!tenant) return;
    try {
      await updateDoc(tDocDb(dbPanel, tenant.id, collectionName, id), removeUndefinedDeep(data));
      if (collectionName !== "shoppingList") showToast("Atualizado com sucesso!", "success");
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      showToast("Erro ao atualizar os dados.", "error");
    }
  };

  // ✅ FUNÇÃO REAL DE DELETAR (Agora com Soft Delete seguro para motoboys)
  const executeDelete = async () => {
    if (!tenant || !deleteConfirm) return;
    try {
      if (deleteConfirm.collection === "drivers") {
          // SOFT DELETE: O Motoboy é marcado como deletado e offline, mas o histórico financeiro fica intocado
          await updateDoc(tDocDb(dbPanel, tenant.id, "drivers", deleteConfirm.id), {
              isDeleted: true,
              status: 'offline',
              updatedAt: serverTimestamp()
          });
      } else {
          // Hard Delete normal para o resto
          await deleteDoc(tDocDb(dbPanel, tenant.id, deleteConfirm.collection, deleteConfirm.id));
      }

      if (deleteConfirm.collection !== "shoppingList") showToast("Registro excluído com sucesso!", "success");
      setDeleteConfirm(null);
    } catch (error) {
      console.error(`Error deleting from ${deleteConfirm.collection}:`, error);
      showToast("Erro ao excluir do banco de dados.", "error");
      setDeleteConfirm(null);
    }
  };

  const handleDeleteRequest = (collectionName: string, id: string, title?: string) => {
      if (collectionName === "shoppingList") {
          setDeleteConfirm({ collection: collectionName, id });
          setTimeout(() => executeDelete(), 10);
      } else {
          setDeleteConfirm({ collection: collectionName, id, title: title || "este registro" });
      }
  };

  const handleAddShoppingItem = (name: string) => handleCreate("shoppingList", { name, isChecked: false });
  const handleToggleShoppingItem = (id: string, currentVal: boolean) =>
    handleUpdate("shoppingList", id, { isChecked: !currentVal });

  const handleClearShoppingList = async () => {
    if (!tenant) return;
    const batch = shoppingList.map((item) => deleteDoc(tDocDb(dbPanel, tenant.id, "shoppingList", item.id)));
    await Promise.all(batch);
    showToast("Lista limpa com sucesso.", "info");
  };

  const handleUpdateConfig = async (newConfig: any) => {
    if (!tenant) return;
    const { appName, appLogoUrl, bannerUrl, theme, storePhone, location, ...restConfig } = newConfig || {};
    const mergedConfig = removeUndefinedDeep({
      ...(((tenant as any).config || {}) as any),
      ...removeUndefinedDeep(restConfig),
    });

    const loc = location && Number.isFinite(Number((location as any).lat)) && Number.isFinite(Number((location as any).lng))
      ? { lat: Number((location as any).lat), lng: Number((location as any).lng) }
      : undefined;

    const payload = removeUndefinedDeep({
      appName: appName ?? tenant.appName ?? tenant.name ?? "Painel",
      appLogoUrl: appLogoUrl ?? tenant.appLogoUrl ?? "",
      bannerUrl: bannerUrl ?? tenant.bannerUrl ?? "",
      theme: theme ?? tenant.theme ?? "",
      storePhone: storePhone ?? tenant.storePhone ?? "",
      location: loc ?? (tenant as any).location,
      config: mergedConfig,
      updatedAt: serverTimestamp(),
    });

    try {
      await updateDoc(doc(dbPanel, "tenants", tenant.id), payload);
      showToast("Configurações salvas e aplicadas!", "success");
    } catch (e) {
      console.error("ERRO AO SALVAR CONFIG:", e);
      showToast("Falha ao salvar as configurações.", "error");
    }
  };

  const handleCloseCycle = async (data: any) => {
    if (!tenant) return;
    await handleCreate("settlements", { ...data, tenantId: tenant.id });
    await handleUpdate("drivers", data.driverId, { lastSettlementAt: serverTimestamp() });
    const driverVales = vales.filter((v) => v.driverId === data.driverId && !v.settled);
    for (const v of driverVales) {
      await handleUpdate("vales", v.id, { settled: true });
    }
    setModal(null);
    setModalData(null);
    showToast("Ciclo de pagamento fechado com sucesso.", "success");
  };

  const handleImportClients = async (csvText: string) => {
    if (!tenant) return;
    const lines = (csvText || "").split("\n");
    let count = 0;
    for (const line of lines) {
      const [name, phone, address] = line.split(",");
      if (name && phone) {
        await addDoc(tColDb(dbPanel, tenant.id, "clients"), {
          name: name.trim(),
          phone: phone.trim(),
          address: address ? address.trim() : "",
          createdAt: serverTimestamp(),
        });
        count++;
      }
    }
    showToast(`${count} clientes foram importados!`, "success");
    setModal(null);
  };

  const appConfig: AppConfig = {
    appName: tenant?.appName || tenant?.name || "Painel",
    appLogoUrl: tenant?.appLogoUrl || "",
    bannerUrl: tenant?.bannerUrl || "",
    theme: tenant?.theme,
    phone: tenant?.phone,
    address: tenant?.address,
    storePhone: tenant?.storePhone,
    ...((tenant as any)?.config || {}),
    location: (tenant as any)?.location || (tenant as any)?.config?.location,
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setLoginError("Informe email e senha.");
      return;
    }

    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(authPanel, cleanEmail, password);
      
      const userDoc = await getDoc(doc(dbPanel, "users", userCred.user.uid));
      const role = userDoc.data()?.role;

      if (role !== "admin" && role !== "owner") {
        setLoginError("ACESSO NEGADO: Motoboys não podem acessar o painel administrativo.");
        await signOut(authPanel);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      setLoginError("E-mail ou senha incorretos.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (unsubscribeDataRef.current) unsubscribeDataRef.current();
    await signOut(authPanel);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <Lock size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Acesso Lojista</h1>
            <p className="text-slate-500 text-sm">Painel Administrativo</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
              <ShieldAlert className="text-red-500 shrink-0" size={20} />
              <p className="text-red-200 text-xs font-bold leading-tight">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email Administrativo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminInterface
        orders={orders}
        products={products}
        drivers={drivers}
        clients={clients}
        inventory={inventory}
        suppliers={suppliers}
        shoppingList={shoppingList}
        vales={vales}
        giveawayEntries={giveawayEntries}
        giveawayWinners={giveawayWinners}
        siteVisits={siteVisits}
        appConfig={appConfig}
        onLogout={handleLogout}
        onCreateOrder={(d: any) => {
          const orderWithCodes = {
            ...d,
            driverId: "", 
            restaurantCode: Math.floor(1000 + Math.random() * 9000).toString(),
            deliveryConfirmationCode: Math.floor(1000 + Math.random() * 9000).toString(),
          };
          handleCreate("orders", orderWithCodes);
        }}
        onUpdateOrder={(id: string, d: any) => handleUpdate("orders", id, d)}
        onDeleteOrder={(id: string) => handleDeleteRequest("orders", id, "este pedido")}
        onCreateProduct={(d: any) => handleCreate("products", d)}
        onUpdateProduct={(id: string, d: any) => handleUpdate("products", id, d)}
        onDeleteProduct={(id: string) => handleDeleteRequest("products", id, "este produto")}
        onCreateSupplier={(d: any) => handleCreate("suppliers", d)}
        onUpdateSupplier={(id: string, d: any) => handleUpdate("suppliers", id, d)}
        onDeleteSupplier={(id: string) => handleDeleteRequest("suppliers", id, "este fornecedor")}
        onCreateInventory={(d: any) => handleCreate("inventory", d)}
        onUpdateInventory={(id: string, d: any) => handleUpdate("inventory", id, d)}
        onDeleteInventory={(id: string) => handleDeleteRequest("inventory", id, "este item do estoque")}
        onAddShoppingItem={handleAddShoppingItem}
        onToggleShoppingItem={handleToggleShoppingItem}
        onDeleteShoppingItem={(id: string) => handleDeleteRequest("shoppingList", id)}
        onClearShoppingList={handleClearShoppingList}
        onDeleteDriver={(id: string) => handleDeleteRequest("drivers", id, "este motoboy")}
        onUpdateDriver={(id: string, d: any) => handleUpdate("drivers", id, d)}
        onCloseCycle={(driverId: string, data: any) => {
          setModalData(data);
          setModal("close_cycle");
        }}
        onRegisterWinner={(d: any) => handleCreate("giveaway_winners", d)}
        onDeleteGiveawayEntry={(id: string) => handleDeleteRequest("giveaway_entries", id, "este participante")}
        setModal={setModal}
        setModalData={setModalData}
        setClientToEdit={setClientToEdit}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">Excluir Registro?</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Você tem certeza que deseja excluir permanentemente <span className="text-white font-bold">{deleteConfirm.title}</span>?
                        {deleteConfirm.collection === 'drivers' ? " (O histórico financeiro dele será preservado)" : " Esta ação não poderá ser desfeita."}
                    </p>
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeDelete}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20"
                        >
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {modal === "driver_invite" && tenant && (
        <DriverInviteModal
          tenantId={tenant.id}
          tenantSlug={(tenant as any).slug || (tenant as any).publicSlug || tenant.id}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "settings" && (
        <SettingsModal config={appConfig} products={products} onClose={() => setModal(null)} onSave={handleUpdateConfig} />
      )}

      {modal === "driver" && (
        <NewDriverModal
          initialData={modalData}
          onClose={() => {
            setModal(null);
            setModalData(null);
          }}
          onSave={async (data: any) => {
            if (!tenant) return;
            try {
              if (modalData?.id) {
                await handleUpdate("drivers", modalData.id, data);
                setModal(null);
                setModalData(null);
                return;
              }
              const name = String(data?.name || "").trim();
              const driverEmail = String(data?.email || "").trim().toLowerCase();
              const driverPassword = String(data?.password || "");
              if (!name || !driverEmail || !driverPassword) {
                showToast("Informe Nome, E-mail e Senha.", "error");
                return;
              }
              const res = await createDriverUserAndLink({
                tenantId: tenant.id,
                name,
                email: driverEmail,
                password: driverPassword,
              });
              showToast(`Motoboy criado com sucesso!`, "success");
              setModal(null);
              setModalData(null);
            } catch (err: any) {
              console.error("❌ ERRO AO SALVAR MOTOboy:", err);
              showToast("Erro ao cadastrar motoboy. Verifique os dados.", "error");
            }
          }}
        />
      )}

      {modal === "close_cycle" && modalData && (
        <CloseCycleModal
          data={modalData}
          onClose={() => {
            setModal(null);
            setModalData(null);
          }}
          onConfirm={handleCloseCycle}
        />
      )}

      {modal === "import" && <ImportModal onClose={() => setModal(null)} onImportCSV={handleImportClients} />}

      {modal === "client" && clientToEdit && (
        <EditClientModal
          client={clientToEdit}
          onClose={() => {
            setModal(null);
            setClientToEdit(null);
          }}
          onSave={(data: any) => {
            handleUpdate("clients", clientToEdit.id, data);
            setModal(null);
            setClientToEdit(null);
          }}
        />
      )}
    </>
  );
}