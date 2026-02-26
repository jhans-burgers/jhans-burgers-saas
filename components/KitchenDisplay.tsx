import React, { useEffect, useState, useRef, useMemo } from "react";
import { Order, Product, Driver, AppConfig } from "../types";
import {
  formatTime,
  toSentenceCase,
  getOrderReceivedText,
  copyToClipboard,
  formatOrderId,
  isToday,
  getPixCodeOnly,
} from "../utils";
import {
  Clock,
  CheckCircle2,
  Flame,
  ChefHat,
  History,
  Bike,
  X,
  PackageCheck,
  Edit,
  Trash2,
  MessageSquare,
  Printer,
  QrCode,
  Hash,
  Store,
  User
} from "lucide-react";
import { ConfirmCloseOrderModal, ReceiptModal, GenericConfirmModal } from "./Modals";
import { Footer } from "./Shared";
import { serverTimestamp } from "firebase/firestore";

interface KDSProps {
  orders: Order[];
  products?: Product[];
  drivers?: Driver[];
  onUpdateStatus: (id: string, status: any) => void;
  onAssignOrder?: (oid: string, did: string) => void;
  onDeleteOrder?: (id: string) => void;
  onBack?: () => void;
  appConfig: AppConfig;
  onEditOrder?: (order: Order) => void;
  disableSound?: boolean;
}

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const INTERNAL_TEST_ID = "w8wSUDWOkyWnrL1UxfXC";

export function KitchenDisplay({
  orders,
  products = [],
  drivers = [],
  onUpdateStatus,
  onAssignOrder,
  onDeleteOrder,
  appConfig,
  onEditOrder,
  disableSound = false,
}: KDSProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orderToClose, setOrderToClose] = useState<Order | null>(null);
  
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  const [showReadySidebar, setShowReadySidebar] = useState(false);

  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const [copiedPixCodes, setCopiedPixCodes] = useState<Set<string>>(new Set());

  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"production" | "ready">("production");

  const prevPendingCountRef = useRef(
    orders.filter((o) => o.status === "pending" && !o.id.includes(INTERNAL_TEST_ID)).length
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const effectiveAppName = appConfig?.appName && appConfig.appName !== "undefined" ? appConfig.appName : "Jhans Burgers";

  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.id.includes(INTERNAL_TEST_ID)) return false;
      if (o.status === "pending" || o.status === "preparing") return true;
      if ((o.status === "assigned" || o.status === "accepted") && !o.readyAt) return true; 
      return false;
    }).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [orders]);

  const finishedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.id.includes(INTERNAL_TEST_ID)) return false;
      if (o.status === "ready" || o.status === "delivering" || (o.status === "completed" && isToday(o.createdAt))) return true;
      if ((o.status === "assigned" || o.status === "accepted") && !!o.readyAt) return true;
      return false;
    }).sort((a, b) => {
      if (a.status === "ready" && b.status !== "ready") return -1;
      if (a.status !== "ready" && b.status === "ready") return 1;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
  }, [orders]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === "pending" && !o.id.includes(INTERNAL_TEST_ID)).length;
    if (!disableSound && pendingCount > prevPendingCountRef.current) {
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch((error) => console.log("Áudio bloqueado:", error));
      }
    }
    prevPendingCountRef.current = pendingCount;
  }, [orders, disableSound]);

  const getElapsedTime = (timestamp: any) => {
    if (!timestamp) return "00:00";
    const start = new Date(timestamp.seconds * 1000).getTime();
    const now = currentTime.getTime();
    const diff = Math.floor((now - start) / 1000);
    const mm = Math.floor(diff / 60).toString().padStart(2, "0");
    const ss = (diff % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const getPreparationTime = (start: any, end: any) => {
    if (!start) return "-";
    const s = new Date(start.seconds * 1000).getTime();
    const e = end ? new Date(end.seconds * 1000).getTime() : new Date().getTime();
    const diff = Math.floor((e - s) / 1000 / 60);
    return `${diff} min`;
  };

  const getCardColor = (status: string, elapsedSec: number) => {
    if (elapsedSec > 1800) return "bg-red-900/20 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]";
    if (status === "preparing" || status === "accepted" || status === "assigned") return "bg-orange-900/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
    return "bg-slate-900/50 border-amber-500/50";
  };

  const findProductDescription = (line: string) => {
    if (!line) return "";
    const cleanName = line.replace(/^\d+[xX\s]+/, "").trim();
    const product = products.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());
    return product?.description || "";
  };

  const handleCopyStatus = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); e.preventDefault();
    copyToClipboard(getOrderReceivedText(order, effectiveAppName, appConfig.estimatedTime));
    setCopiedMessages((prev) => new Set(prev).add(order.id));
  };

  const handleCopyPixCode = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); e.preventDefault();
    if (!appConfig.pixKey) return;
    copyToClipboard(getPixCodeOnly(appConfig.pixKey, appConfig.pixName || "", appConfig.pixCity || "", order.value, order.id));
    setCopiedPixCodes((prev) => new Set(prev).add(order.id));
    setTimeout(() => setCopiedPixCodes((prev) => { const next = new Set(prev); next.delete(order.id); return next; }), 2000);
  };

  const toggleReadySidebar = () => setShowReadySidebar((s) => !s);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 text-white overflow-hidden">
      <div className="flex md:hidden bg-slate-900 border-b border-slate-800 shrink-0">
        <button onClick={() => setActiveTab("production")} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === "production" ? "border-orange-500 text-orange-500" : "border-transparent text-slate-500"}`}>
          Produção ({activeOrders.length})
        </button>
        <button onClick={() => setActiveTab("ready")} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === "ready" ? "border-emerald-500 text-emerald-500" : "border-transparent text-slate-500"}`}>
          Prontos ({finishedOrders.length})
        </button>
      </div>

      <div className={`flex-1 flex-col border-r border-slate-800 relative min-h-0 ${activeTab === "production" ? "flex" : "hidden md:flex"}`}>
        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Flame className="text-orange-500" size={24} /> <span className="hidden md:inline">Fila de Produção</span>
            </h2>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-700">{activeOrders.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono font-bold text-sm md:text-xl text-slate-400 bg-slate-900 px-3 py-1 md:px-4 md:py-2 rounded-lg border border-slate-800 shadow-inner">{currentTime.toLocaleTimeString()}</div>
            <button onClick={toggleReadySidebar} className={`hidden md:flex items-center justify-center p-2 rounded-lg border transition-all relative ${showReadySidebar ? "bg-slate-800 text-emerald-500 border-emerald-500/50" : "bg-slate-900 text-slate-500 border-slate-800 hover:text-white"}`} title="Ver Pedidos Prontos">
              <PackageCheck size={20} />
              {!showReadySidebar && finishedOrders.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border border-slate-900" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-950/50 pb-32 md:pb-20">
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 animate-in fade-in zoom-in opacity-50">
              <ChefHat size={80} className="mb-4 text-slate-700" />
              <p className="text-2xl font-bold">Cozinha Livre</p>
              <p className="text-sm">Aguardando novos pedidos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
              {activeOrders.map((order) => {
                const elapsedSec = (currentTime.getTime() - (order.createdAt?.seconds || 0) * 1000) / 1000;
                const cardColor = getCardColor(order.status, elapsedSec);
                const hasCopied = copiedMessages.has(order.id);
                const hasCopiedPix = copiedPixCodes.has(order.id);
                const isPix = order.paymentMethod?.toLowerCase().includes("pix");
                
                const assignedDriver = drivers.find(d => d.id === order.driverId);

                return (
                  <div key={order.id} className={`flex flex-col w-full rounded-2xl border-l-[6px] shadow-2xl transition-all ${cardColor} h-auto relative group overflow-hidden`}>
                    <div className="p-3 md:p-4 border-b border-white/5 bg-black/20 flex justify-between items-start relative">
                      <div className="flex flex-col overflow-hidden mr-2">
                        <span className="font-black text-lg md:text-xl text-white truncate w-full tracking-tight">{order.customer}</span>
                        <span className="text-xs font-mono text-white/50">{formatOrderId(order.id)}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-2">
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOrderToPrint(order); }} className="p-1.5 hover:bg-slate-700 text-slate-500 hover:text-blue-400 rounded-lg transition-colors bg-slate-900/50 cursor-pointer"><Printer size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditOrder?.(order); }} className="p-1.5 hover:bg-slate-700 text-slate-500 hover:text-white rounded-lg transition-colors bg-slate-900/50 cursor-pointer"><Edit size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOrderToDelete(order); }} className="p-1.5 bg-slate-900/80 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30 shadow-sm cursor-pointer"><Trash2 size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOrderToClose(order); }} className="p-1.5 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors bg-slate-900/50 cursor-pointer"><X size={14} /></button>
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded text-amber-400 font-mono font-bold text-sm md:text-lg shadow-inner">{getElapsedTime(order.createdAt)}</div>
                      </div>
                    </div>

                    <div className="p-3 md:p-4 flex-1 space-y-3 relative">
                      {order.items.split("\n").filter((l) => l.trim()).map((line, i) => {
                          if (line.includes("---")) return <hr key={i} className="border-white/10 my-2" />;
                          const isObs = line.toLowerCase().startsWith("obs:");
                          const description = !isObs ? findProductDescription(line) : "";
                          return (
                            <div key={i} className="flex flex-col">
                              <p className={`font-bold leading-snug ${isObs ? "text-yellow-300 text-sm bg-yellow-900/20 p-2 rounded border border-yellow-500/20" : "text-white text-base md:text-lg"}`}>{toSentenceCase(line)}</p>
                              {description && <p className="text-xs text-white/40 leading-tight mt-0.5 pl-2 border-l-2 border-white/10">{toSentenceCase(description)}</p>}
                            </div>
                          );
                        })}
                        
                        {/* ✅ EXIBIÇÃO DOS CÓDIGOS DE SEGURANÇA NA COZINHA */}
                        {(order.restaurantCode || order.deliveryConfirmationCode) && (
                          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
                              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-2 text-center flex flex-col justify-center">
                                  <span className="text-[9px] text-amber-500 font-bold uppercase mb-0.5 flex justify-center items-center gap-1"><Store size={10}/> Cód. Loja</span>
                                  <span className="text-base font-black text-amber-400 tracking-widest">{order.restaurantCode || "---"}</span>
                              </div>
                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-center flex flex-col justify-center">
                                  <span className="text-[9px] text-blue-500 font-bold uppercase mb-0.5 flex justify-center items-center gap-1"><User size={10}/> Cód. Cliente</span>
                                  <span className="text-base font-black text-blue-400 tracking-widest">{order.deliveryConfirmationCode || "---"}</span>
                              </div>
                          </div>
                        )}
                    </div>

                    <div className="p-3 mt-auto border-t border-white/5 bg-black/20 grid grid-cols-1 gap-2 relative">
                      
                      {assignedDriver && (
                         <div className="bg-blue-900/30 border border-blue-500/50 p-2 rounded-xl flex items-center justify-center gap-2 mb-1 animate-pulse text-blue-400 font-bold text-xs uppercase tracking-widest">
                             <Bike size={14} /> {assignedDriver.name} ACEITOU!
                         </div>
                      )}

                      {order.status === "pending" && (
                          <button
                            onClick={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              const updateData: any = { status: "preparing", preparingAt: serverTimestamp() };
                              if (!order.restaurantCode) updateData.restaurantCode = Math.floor(1000 + Math.random() * 9000).toString();
                              if (!order.deliveryConfirmationCode) updateData.deliveryConfirmationCode = Math.floor(1000 + Math.random() * 9000).toString();
                              onUpdateStatus(order.id, updateData);
                            }}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-black uppercase text-[10px] md:text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer h-12"
                          >
                            <Flame size={18} /> Iniciar Preparo
                          </button>
                      )}

                      {(order.status === "preparing" || order.status === "assigned" || order.status === "accepted") && (
                        <div className="grid grid-cols-2 gap-2">
                            {!order.driverId ? (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const updateData: any = { driverRequested: true };
                                        if (!order.restaurantCode) updateData.restaurantCode = Math.floor(1000 + Math.random() * 9000).toString();
                                        if (!order.deliveryConfirmationCode) updateData.deliveryConfirmationCode = Math.floor(1000 + Math.random() * 9000).toString();
                                        onUpdateStatus(order.id, updateData);
                                    }}
                                    disabled={!!(order as any).driverRequested}
                                    className={`w-full py-3 rounded-xl font-black uppercase text-[10px] md:text-[11px] shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer h-12 ${
                                        (order as any).driverRequested ? "bg-slate-800 text-slate-500" : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
                                    }`}
                                >
                                    <Bike size={16} /> {(order as any).driverRequested ? "Chamado" : "Chamar Motoboy"}
                                </button>
                            ) : (
                                <div className="w-full bg-slate-900 border border-slate-700 py-3 rounded-xl font-bold text-slate-500 uppercase text-[10px] flex items-center justify-center gap-1 h-12">
                                    <CheckCircle2 size={14}/> Motoboy OK
                                </div>
                            )}

                            <button
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    const updateData: any = { readyAt: serverTimestamp() };
                                    if (order.status === "preparing") updateData.status = "ready";
                                    if (!order.restaurantCode) updateData.restaurantCode = Math.floor(1000 + Math.random() * 9000).toString();
                                    if (!order.deliveryConfirmationCode) updateData.deliveryConfirmationCode = Math.floor(1000 + Math.random() * 9000).toString();
                                    onUpdateStatus(order.id, updateData);
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-[10px] md:text-[11px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer h-12"
                            >
                                <CheckCircle2 size={16} /> Pedido Pronto
                            </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={(e) => handleCopyStatus(e, order)} className={`flex-1 h-10 rounded-lg font-bold text-[10px] md:text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer overflow-hidden ${hasCopied ? "bg-slate-800/50 text-slate-500" : "bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900/60"}`}>
                          <div className="flex items-center justify-center gap-2 w-full">
                            {hasCopied ? <CheckCircle2 size={14} className="shrink-0" /> : <MessageSquare size={14} className="shrink-0" />}
                            <span className="truncate whitespace-nowrap">{hasCopied ? "Copiado!" : isPix ? "1. Msg Resumo" : "Copiar Msg"}</span>
                          </div>
                        </button>
                        {isPix && (
                          <button onClick={(e) => handleCopyPixCode(e, order)} className={`w-1/3 h-10 rounded-lg font-bold text-[10px] md:text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${hasCopiedPix ? "bg-slate-800/50 text-slate-500" : "bg-purple-900/40 text-purple-400 border border-purple-500/50 hover:bg-purple-900/60"}`}>
                            {hasCopiedPix ? <CheckCircle2 size={14} /> : <QrCode size={14} />} {!hasCopiedPix && <span className="hidden sm:inline">Pix</span>}
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="hidden md:block bg-slate-950 p-2"><Footer /></div>
      </div>

      <div className={`w-full md:w-[380px] bg-slate-900 border-l border-slate-800 flex-col shadow-2xl z-20 min-h-0 transition-all duration-300 ${activeTab === "ready" ? "flex" : "hidden"} ${showReadySidebar ? "md:flex" : "md:hidden"}`}>
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900 shadow-sm shrink-0 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><PackageCheck className="text-emerald-500" /> Pedidos na Saída</h3>
            <p className="text-xs text-slate-500 mt-1">Aguardando retirada</p>
          </div>
          <button onClick={toggleReadySidebar} className="hidden md:block text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-32 md:pb-4">
          {finishedOrders.length === 0 && (
            <div className="text-center py-10 text-slate-600">
              <History size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pedido na saída.</p>
            </div>
          )}

          {finishedOrders.map((order) => {
            const isReady = order.status === "ready";
            const assignedDriver = drivers.find(d => d.id === order.driverId);

            return (
              <div key={order.id} className={`rounded-xl border p-3 transition-all relative hover:border-slate-600 ${isReady ? "bg-emerald-900/10 border-emerald-500/50" : "bg-slate-950 border-slate-800 opacity-70"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isReady ? "bg-emerald-500 text-white" : order.status === "assigned" ? "bg-blue-500 text-white" : order.status === "accepted" ? "bg-amber-500 text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                      {isReady ? "AGUARDANDO" : order.status === "assigned" ? "MOTOBOY ACEITOU" : order.status === "accepted" ? "MOTOBOY NO BALCÃO" : order.status === "delivering" ? "EM ROTA" : "ENTREGUE"}
                    </span>
                    <h4 className="font-bold text-white text-base mt-1 line-clamp-1">{order.customer}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-500 block">{formatOrderId(order.id)}</span>
                    <span className="text-xs font-bold text-slate-400 block mt-1">{formatTime(order.createdAt)}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 line-clamp-1 mb-3">{order.items.replace(/\n/g, ", ")}</div>

                {/* ✅ CÓDIGOS DUPLOS NA SAÍDA */}
                {(order.restaurantCode || order.deliveryConfirmationCode) && order.status !== "completed" && (
                    <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-2 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-amber-500 font-bold uppercase mb-0.5 flex justify-center items-center gap-1"><Store size={10}/> Cód. Loja</span>
                            <span className="text-sm font-black text-amber-400 tracking-widest">{order.restaurantCode || "---"}</span>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-blue-500 font-bold uppercase mb-0.5 flex justify-center items-center gap-1"><User size={10}/> Cód. Cliente</span>
                            <span className="text-sm font-black text-blue-400 tracking-widest">{order.deliveryConfirmationCode || "---"}</span>
                        </div>
                    </div>
                )}

                {isReady && onAssignOrder && (
                  <div className="relative mt-2 animate-in fade-in">
                    <Bike size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                    <select className="w-full bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-100 text-xs font-bold py-2.5 pl-9 pr-2 rounded-lg outline-none appearance-none cursor-pointer transition-colors" defaultValue="" onChange={(e) => { if (e.target.value) onAssignOrder(order.id, e.target.value); }}>
                      <option value="" disabled>Chamar Motoboy Específico...</option>
                      {drivers.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{d.name} {d.status === "available" ? "✅" : "⏳"}</option>))}
                    </select>
                  </div>
                )}

                {!isReady && assignedDriver && (
                    <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-2 bg-emerald-900/20 p-2 rounded-lg border border-emerald-900/30 uppercase">
                        <Bike size={12} /> {assignedDriver.name}
                    </div>
                )}

                {!isReady && (
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 border-t border-slate-800 pt-2">
                    <Clock size={10} /> Tempo Total: {getPreparationTime(order.createdAt, order.completedAt || order.assignedAt)}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-2 border-t border-slate-800/50 pt-2">
                  <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOrderToPrint(order); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-500 transition-colors cursor-pointer" title="Imprimir"><Printer size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditOrder?.(order); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-amber-500 transition-colors cursor-pointer" title="Editar"><Edit size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOrderToDelete(order); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-red-500 transition-colors cursor-pointer" title="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="md:hidden bg-slate-900 p-2"><Footer /></div>
      </div>

      <ConfirmCloseOrderModal
        isOpen={!!orderToClose}
        order={orderToClose}
        onClose={() => setOrderToClose(null)}
        onConfirm={async () => {
          if (!orderToClose) return;
          await Promise.resolve(onUpdateStatus(orderToClose.id, { status: "completed", completedAt: serverTimestamp() }));
          setOrderToClose(null);
        }}
      />
      
      <GenericConfirmModal 
        isOpen={!!orderToDelete}
        title="Excluir Pedido?"
        message="Tem certeza que deseja apagar este pedido permanentemente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        type="danger"
        onClose={() => setOrderToDelete(null)}
        onConfirm={() => {
            if (orderToDelete && onDeleteOrder) {
                onDeleteOrder(orderToDelete.id);
            }
            setOrderToDelete(null);
        }}
      />

      {orderToPrint && <ReceiptModal order={orderToPrint} onClose={() => setOrderToPrint(null)} appConfig={appConfig} />}
    </div>
  );
}