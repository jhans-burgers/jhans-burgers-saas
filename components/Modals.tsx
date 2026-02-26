import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ExternalLink,Maximize2, Trophy, Shuffle, Search, Users, Edit, Trash2, Check, MessageCircle, Instagram, AlertTriangle, Copy, Printer, AlertCircle, Info, Flame, Bike, Save, Settings, Lock, Store, Clock, MapPin, CreditCard, Smartphone, Image as ImageIcon, Plus, Truck, CalendarClock, Sliders, UploadCloud, RefreshCw, Signal, QrCode, CheckCircle2, DollarSign, Timer, Ban, PlusCircle, Camera, FileText, ChevronRight, Download, History, PackageCheck, Ticket, DownloadCloud, Gift, Mail, Calendar, HelpCircle, FileSpreadsheet, User, Phone, Megaphone, Monitor, Banknote, Navigation, FlaskConical, ShoppingCart, Square, CheckSquare, Wand2, Send, Wallet, Star, Utensils, ChevronDown, Percent, Box, ChevronUp, Type, FileImage, ShieldCheck, Hash } from 'lucide-react';
import { normalizePhone, formatDate, formatCurrency, generateReceiptText, printOrderTicket, getProductionMessage, getDispatchMessage, formatPhoneNumberDisplay, compressImage, COUNTRY_CODES, toSentenceCase, formatOrderId, formatTime, copyToClipboard } from '../utils';
import { AppConfig, Product, Order, InventoryItem, GiveawayEntry, Driver, Client, DeliveryZone, GiveawayFieldConfig, ShoppingItem, Supplier } from '../types';
import { PixIcon } from './Shared';
import LocationPicker from './LocationPicker';
import { setDriverJoinCode } from '../services/driverInvite';

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

export function AdminLoginModal({ onClose, onLogin }: any) {
    const [pass, setPass] = useState('');
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onLogin(pass, remember)) {
            onClose();
        } else {
            setError(true);
            setPass('');
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <Lock size={32} className="text-slate-400"/>
                    </div>
                    <h3 className="text-xl font-bold text-white">Área Restrita</h3>
                    <p className="text-slate-500 text-sm">Digite a senha de gerente</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input 
                            type="password" 
                            autoFocus
                            className={`w-full bg-slate-950 border rounded-xl py-3 px-4 text-center text-white text-lg tracking-widest outline-none focus:border-amber-500 transition-colors ${error ? 'border-red-500' : 'border-slate-800'}`}
                            placeholder="••••"
                            value={pass}
                            onChange={e => { setPass(e.target.value); setError(false); }}
                        />
                        {error && <p className="text-red-500 text-xs text-center font-bold animate-pulse mt-2">Senha incorreta</p>}
                    </div>

                    <label className="flex items-center justify-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${remember ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-950 border-slate-700 text-transparent'}`}>
                            <Check size={14} strokeWidth={4} />
                        </div>
                        <input type="checkbox" className="hidden" checked={remember} onChange={e => setRemember(e.target.checked)}/>
                        <span className="text-sm text-slate-400 group-hover:text-white transition-colors select-none">Manter conectado neste dispositivo</span>
                    </label>
                    
                    <button type="submit" className="w-full bg-slate-800 hover:bg-white hover:text-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">
                        Acessar Painel
                    </button>
                </form>
            </div>
        </div>
    );
}

export function GenericAlertModal({ isOpen, title, message, type = 'info', onClose }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl relative text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'error' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'}`}>
                    {type === 'error' ? <AlertTriangle size={32}/> : <Info size={32}/>}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm mb-6">{message}</p>
                <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors">OK</button>
            </div>
        </div>
    );
}

export function GenericConfirmModal({ isOpen, title, message, onConfirm, onClose, confirmText = 'Confirmar', type = 'info' }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl relative text-center">
                 <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                 <p className="text-slate-400 text-sm mb-6">{message}</p>
                 <div className="flex gap-3">
                     <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                     <button onClick={onConfirm} className={`flex-1 font-bold py-3 rounded-xl transition-colors text-white ${type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{confirmText}</button>
                 </div>
            </div>
        </div>
    );
}

export function GiveawayManagerModal({ entries, onClose, appConfig, onUpdateEntry, onDeleteEntry }: any) {
    const [winner, setWinner] = useState<any>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [search, setSearch] = useState('');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    
    const fields = appConfig.giveawaySettings?.fields || [];
    const instagramField = fields.find((f:any) => f.id === 'instagram');

    const getFieldValue = (entry: any, fieldId: string) => {
        return entry.dynamicData?.[fieldId] || (entry as any)[fieldId] || '';
    };

    const filteredEntries = entries.filter((e: any) => 
        e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.phone.includes(search)
    );

    const pickWinner = () => {
        if(entries.length === 0) return;
        setIsAnimating(true);
        setWinner(null);
        
        let counter = 0;
        const interval = setInterval(() => {
            const random = entries[Math.floor(Math.random() * entries.length)];
            setWinner(random);
            counter++;
            if(counter > 20) {
                clearInterval(interval);
                setIsAnimating(false);
            }
        }, 100);
    };

    const handleConfirmEntry = (entry: any) => {
        let details = "";
        if (appConfig.promoDate) details += `\n📅 *Data:* ${appConfig.promoDate}`;
        if (appConfig.promoTime) details += ` às ${appConfig.promoTime}`;
        if (appConfig.promoLocation) details += `\n📍 *Local:* ${appConfig.promoLocation}`;

        const responseText = `Olá *${entry.name.split(' ')[0]}*! Tudo bem? 🍔✨\n\n` +
        `🎉 *PARABÉNS! Sua inscrição foi confirmada!* 🎉\n\n` +
        `Você já está concorrendo ao sorteio *${appConfig.giveawaySettings?.title || 'Oficial'}*! 🍀🤞` +
        (details ? `\n${details}` : '') +
        `\n\n*${appConfig.appName}*`;

        copyToClipboard(responseText);
        setCopyFeedback(entry.id);
        if (onUpdateEntry) onUpdateEntry(entry.id, { confirmed: true });
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleDeleteClick = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este participante?")) {
            if (onDeleteEntry) onDeleteEntry(id);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in">
             <div className="bg-slate-900 w-full max-w-xl rounded-3xl border border-purple-500/50 p-6 shadow-2xl relative flex flex-col h-[600px] max-h-[90vh]">
                 <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                 <div className="text-center mb-6 shrink-0">
                     <Trophy size={48} className={`mx-auto mb-2 text-amber-400 ${isAnimating ? 'animate-bounce' : ''}`}/>
                     <h2 className="text-2xl font-black text-white uppercase italic">Sorteio Oficial</h2>
                 </div>
                 <div className="mb-6 shrink-0 h-[160px] flex flex-col justify-end">
                     {winner ? (
                         <div className={`bg-purple-900/20 border border-purple-500/50 p-4 rounded-2xl text-center w-full h-full flex flex-col justify-center items-center ${isAnimating ? 'opacity-50' : 'animate-in zoom-in'}`}>
                             <p className="text-purple-300 text-xs font-bold uppercase mb-1">Vencedor(a)</p>
                             <h3 className="text-2xl font-black text-white mb-1 line-clamp-1">{winner.name}</h3>
                             <p className="text-slate-400 font-mono text-sm">{normalizePhone(winner.phone)}</p>
                             
                             {instagramField?.enabled && getFieldValue(winner, 'instagram') && (
                                 <a href={`https://instagram.com/${getFieldValue(winner, 'instagram').replace('@','')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-500/30 transition-colors">
                                     <Instagram size={12}/> {getFieldValue(winner, 'instagram')}
                                 </a>
                             )}
                         </div>
                     ) : (
                         <div className="p-4 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl text-center h-full flex flex-col items-center justify-center">
                             <Shuffle size={24} className="mx-auto mb-2 opacity-50"/>
                             <p className="text-sm">Clique abaixo para sortear entre<br/><b>{entries.length} participantes</b></p>
                         </div>
                     )}
                 </div>
                 <button onClick={pickWinner} disabled={isAnimating || entries.length === 0} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg uppercase tracking-wide text-sm shrink-0 mb-4">
                     {isAnimating ? 'Sorteando...' : 'Sortear Agora'}
                 </button>
                 <div className="flex-1 flex flex-col border-t border-slate-800 pt-4 overflow-hidden min-h-0">
                     <div className="flex justify-between items-center mb-3 shrink-0">
                         <h4 className="font-bold text-white text-sm flex items-center gap-2"><Users size={16}/> Lista ({entries.length})</h4>
                         <div className="relative">
                             <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"/>
                             <input className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white outline-none focus:border-purple-500 w-32" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1">
                         {filteredEntries.map((entry: any, i: number) => {
                                 const isJustCopied = copyFeedback === entry.id;
                                 
                                 const extraFields = fields.filter((f:any) => f.enabled && f.id !== 'name' && f.id !== 'phone' && f.id !== 'instagram');
                                 const instaValue = getFieldValue(entry, 'instagram');

                                 return (
                                     <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-900 rounded border border-transparent hover:border-slate-800 transition-colors group">
                                         <div className="min-w-0 flex-1 mr-2">
                                             <p className="text-xs font-bold text-white truncate">{entry.name}</p>
                                             <p className="text-[10px] text-slate-500 font-mono">{normalizePhone(entry.phone)}</p>
                                             
                                             {instaValue && instagramField?.enabled && (
                                                 <p className="text-[10px] text-purple-400 font-medium truncate mt-0.5"><Instagram size={10} className="inline mr-1"/>{instaValue}</p>
                                             )}

                                             {extraFields.map((f:any) => {
                                                 const val = getFieldValue(entry, f.id);
                                                 if(!val) return null;
                                                 return <p key={f.id} className="text-[9px] text-slate-400 truncate mt-0.5"><b>{f.label}:</b> {val}</p>
                                             })}
                                         </div>
                                         <div className="text-right flex items-center gap-1.5 shrink-0">
                                             <div className="mr-2 text-right hidden sm:block">
                                                 <span className="text-[9px] text-slate-600">{formatDate(entry.createdAt)}</span>
                                             </div>
                                             <button onClick={() => handleDeleteClick(entry.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors border border-slate-700"><Trash2 size={12}/></button>
                                             <button onClick={() => handleConfirmEntry(entry)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-md active:scale-90 ${isJustCopied ? 'bg-emerald-500 text-white scale-110' : entry.confirmed ? 'bg-emerald-600/50 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`} title="Confirmar e Copiar Msg">{isJustCopied ? <Check size={14} strokeWidth={3}/> : <MessageCircle size={14}/>}</button>
                                         </div>
                                     </div>
                                 );
                             })}
                     </div>
                 </div>
             </div>
        </div>
    )
}

export function SettingsModal({ config, onClose, onSave, products = [] }: any) {
  const [form, setForm] = useState<AppConfig>(config || {});
  const [activeTab, setActiveTab] = useState("geral");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    setForm((prev) => {
      const out: any = { ...(prev || {}) };

      if (!out.giveawaySettings) {
        out.giveawaySettings = {
          active: false,
          title: "Sorteio Oficial",
          rules: "1. Seguir nosso Instagram\n2. Marcar um amigo",
          fields: [
            { id: "name", label: "Seu Nome", type: "text", required: true, enabled: true, placeholder: "Ex: João Silva" },
            { id: "phone", label: "Seu WhatsApp", type: "phone", required: true, enabled: true, placeholder: "(99) 99999-9999" },
            { id: "instagram", label: "Seu Instagram", type: "text", required: true, enabled: true, placeholder: "@seu.insta" },
            { id: "email", label: "Seu Email", type: "email", required: false, enabled: false, placeholder: "email@exemplo.com" },
            { id: "birthdate", label: "Data de Nascimento", type: "date", required: false, enabled: false, placeholder: "" },
            { id: "custom", label: "Pergunta Personalizada", type: "text", required: false, enabled: false, placeholder: "Sua resposta..." },
          ],
        };
      }

      if (!out.featuredSettings) {
        out.featuredSettings = { active: false, title: "Destaques 🔥", productIds: [] };
      }

      if (!out.schedule) out.schedule = {};
      if (!out.deliveryZones) out.deliveryZones = [];
      return out;
    });
  }, []);

  const tabs = [
    { id: "geral", label: "GERAL", icon: <Store size={18} /> },
    { id: "promocao", label: "PROMOÇÃO", icon: <Ticket size={18} /> },
    { id: "destaques", label: "DESTAQUES", icon: <Star size={18} /> },
    { id: "pagamento", label: "PAGAMENTO", icon: <CreditCard size={18} /> },
    { id: "entrega", label: "ENTREGA", icon: <Truck size={18} /> },
    { id: "horarios", label: "HORÁRIOS", icon: <CalendarClock size={18} /> },
    { id: "localizacao", label: "LOCALIZAÇÃO", icon: <MapPin size={18} /> },
    { id: "sistema", label: "SISTEMA", icon: <Sliders size={18} /> },
  ];

  const handleScheduleChange = (dayIndex: number, field: string, value: any) => {
    setForm((prev: any) => {
      const newSchedule: any = { ...(prev.schedule || {}) };
      if (!newSchedule[dayIndex]) newSchedule[dayIndex] = { enabled: false, open: "18:00", close: "23:00" };
      newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
      return { ...prev, schedule: newSchedule };
    });
  };

  const handleLocationChange = (field: "lat" | "lng", value: string) => {
    setForm((prev: any) => {
      const lat = Number(prev?.location?.lat ?? 0);
      const lng = Number(prev?.location?.lng ?? 0);
      const nextVal = parseFloat(value);
      return {
        ...prev,
        location: { lat, lng, [field]: Number.isFinite(nextVal) ? nextVal : 0 },
      };
    });
  };

  const handleImageUpload = async (field: "appLogoUrl" | "bannerUrl" | "welcomeBannerUrl", file?: File) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm((prev: any) => ({ ...prev, [field]: compressed || "" }));
    } catch {
      alert("Erro ao processar imagem.");
    }
  };

  const handleAddZone = () => {
    if (!newZoneName || !newZoneFee) return;
    const fee = parseFloat(String(newZoneFee).replace(",", "."));
    if (!Number.isFinite(fee)) return;

    setForm((prev: any) => ({
      ...prev,
      deliveryZones: [...(prev.deliveryZones || []), { name: newZoneName, fee }],
    }));
    setNewZoneName("");
    setNewZoneFee("");
  };

  const handleRemoveZone = (idx: number) => {
    setForm((prev: any) => {
      const arr = [...(prev.deliveryZones || [])];
      arr.splice(idx, 1);
      return { ...prev, deliveryZones: arr };
    });
  };

  const toggleFeaturedProduct = (productId: string) => {
    setForm((prev: any) => {
      const fs = prev.featuredSettings || { active: false, title: "Destaques 🔥", productIds: [] };
      const cur = fs.productIds || [];
      const next = cur.includes(productId) ? cur.filter((id: string) => id !== productId) : [...cur, productId];
      return { ...prev, featuredSettings: { ...fs, productIds: next } };
    });
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `backup_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (window.confirm("Isso irá substituir as configurações atuais. Tem certeza?")) {
          setForm(json);
          alert("Backup carregado! Clique em SALVAR para aplicar.");
        }
      } catch {
        alert("Backup inválido.");
      }
    };
    reader.readAsText(file);
  };

  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h3 className="font-bold text-white text-xl flex items-center gap-2">
            <Settings className="text-slate-400" /> Configurações
          </h3>
          <button onClick={onClose}>
            <X size={24} className="text-slate-500 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0 px-2 gap-1 justify-between md:justify-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none px-4 py-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "border-emerald-500 text-white bg-slate-800/50"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon} <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
          {/* ================== GERAL ================== */}
          {activeTab === "geral" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                  <Store size={200} className="text-blue-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">NOME DA LOJA</label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors shadow-inner"
                        value={form.appName || ""}
                        onChange={(e) => setForm((p: any) => ({ ...p, appName: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider flex items-center gap-2">
                        <MessageCircle size={12} /> WHATSAPP DA LOJA
                      </label>

                      <div className="flex gap-2">
                        <div className="relative w-24 shrink-0">
                          <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-2 pr-6 text-white text-sm outline-none focus:border-blue-500 appearance-none font-bold"
                            value={(form as any).storeCountryCode || "+55"}
                            onChange={(e) => setForm((p: any) => ({ ...p, storeCountryCode: e.target.value }))}
                          >
                            {COUNTRY_CODES.map((c: any, idx: number) => (
                              <option key={`${c.code}-${c.country}-${idx}`} value={c.code}>
                                {c.country} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                          value={(form as any).storePhone || ""}
                          onChange={(e) => setForm((p: any) => ({ ...p, storePhone: e.target.value }))}
                          placeholder="(99) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider flex items-center gap-2">
                        <Megaphone size={12} /> Facebook Pixel ID
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors shadow-inner font-mono text-sm"
                        value={(form as any).facebookPixelId || ""}
                        onChange={(e) => setForm((p: any) => ({ ...p, facebookPixelId: e.target.value }))}
                        placeholder="Ex: 123456789012345"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">LOGOTIPO</label>
                      <div className="flex-1 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden hover:border-blue-500 transition-colors min-h-[140px]">
                        {(form as any).appLogoUrl ? (
                          <img src={(form as any).appLogoUrl} className="w-full h-full object-cover p-2" />
                        ) : (
                          <ImageIcon className="text-slate-700" size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <UploadCloud className="text-white" />
                        </div>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={(e) => handleImageUpload("appLogoUrl", e.target.files?.[0])}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================== PROMOÇÃO ================== */}
          {activeTab === "promocao" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block tracking-wider">TÍTULO</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-amber-500 shadow-inner"
                  value={(form as any).promoTitle || ""}
                  onChange={(e) => setForm((p: any) => ({ ...p, promoTitle: e.target.value }))}
                />

                <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block tracking-wider mt-4">SUBTÍTULO</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-amber-500 shadow-inner"
                  value={(form as any).promoSubtitle || ""}
                  onChange={(e) => setForm((p: any) => ({ ...p, promoSubtitle: e.target.value }))}
                />

                <div className="mt-4">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block tracking-wider">BANNER</label>
                  <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl min-h-[140px] flex items-center justify-center relative overflow-hidden">
                    {(form as any).bannerUrl ? (
                      <img src={(form as any).bannerUrl} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-slate-700" size={32} />
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={(e) => handleImageUpload("bannerUrl", e.target.files?.[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================== DESTAQUES ================== */}
          {activeTab === "destaques" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-bold text-white">Carrossel de Destaques</h3>
                    <p className="text-slate-400 text-sm">Selecione produtos em destaque.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!(form as any).featuredSettings?.active}
                      onChange={(e) =>
                        setForm((p: any) => ({
                          ...p,
                          featuredSettings: { ...(p.featuredSettings || {}), active: e.target.checked },
                        }))
                      }
                    />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:bg-amber-500" />
                  </label>
                </div>

                <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block tracking-wider">Buscar produto</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Digite..."
                />

                <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {(products || [])
                    .filter((p: any) =>
                      String(p?.name || "").toLowerCase().includes(String(searchProduct || "").toLowerCase())
                    )
                    .map((p: any) => {
                      const selected = ((form as any).featuredSettings?.productIds || []).includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleFeaturedProduct(p.id)}
                          className={`p-3 rounded-xl border cursor-pointer ${
                            selected ? "border-amber-500/50 bg-amber-900/10" : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-white font-bold">{p.name}</div>
                            <div className="text-slate-400 text-sm">{formatCurrency(p.price)}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ================== PAGAMENTO ================== */}
          {activeTab === "pagamento" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <label className="text-[10px] text-emerald-500 font-bold uppercase mb-2 block tracking-wider">CHAVE PIX</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                  value={(form as any).pixKey || ""}
                  onChange={(e) => setForm((p: any) => ({ ...p, pixKey: e.target.value }))}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-[10px] text-emerald-500 font-bold uppercase mb-2 block tracking-wider">NOME</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                      value={(form as any).pixName || ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, pixName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-500 font-bold uppercase mb-2 block tracking-wider">CIDADE</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                      value={(form as any).pixCity || ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, pixCity: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================== ENTREGA ================== */}
          {activeTab === "entrega" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <label className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={!!(form as any).enableDeliveryFees}
                    onChange={(e) => setForm((p: any) => ({ ...p, enableDeliveryFees: e.target.checked }))}
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">Ativar taxas por bairro</span>
                    <span className="text-[10px] text-slate-500">Define taxas automáticas por zona.</span>
                  </div>
                </label>

                {(form as any).enableDeliveryFees && (
                  <div className="mt-4">
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none"
                        placeholder="Nome do bairro"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                      />
                      <input
                        className="w-full md:w-40 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none"
                        placeholder="Taxa (ex: 5,00)"
                        value={newZoneFee}
                        onChange={(e) => setNewZoneFee(e.target.value)}
                      />
                      <button onClick={handleAddZone} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-xl">
                        Adicionar
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {((form as any).deliveryZones || []).map((z: any, idx: number) => (
                        <div key={`${z.name}-${idx}`} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3">
                          <div className="text-white font-bold">{z.name}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-emerald-400 font-bold">{formatCurrency(z.fee)}</div>
                            <button onClick={() => handleRemoveZone(idx)} className="text-red-400 hover:text-red-300">
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================== HORÁRIOS ================== */}
          {activeTab === "horarios" && (
            <div className="animate-in fade-in h-full flex flex-col">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden mb-6 flex-1 flex flex-col">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Clock size={200} className="text-emerald-500" />
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar relative z-10">
                  {days.map((day, idx) => {
                    const dayConfig = (form as any).schedule?.[idx] || { enabled: false, open: "19:00", close: "23:00" };
                    const isEnabled = dayConfig.enabled;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col sm:flex-row items-center justify-between p-3 rounded-xl border transition-all duration-200 group gap-3 ${
                          isEnabled ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" : "bg-slate-950/50 border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full sm:w-32 shrink-0 justify-between sm:justify-start">
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isEnabled}
                                onChange={(e) => handleScheduleChange(idx, "enabled", e.target.checked)}
                              />
                              <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-white" />
                            </label>
                            <span className={`font-bold text-xs ${isEnabled ? "text-white" : "text-slate-500"}`}>{day}</span>
                          </div>
                        </div>

                        <div className="w-full sm:flex-1 flex items-center justify-end min-w-0">
                          {isEnabled ? (
                            <div className="flex items-center justify-center gap-1 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 shadow-inner w-full sm:w-auto">
                              <input
                                type="time"
                                className="bg-transparent text-white font-bold text-xs outline-none text-center p-0 w-full sm:w-20"
                                value={dayConfig.open}
                                onChange={(e) => handleScheduleChange(idx, "open", e.target.value)}
                              />
                              <span className="text-slate-600 font-bold text-[10px] mx-1">ATÉ</span>
                              <input
                                type="time"
                                className="bg-transparent text-white font-bold text-xs outline-none text-center p-0 w-full sm:w-20"
                                value={dayConfig.close}
                                onChange={(e) => handleScheduleChange(idx, "close", e.target.value)}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center sm:justify-end gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/50 w-full sm:w-auto">
                              <Ban size={10} /> Fechado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================== LOCALIZAÇÃO ================== */}
          {activeTab === "localizacao" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                  <MapPin size={200} className="text-blue-500" />
                </div>

                <div className="relative z-10 space-y-6">
                  {/* ✅ altura fixa do mapa */}
                  <div className="h-[360px] md:h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    <LocationPicker
                      value={(form as any).location}
                      onChange={(loc) => setForm((p: any) => ({ ...p, location: loc }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">LATITUDE</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 font-mono text-sm shadow-inner"
                        value={(form as any).location?.lat ?? ""}
                        onChange={(e) => handleLocationChange("lat", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">LONGITUDE</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 font-mono text-sm shadow-inner"
                        value={(form as any).location?.lng ?? ""}
                        onChange={(e) => handleLocationChange("lng", e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Essa localização é usada como <b>origem</b> para chamar motoboys no raio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================== SISTEMA ================== */}
          {activeTab === "sistema" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider">Pedido mínimo</label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                      value={(form as any).minOrderValue ?? ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, minOrderValue: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider">Tempo estimado</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                      value={(form as any).estimatedTime || ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, estimatedTime: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider">Raio motoboys (km)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      max={50}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none"
                      value={(form as any).dispatchRadiusKm ?? 5}
                      onChange={(e) => setForm((p: any) => ({ ...p, dispatchRadiusKm: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-500" /> Segurança & Backup
                  </h4>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Baixe um backup de todas as configurações.</p>
                      <p className="text-[10px] text-slate-500">Útil para restaurar manualmente.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={downloadBackup} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700">
                        <Download size={14} /> Baixar Config
                      </button>

                      <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer">
                        <UploadCloud size={14} /> Restaurar
                        <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 shrink-0">
          <button
            onClick={async () => {
              await Promise.resolve(onSave(form));
              onClose();
            }}
            className="w-full bg-[#009e60] hover:bg-[#00804d] text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide"
          >
            <Save size={20} /> SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------- EDIT ORDER MODAL -----------------------------
export type EditOrderModalProps = {
  order: Order | null;
  onClose: () => void;
  onSave: (id: string, data: any) => void | Promise<void>;
};

export function EditOrderModal({ order, onClose, onSave }: EditOrderModalProps) {
  if (!order) return null;

  const [form, setForm] = useState<any>({ ...(order as any) });
  const [copiedMap, setCopiedMap] = useState(false);

  useEffect(() => {
    setForm({ ...(order as any) });
  }, [order]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-white">Editar Pedido {formatOrderId((order as any).id)}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* STATUS DO PEDIDO */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-500 font-bold uppercase block mb-2">Status da Entrega</label>
            <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-amber-500 font-bold"
                value={form.status || "pending"}
                onChange={(e) => {
                    const newStatus = e.target.value;
                    const update: any = { ...form, status: newStatus };
                    if (newStatus === 'completed' && !form.completedAt) {
                        update.completedAt = new Date();
                    }
                    setForm(update);
                }}
            >
                <option value="pending">Pendente (Novo)</option>
                <option value="preparing">Na Cozinha (Preparando)</option>
                <option value="ready">Pronto (Aguardando Motoboy)</option>
                <option value="assigned">Motoboy Atribuído</option>
                <option value="accepted">Motoboy no Balcão</option>
                <option value="delivering">Em Rota (Com Motoboy)</option>
                <option value="completed">✅ Entregue / Finalizado</option>
                <option value="cancelled">❌ Cancelado</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Cliente</label>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
              value={form.customer || ""}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Telefone</label>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Endereço (Texto)</label>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* LOCALIZAÇÃO DO MAPA */}
          <div>
            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Link do Mapa</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400 outline-none text-xs font-mono"
                value={form.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address || '')}`}
                readOnly
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const linkToCopy = form.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address || '')}`;
                  copyToClipboard(linkToCopy);
                  setCopiedMap(true);
                  setTimeout(() => setCopiedMap(false), 2000);
                }}
                className={`p-3 rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-95 ${copiedMap ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                title="Copiar Localização do Mapa"
              >
                {copiedMap ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Itens</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500 h-32"
              value={form.items || ""}
              onChange={(e) => setForm({ ...form, items: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Valor</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                value={form.value ?? 0}
                onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value || "0") })}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Pagamento</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                value={form.paymentMethod || ""}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={async () => {
              const cleaned = removeUndefinedDeep(form);
              await Promise.resolve(onSave((order as any).id, cleaned));
              onClose();
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4 active:scale-95 transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSave,
  existingCategories = [],
  inventory = [],
}: any) {
  const isEdit = !!product?.id;

  const [form, setForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  const [categoryMode, setCategoryMode] = useState<"select" | "new">("select");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const initial: Partial<Product> = product
      ? { ...product }
      : {
          name: "",
          description: "",
          category: existingCategories?.[0] || "Hambúrgueres",
          price: 0,
          costPrice: 0,
          operationalCost: 0,
          available: true,
          imageUrl: "",
          ingredients: [],
        };

    setForm(initial);
    setSaving(false);

    const currentCat = (initial.category || "").trim();
    const hasInList = currentCat && existingCategories.includes(currentCat);
    if (!hasInList && currentCat) {
      setCategoryMode("new");
      setNewCategory(currentCat);
    } else {
      setCategoryMode("select");
      setNewCategory("");
    }
  }, [isOpen, product, existingCategories]);

  if (!isOpen) return null;

  const setField = (k: keyof Product, v: any) => setForm((p) => ({ ...(p || {}), [k]: v }));

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setField("imageUrl" as any, compressed || "");
    } catch (e) {
      console.error(e);
      alert("Erro ao processar imagem.");
    }
  };

  const resolvedCategory =
    categoryMode === "new" ? (newCategory || "").trim() : ((form.category || "").trim() || existingCategories?.[0] || "");

  const handleSave = async () => {
    const payload: Partial<Product> = {
      ...form,
      category: resolvedCategory || "Sem categoria",
    };

    // @ts-ignore
    delete (payload as any).id;

    if (!payload.name || !payload.name.toString().trim()) {
      alert("Informe o nome do produto.");
      return;
    }
    if (!payload.category || !payload.category.toString().trim()) {
      alert("Informe a categoria.");
      return;
    }

    setSaving(true);
    await Promise.resolve(onSave(isEdit ? (product as any).id : null, payload));
    setSaving(false);
    onClose();
  };

  const categories = Array.from(new Set((existingCategories || []).map((c) => (c || "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h3 className="font-bold text-white text-xl flex items-center gap-2">
            <Utensils size={18} className="text-amber-500" />
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Nome</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-amber-500"
                value={(form.name as any) || ""}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ex: X-Bacon"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Descrição</label>
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-amber-500 h-28"
                value={(form.description as any) || ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Ingredientes / observações..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Preço</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-amber-500"
                  value={(form.price as any) ?? 0}
                  onChange={(e) => setField("price", parseFloat(e.target.value || "0"))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Custo</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-amber-500"
                  value={(form.costPrice as any) ?? 0}
                  onChange={(e) => setField("costPrice" as any, parseFloat(e.target.value || "0"))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Op.</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-amber-500"
                  value={(form.operationalCost as any) ?? 0}
                  onChange={(e) => setField("operationalCost" as any, parseFloat(e.target.value || "0"))}
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Categoria</label>
                <button
                  type="button"
                  onClick={() => setCategoryMode((m) => (m === "select" ? "new" : "select"))}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase"
                >
                  {categoryMode === "select" ? "+ Nova" : "Escolher"}
                </button>
              </div>

              {categoryMode === "select" ? (
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                  value={resolvedCategory || ""}
                  onChange={(e) => setField("category" as any, e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Digite a nova categoria..."
                />
              )}

              <p className="text-[10px] text-slate-500 mt-2">
                Dica: se uma categoria antiga não aparecer, digite em “Nova”.
              </p>
            </div>

            <label className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={(form.available as any) !== false}
                onChange={(e) => setField("available" as any, e.target.checked)}
              />
              <div>
                <span className="text-sm font-bold text-white block">Disponível</span>
                <span className="text-[10px] text-slate-500">Desmarque para aparecer como esgotado.</span>
              </div>
            </label>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Imagem</label>

              <div className="border-2 border-dashed border-slate-700 rounded-xl overflow-hidden relative group min-h-[180px] flex items-center justify-center bg-slate-900">
                {form.imageUrl ? (
                  <img src={form.imageUrl as any} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-600">
                    <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Clique para enviar</p>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <UploadCloud size={24} />
                </div>

                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
              </div>

              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setField("imageUrl" as any, "")}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs"
                >
                  Remover imagem
                </button>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ficha técnica</label>
                <span className="text-[10px] text-slate-600">{inventory?.length ? `Estoque: ${inventory.length}` : "Opcional"}</span>
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                Se você usa estoque/ingredientes, mantenha aqui os itens do produto (opcional).
              </p>

              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 h-32 font-mono text-xs"
                value={Array.isArray((form as any).ingredients) ? (form as any).ingredients.map((x: any) => (typeof x === "string" ? x : x?.name || "")).join("\n") : ""}
                onChange={(e) => {
                  const lines = e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);
                  setField("ingredients" as any, lines);
                }}
                placeholder={"Ex:\nPão\nCarne 160g\nQueijo\nBacon"}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-950 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManualOrderModal({ initialData, onClose, onSave }: any) {
    const [form, setForm] = useState(initialData || { customer: '', phone: '', address: '' });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-white">Novo Pedido Manual</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white"/></button>
                </div>
                <div className="space-y-4">
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Cliente</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Telefone</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Endereço</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                    <button onClick={() => { 
                        onSave({ ...form, items: 'Pedido Manual', value: 0, status: 'pending', origin: 'manual', createdAt: new Date() });
                        onClose();
                    }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Criar Pedido</button>
                </div>
            </div>
        </div>
    )
}

export function NewDriverModal({ initialData, onClose, onSave }: any) {
    const [form, setForm] = useState(initialData || { 
        name: '', 
        phone: '', 
        document: '', 
        address: '', 
        vehicle: '', 
        plate: '', 
        pixKey: '', 
        paymentModel: 'fixed_per_delivery', 
        paymentRate: 5 
    });

    // ESTADO PARA O ZOOM DA IMAGEM EM TELA CHEIA
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    
    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
                <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
                    
                    <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                        <h3 className="font-black text-xl text-white uppercase tracking-widest">
                            {initialData ? 'Editar' : 'Novo'} Motoboy
                        </h3>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        
                        <div>
                            <h4 className="text-emerald-500 font-bold text-xs uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Dados Pessoais</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nome Completo</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="Ex: João da Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Telefone / WhatsApp</label>
                                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">CPF / CNH</label>
                                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="000.000.000-00" value={form.document} onChange={e => setForm({...form, document: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Endereço Completo</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="Rua, Número, Bairro, Cidade" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-amber-500 font-bold text-xs uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Identificação do Veículo</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Modelo / Moto</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none transition-colors" placeholder="Ex: Honda CG 160" value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Placa</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white uppercase focus:border-amber-500 outline-none transition-colors" placeholder="ABC-1234" value={form.plate} onChange={e => setForm({...form, plate: e.target.value.toUpperCase()})} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Acerto e Repasse</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Chave PIX</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="E-mail, CPF, Telefone ou Aleatória" value={form.pixKey} onChange={e => setForm({...form, pixKey: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Modelo de Pagamento</label>
                                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" value={form.paymentModel} onChange={e => setForm({...form, paymentModel: e.target.value})}>
                                            <option value="fixed_per_delivery">Fixo por Entrega</option>
                                            <option value="percentage">% do Pedido</option>
                                            <option value="salary">Salário Fixo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Valor / Taxa</label>
                                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" value={form.paymentRate} onChange={e => setForm({...form, paymentRate: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✅ SEÇÃO 4: DOCUMENTOS ANEXADOS (COM ZOOM) */}
                        {initialData && (
                            <div>
                                <h4 className="text-purple-500 font-bold text-xs uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Documentos (Enviados pelo App)</h4>
                                <div className="grid grid-cols-3 gap-3 mt-2">
                                    
                                    {/* SELFIE */}
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Foto Perfil</p>
                                        {initialData.avatar ? (
                                            <div onClick={() => setZoomedImage(initialData.avatar)} className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-700 cursor-pointer group">
                                                <img src={initialData.avatar} alt="Perfil" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={20} className="text-white"/></div>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-square rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-600 text-[10px] text-center p-2">Pendente</div>
                                        )}
                                    </div>

                                    {/* FRENTE */}
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Doc Frente</p>
                                        {(initialData.documentFront || initialData.documentPhoto) ? (
                                            <div onClick={() => setZoomedImage(initialData.documentFront || initialData.documentPhoto)} className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-700 cursor-pointer group">
                                                <img src={initialData.documentFront || initialData.documentPhoto} alt="Frente" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={20} className="text-white"/></div>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-square rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-600 text-[10px] text-center p-2">Pendente</div>
                                        )}
                                    </div>

                                    {/* VERSO */}
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Doc Verso</p>
                                        {initialData.documentBack ? (
                                            <div onClick={() => setZoomedImage(initialData.documentBack)} className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-700 cursor-pointer group">
                                                <img src={initialData.documentBack} alt="Verso" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={20} className="text-white"/></div>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-square rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-600 text-[10px] text-center p-2">Pendente</div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        )}
                        
                    </div>

                    <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900 rounded-b-2xl">
                        <button 
                            onClick={() => { onSave(form); onClose(); }} 
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            Salvar Cadastro
                        </button>
                    </div>
                    
                </div>
            </div>

            {/* ✅ MODAL DE ZOOM DA IMAGEM EM TELA CHEIA */}
            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                        <X size={24} />
                    </button>
                    <img 
                        src={zoomedImage} 
                        alt="Zoom" 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                    />
                </div>
            )}
        </>
    )
}

export function DriverInviteModal({
  tenantId,
  tenantSlug,
  onClose,
}: {
  tenantId: string;
  tenantSlug: string;
  onClose: () => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const installLink = tenantSlug
    ? `${window.location.origin}/driver-install?slug=${encodeURIComponent(tenantSlug)}&code=${encodeURIComponent(joinCode)}`
    : `${window.location.origin}/driver-install`;

  const handleSave = async () => {
    setMsg("");
    const code = joinCode.trim();
    if (!code) {
      setMsg("Informe um código de convite.");
      return;
    }

    try {
      setSaving(true);
      await setDriverJoinCode({ tenantId, joinCode: code });
      setMsg("Convite salvo! Envie o link (ou o slug + código) para o motoboy.");
    } catch (e: any) {
      console.error("[DriverInviteModal] error", e);
      setMsg(e?.message || "Erro ao salvar convite.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Convite do Motoboy</h2>
            <p className="text-slate-400 text-sm mt-1">
              O motoboy vai se cadastrar no app dele usando <b>Slug da loja</b> + <b>Código</b>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-slate-300 text-sm">Slug da loja</label>
            <input
              value={tenantSlug}
              disabled
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white opacity-80"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Código de convite</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Ex: 1234"
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-300 text-sm mb-2">Link do cadastro do motoboy</div>
            <div className="text-slate-400 text-xs break-all">{installLink}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => copyToClipboard(installLink)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-700"
              >
                Copiar link
              </button>
              <button
                onClick={() => copyToClipboard(joinCode.trim())}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-700"
              >
                Copiar código
              </button>
            </div>
          </div>

          {msg && <div className="text-sm text-amber-300">{msg}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CloseCycleModal({ data, onClose, onConfirm }: any) {
    if(!data) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl text-center">
                <h3 className="font-bold text-xl text-white mb-4">Fechar Ciclo</h3>
                <p className="text-slate-400 mb-6">Confirma o pagamento de <b>{formatCurrency(data.finalAmount)}</b> para <b>{data.driverName}</b>?</p>
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">Cancelar</button>
                    <button onClick={() => onConfirm(data)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl">Confirmar</button>
                </div>
            </div>
        </div>
    )
}

export function ImportModal({ onClose, onImportCSV }: any) {
    const [text, setText] = useState('');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-white">Importar Clientes (CSV)</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white"/></button>
                </div>
                <p className="text-xs text-slate-400 mb-2">Formato: Nome,Telefone,Endereço (um por linha)</p>
                <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500 h-60 font-mono text-xs" value={text} onChange={e => setText(e.target.value)} placeholder="João,11999999999,Rua A 123&#10;Maria,11988888888,Av B 456" />
                <button onClick={() => onImportCSV(text)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Importar</button>
            </div>
        </div>
    )
}

export function EditClientModal({ client, onClose, onSave }: any) {
    const [form, setForm] = useState({...client});
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-white">Editar Cliente</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white"/></button>
                </div>
                <div className="space-y-4">
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Nome</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Telefone</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Endereço</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Observações</label><textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white h-24" value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} /></div>
                    <button onClick={() => onSave(form)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Salvar</button>
                </div>
            </div>
        </div>
    )
}

export function ReceiptModal({ order, onClose, appConfig }: any) {
    const handlePrint = () => {
        printOrderTicket(order, appConfig);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-white text-black w-full max-w-xs rounded-xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500"><X size={20}/></button>
                <div className="text-center mb-4">
                    <h3 className="font-bold uppercase text-lg">{appConfig.appName}</h3>
                    <p className="text-xs">Pedido {formatOrderId(order.id)}</p>
                    <p className="text-xs">{formatDate(order.createdAt)} - {formatTime(order.createdAt)}</p>
                </div>
                <div className="border-t border-b border-dashed border-gray-400 py-2 mb-4 text-sm space-y-1">
                    <p><b>Cliente:</b> {order.customer}</p>
                    <p><b>Tel:</b> {order.phone}</p>
                    <p><b>End:</b> {order.address}</p>
                </div>
                <div className="text-sm mb-4 whitespace-pre-wrap font-mono leading-tight">
                    {order.items}
                </div>
                <div className="border-t border-dashed border-gray-400 pt-2 text-right">
                    <p className="text-lg font-bold">TOTAL: {formatCurrency(order.value)}</p>
                    <p className="text-xs mt-1">{order.paymentMethod}</p>
                </div>
                <button onClick={handlePrint} className="w-full bg-black text-white font-bold py-2 rounded mt-6 flex items-center justify-center gap-2"><Printer size={16}/> Imprimir</button>
            </div>
        </div>
    )
}

export function KitchenHistoryModal({ order, onClose, products, totalClientOrders }: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                <h3 className="font-bold text-xl text-white mb-1">Detalhes do Pedido</h3>
                {totalClientOrders > 1 && <p className="text-xs text-amber-500 font-bold mb-2">Este cliente já fez {totalClientOrders} pedidos hoje!</p>}
                <p className="text-slate-400 text-sm mb-4">ID: {formatOrderId(order.id)}</p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                    <p className="text-white font-medium mb-1">{order.customer}</p>
                    <p className="text-slate-500 text-xs mb-3">{order.address}</p>
                    <div className="text-slate-300 text-sm whitespace-pre-wrap border-t border-slate-800 pt-2">{order.items}</div>
                </div>
                <div className="text-right text-emerald-400 font-bold text-lg">{formatCurrency(order.value)}</div>
            </div>
        </div>
    )
}

export function ProductionSuccessModal({ order, onClose, appName }: any) {
    useEffect(() => {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 p-8 rounded-3xl border border-emerald-500/50 shadow-2xl text-center">
                <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 animate-bounce">
                    <Flame size={40}/>
                </div>
                <h3 className="text-2xl font-black text-white uppercase">Iniciando Preparo!</h3>
                <p className="text-slate-400 mt-2">Pedido {formatOrderId(order.id)} enviado para a chapa.</p>
            </div>
        </div>
    )
}

export function DispatchSuccessModal({ data, onClose, appName }: any) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in zoom-in">
            <div className="bg-slate-900 p-8 rounded-3xl border border-blue-500/50 shadow-2xl text-center">
                <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 animate-pulse">
                    <Bike size={40}/>
                </div>
                <h3 className="text-2xl font-black text-white uppercase">Saiu para Entrega!</h3>
                <p className="text-slate-400 mt-2">Motorista: <b>{data.driverName}</b></p>
            </div>
        </div>
    )
}

export function ConfirmCloseOrderModal({ isOpen, order, onClose, onConfirm }: any) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in"
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl text-center max-w-sm w-full"
        onClick={(e) => e.stopPropagation()} 
      >
        <h3 className="text-xl font-bold text-white mb-2">Concluir Pedido?</h3>
        <p className="text-slate-400 text-sm mb-6">
          Isso marcará o pedido como <b>Entregue/Finalizado</b> e sairá da tela de produção.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }}
            className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                await Promise.resolve(onConfirm?.());
              } catch (err) {
                console.error("[MODAL] Erro no onConfirm:", err);
                alert("Erro ao concluir pedido.");
              }
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}