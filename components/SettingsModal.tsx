// components/SettingsModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Store,
  Truck,
  CalendarClock,
  Sliders,
  Bike,
  PlusCircle,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  DollarSign,
  Timer,
  Printer,
  Download,
  ShieldCheck,
  CreditCard,
  MapPin,
  Star,
  Gift,
  MessageCircle,
  Ban,
} from "lucide-react";

import { AppConfig, DeliveryZone, Product } from "../types";
import { COUNTRY_CODES, compressImage, formatCurrency } from "../utils";

/** Remove undefined (Firestore não aceita). Mantém null, "", 0, false etc. */
function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => removeUndefinedDeep(v)) as any;
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = removeUndefinedDeep(v as any);
    }
    return out;
  }
  return value;
}

type TabId =
  | "geral"
  | "promocao"
  | "destaques"
  | "pagamento"
  | "entrega"
  | "horarios"
  | "localizacao"
  | "sistema";

// --------- HORÁRIOS (SUPORTE A MÚLTIPLOS TURNOS + TEXTO FECHADO) ---------

type DaySlot = { open: string; close: string };
type DaySchedule = {
  enabled: boolean;
  slots: DaySlot[];          // NOVO: múltiplos horários no dia
  closedText?: string;       // NOVO: mensagem detalhada quando fechado
};

// Garante compatibilidade com o schedule antigo (open/close) e cria defaults
function normalizeScheduleShape(inputSchedule: any) {
  const out: Record<number, DaySchedule> = { ...(inputSchedule || {}) };

  for (let i = 0; i < 7; i++) {
    const d: any = out[i] || {};

    // Se vier no formato antigo: { enabled, open, close }
    if (!d.slots && (d.open || d.close)) {
      d.slots = [
        {
          open: d.open || "19:00",
          close: d.close || "23:00",
        },
      ];
      delete d.open;
      delete d.close;
    }

    // Se não existe nada ainda
    if (!d.slots || !Array.isArray(d.slots) || d.slots.length === 0) {
      d.slots = [{ open: "19:00", close: "23:00" }];
    }

    out[i] = {
      enabled: !!d.enabled,
      slots: d.slots.map((s: any) => ({
        open: s?.open || "19:00",
        close: s?.close || "23:00",
      })),
      closedText: d.closedText ?? "",
    };
  }

  return out;
}

const handleDayEnabled = (dayIndex: number, enabled: boolean) => {
  setForm((prev: any) => {
    const next = { ...(prev || {}) };
    next.schedule = normalizeScheduleShape(next.schedule);
    next.schedule[dayIndex] = { ...(next.schedule[dayIndex] || {}), enabled };
    return next;
  });
};

const handleSlotChange = (dayIndex: number, slotIndex: number, field: "open" | "close", value: string) => {
  setForm((prev: any) => {
    const next = { ...(prev || {}) };
    next.schedule = normalizeScheduleShape(next.schedule);

    const day = next.schedule[dayIndex];
    const slots = [...(day.slots || [])];
    slots[slotIndex] = { ...(slots[slotIndex] || { open: "19:00", close: "23:00" }), [field]: value };

    next.schedule[dayIndex] = { ...day, slots };
    return next;
  });
};

const addSlot = (dayIndex: number) => {
  setForm((prev: any) => {
    const next = { ...(prev || {}) };
    next.schedule = normalizeScheduleShape(next.schedule);

    const day = next.schedule[dayIndex];
    const slots = [...(day.slots || [])];

    // limita pra não virar bagunça (você pode aumentar)
    if (slots.length >= 3) return next;

    slots.push({ open: "14:00", close: "18:00" });
    next.schedule[dayIndex] = { ...day, slots, enabled: true };
    return next;
  });
};

const removeSlot = (dayIndex: number, slotIndex: number) => {
  setForm((prev: any) => {
    const next = { ...(prev || {}) };
    next.schedule = normalizeScheduleShape(next.schedule);

    const day = next.schedule[dayIndex];
    let slots = [...(day.slots || [])];

    slots.splice(slotIndex, 1);
    if (slots.length === 0) slots = [{ open: "19:00", close: "23:00" }];

    next.schedule[dayIndex] = { ...day, slots };
    return next;
  });
};

const handleClosedText = (dayIndex: number, value: string) => {
  setForm((prev: any) => {
    const next = { ...(prev || {}) };
    next.schedule = normalizeScheduleShape(next.schedule);

    const day = next.schedule[dayIndex];
    next.schedule[dayIndex] = { ...day, closedText: value };
    return next;
  });
};


export function SettingsModal({
  config,
  onClose,
  onSave,
  products = [],
}: {
  config: AppConfig;
  onClose: () => void;
  onSave: (cfg: AppConfig) => Promise<void> | void;
  products?: Product[];
}) {
  const [form, setForm] = useState<AppConfig>(config || ({} as AppConfig));
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  // entrega
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");

  // destaques
  const [searchProduct, setSearchProduct] = useState("");

  useEffect(() => {
    setForm(config || ({} as AppConfig));
  }, [config]);

  // Defaults (para não sumir abas/props)
  useEffect(() => {
    setForm((prev: any) => {
      const next = { ...(prev || {}) };

      // Geral (imagens)
      if (next.bannerUrl === undefined) next.bannerUrl = "";
      if (next.appLogoUrl === undefined) next.appLogoUrl = "";
      if (next.welcomeBannerUrl === undefined) next.welcomeBannerUrl = "";

      // Pix
      if (next.pixKey === undefined) next.pixKey = "";
      if (next.pixName === undefined) next.pixName = "";
      if (next.pixCity === undefined) next.pixCity = "";

      // Localização
      if (next.latitude === undefined) next.latitude = "";
      if (next.longitude === undefined) next.longitude = "";

      // Destaques
      if (!next.featuredSettings) {
        next.featuredSettings = { active: false, title: "Destaques 🔥", productIds: [] as string[] };
      }

      // Promoção
      if (!next.promoSettings) {
        next.promoSettings = {
          active: false,
          displayMode: "card", // "card" | "banner"
          title: "",
          subtitle: "",
          date: "",
          time: "",
          location: "",
          welcomePopup: {
            enabled: false,
            type: "image", // "image" | "text"
            imageUrl: "",
            text: "",
          },
        };
      } else {
        if (next.promoSettings.displayMode === undefined) next.promoSettings.displayMode = "card";
        if (!next.promoSettings.welcomePopup) {
          next.promoSettings.welcomePopup = {
            enabled: false,
            type: "image",
            imageUrl: "",
            text: "",
          };
        } else {
          if (next.promoSettings.welcomePopup.type === undefined) next.promoSettings.welcomePopup.type = "image";
          if (next.promoSettings.welcomePopup.imageUrl === undefined) next.promoSettings.welcomePopup.imageUrl = "";
          if (next.promoSettings.welcomePopup.text === undefined) next.promoSettings.welcomePopup.text = "";
        }
      }

      return next;
    });
  }, []);

  const tabs = [
    { id: "geral" as const, label: "GERAL", icon: <Store size={18} /> },
    { id: "promocao" as const, label: "PROMOÇÃO", icon: <Gift size={18} /> },
    { id: "destaques" as const, label: "DESTAQUES", icon: <Star size={18} /> },
    { id: "pagamento" as const, label: "PAGAMENTO", icon: <CreditCard size={18} /> },
    { id: "entrega" as const, label: "ENTREGA", icon: <Truck size={18} /> },
    { id: "horarios" as const, label: "HORÁRIOS", icon: <CalendarClock size={18} /> },
    { id: "localizacao" as const, label: "LOCALIZAÇÃO", icon: <MapPin size={18} /> },
    { id: "sistema" as const, label: "SISTEMA", icon: <Sliders size={18} /> },
  ];

  const handleImageUpload = async (
    field: "appLogoUrl" | "bannerUrl" | "welcomeBannerUrl" | "promoWelcomeImage",
    file?: File
  ) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm((prev: any) => {
        const next = { ...(prev || {}) };

        if (field === "promoWelcomeImage") {
          next.promoSettings = { ...(next.promoSettings || {}) };
          next.promoSettings.welcomePopup = { ...(next.promoSettings.welcomePopup || {}) };
          next.promoSettings.welcomePopup.imageUrl = compressed || "";
        } else {
          next[field] = compressed || "";
        }

        return next;
      });
    } catch {
      alert("Erro ao processar imagem.");
    }
  };

  // entrega
  const handleAddZone = () => {
    if (!newZoneName || !newZoneFee) return;
    const fee = parseFloat(newZoneFee.replace(",", "."));
    if (Number.isNaN(fee)) return;

    const newZone: DeliveryZone = { name: newZoneName, fee };
    setForm((prev: any) => ({
      ...(prev || {}),
      deliveryZones: [...((prev?.deliveryZones || []) as DeliveryZone[]), newZone],
    }));

    setNewZoneName("");
    setNewZoneFee("");
  };

  const handleRemoveZone = (index: number) => {
    setForm((prev: any) => {
      const zones = [...((prev?.deliveryZones || []) as DeliveryZone[])];
      zones.splice(index, 1);
      return { ...(prev || {}), deliveryZones: zones };
    });
  };

  // horarios
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const handleScheduleChange = (dayIndex: number, field: string, value: any) => {
    setForm((prev: any) => {
      const schedule = { ...(prev?.schedule || {}) };
      if (!schedule[dayIndex]) schedule[dayIndex] = { enabled: false, open: "18:00", close: "23:00" };
      schedule[dayIndex] = { ...schedule[dayIndex], [field]: value };
      return { ...(prev || {}), schedule };
    });
  };

  // destaques
  const filteredProducts = useMemo(() => {
    const q = (searchProduct || "").toLowerCase().trim();
    if (!q) return products || [];
    return (products || []).filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, searchProduct]);

  const toggleFeaturedProduct = (pid: string) => {
    setForm((prev: any) => {
      const fs = { ...(prev?.featuredSettings || {}) };
      const setIds = new Set<string>(fs.productIds || []);
      if (setIds.has(pid)) setIds.delete(pid);
      else setIds.add(pid);
      fs.productIds = Array.from(setIds);
      return { ...(prev || {}), featuredSettings: fs };
    });
  };

  // backup
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
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("Isso irá substituir todas as configurações atuais pelas do arquivo. Tem certeza?")) {
          setForm(json);
          alert("Backup carregado! Clique em 'Salvar Alterações' para confirmar.");
        }
      } catch {
        alert("Erro ao ler arquivo de backup. Formato inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveClick = async () => {
    const cleaned = removeUndefinedDeep(form);
    await Promise.resolve(onSave?.(cleaned));
    onClose?.();
  };

  const promo = (form as any)?.promoSettings || {};
  const welcome = promo?.welcomePopup || {};
  const featured = (form as any)?.featuredSettings || { active: false, title: "", productIds: [] };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <h3 className="font-bold text-white text-xl flex items-center gap-2">
            <Sliders className="text-slate-400" /> Configurações
          </h3>
          <button onClick={onClose}>
            <X size={24} className="text-slate-500 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0 px-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-none px-4 py-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "border-emerald-500 text-white bg-slate-800/50"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon} <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
          {/* ---------------- GERAL ---------------- */}
          {activeTab === "geral" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">
                        NOME DA LOJA
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors shadow-inner"
                        value={(form as any)?.appName || ""}
                        onChange={(e) => setForm({ ...(form as any), appName: e.target.value } as any)}
                        placeholder="Ex: Jhans Burgers"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider flex items-center gap-2">
                        <MessageCircle size={12} /> WHATSAPP DA LOJA (DESTINO DOS PEDIDOS)
                      </label>

                      <div className="flex gap-2">
                        <div className="relative w-28 shrink-0">
                          <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-2 pr-6 text-white text-sm outline-none focus:border-blue-500 appearance-none font-bold"
                            value={(form as any)?.storeCountryCode || "+55"}
                            onChange={(e) => setForm({ ...(form as any), storeCountryCode: e.target.value } as any)}
                          >
                            {COUNTRY_CODES.map((c: any) => (
                              <option key={`${c.code}-${c.country}`} value={c.code}>
                                {c.country} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                          value={(form as any)?.storePhone || ""}
                          onChange={(e) => setForm({ ...(form as any), storePhone: e.target.value } as any)}
                          placeholder="(99) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">
                        FACEBOOK PIXEL ID (opcional)
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors shadow-inner"
                        value={(form as any)?.facebookPixelId || ""}
                        onChange={(e) => setForm({ ...(form as any), facebookPixelId: e.target.value } as any)}
                        placeholder="Ex: 123456789012345"
                      />
                      <p className="text-[10px] text-slate-500 mt-2">
                        Cole apenas o <b>ID numérico</b> do Pixel.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">
                        LOGOTIPO
                      </label>

                      <div className="flex-1 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden hover:border-blue-500 transition-colors min-h-[160px]">
                        {(form as any)?.appLogoUrl ? (
                          <img src={(form as any)?.appLogoUrl} className="w-full h-full object-cover p-2" />
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
                          onChange={(e) => handleImageUpload("appLogoUrl", e.target.files?.[0] as File)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">
                        BANNER (opcional)
                      </label>
                      <div className="flex-1 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden hover:border-blue-500 transition-colors min-h-[160px]">
                        {(form as any)?.bannerUrl ? (
                          <img src={(form as any)?.bannerUrl} className="w-full h-full object-cover p-2" />
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
                          onChange={(e) => handleImageUpload("bannerUrl", e.target.files?.[0] as File)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 block tracking-wider">
                        BANNER BOAS-VINDAS (opcional)
                      </label>
                      <div className="flex-1 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden hover:border-blue-500 transition-colors min-h-[160px]">
                        {(form as any)?.welcomeBannerUrl ? (
                          <img src={(form as any)?.welcomeBannerUrl} className="w-full h-full object-cover p-2" />
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
                          onChange={(e) => handleImageUpload("welcomeBannerUrl", e.target.files?.[0] as File)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- PROMOÇÃO ---------------- */}
          {activeTab === "promocao" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="text-white font-bold">Promoção</h4>
                    <p className="text-xs text-slate-500">Configura o card/banner e o popup de boas-vindas.</p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-xs font-bold text-slate-400">Ativar</span>
                    <input
                      type="checkbox"
                      checked={!!promo.active}
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...(prev || {}),
                          promoSettings: { ...(prev?.promoSettings || {}), active: e.target.checked },
                        }))
                      }
                      className="w-5 h-5"
                    />
                  </label>
                </div>

                {/* modelo de exibição */}
                <div className="mb-6">
                  <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                    MODELO DE EXIBIÇÃO (CARDÁPIO)
                  </label>
                  <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <button
                      onClick={() =>
                        setForm((prev: any) => ({
                          ...(prev || {}),
                          promoSettings: { ...(prev?.promoSettings || {}), displayMode: "card" },
                        }))
                      }
                      className={`flex-1 py-3 rounded-lg text-xs font-black ${
                        promo.displayMode === "card" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Card
                    </button>
                    <button
                      onClick={() =>
                        setForm((prev: any) => ({
                          ...(prev || {}),
                          promoSettings: { ...(prev?.promoSettings || {}), displayMode: "banner" },
                        }))
                      }
                      className={`flex-1 py-3 rounded-lg text-xs font-black ${
                        promo.displayMode === "banner" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Banner Full
                    </button>
                  </div>
                </div>

                {/* campos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                        TÍTULO PRINCIPAL
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                        value={promo.title || ""}
                        onChange={(e) =>
                          setForm((prev: any) => ({
                            ...(prev || {}),
                            promoSettings: { ...(prev?.promoSettings || {}), title: e.target.value },
                          }))
                        }
                        placeholder="Ex: Sorteio Combo Casal Clássico"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                        SUBTÍTULO / DESCRIÇÃO
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                        value={promo.subtitle || ""}
                        onChange={(e) =>
                          setForm((prev: any) => ({
                            ...(prev || {}),
                            promoSettings: { ...(prev?.promoSettings || {}), subtitle: e.target.value },
                          }))
                        }
                        placeholder="Ex: 2 Burgers + Batata + 2 Coca Zero."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                          DATA DO EVENTO
                        </label>
                        <input
                          type="date"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                          value={promo.date || ""}
                          onChange={(e) =>
                            setForm((prev: any) => ({
                              ...(prev || {}),
                              promoSettings: { ...(prev?.promoSettings || {}), date: e.target.value },
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                          HORÁRIO
                        </label>
                        <input
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                          value={promo.time || ""}
                          onChange={(e) =>
                            setForm((prev: any) => ({
                              ...(prev || {}),
                              promoSettings: { ...(prev?.promoSettings || {}), time: e.target.value },
                            }))
                          }
                          placeholder="Ex: Sexta - 19:00 Horas"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                        LOCAL
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                        value={promo.location || ""}
                        onChange={(e) =>
                          setForm((prev: any) => ({
                            ...(prev || {}),
                            promoSettings: { ...(prev?.promoSettings || {}), location: e.target.value },
                          }))
                        }
                        placeholder="Ex: Instagram: @jhansburgers"
                      />
                    </div>
                  </div>

                  {/* popup boas vindas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                        POPUP DE BOAS-VINDAS
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-bold text-slate-400">Ativar</span>
                        <input
                          type="checkbox"
                          checked={!!welcome.enabled}
                          onChange={(e) =>
                            setForm((prev: any) => ({
                              ...(prev || {}),
                              promoSettings: {
                                ...(prev?.promoSettings || {}),
                                welcomePopup: { ...(prev?.promoSettings?.welcomePopup || {}), enabled: e.target.checked },
                              },
                            }))
                          }
                          className="w-5 h-5"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                      <button
                        onClick={() =>
                          setForm((prev: any) => ({
                            ...(prev || {}),
                            promoSettings: {
                              ...(prev?.promoSettings || {}),
                              welcomePopup: { ...(prev?.promoSettings?.welcomePopup || {}), type: "image" },
                            },
                          }))
                        }
                        className={`flex-1 py-3 rounded-lg text-xs font-black ${
                          welcome.type === "image" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Imagem
                      </button>
                      <button
                        onClick={() =>
                          setForm((prev: any) => ({
                            ...(prev || {}),
                            promoSettings: {
                              ...(prev?.promoSettings || {}),
                              welcomePopup: { ...(prev?.promoSettings?.welcomePopup || {}), type: "text" },
                            },
                          }))
                        }
                        className={`flex-1 py-3 rounded-lg text-xs font-black ${
                          welcome.type === "text" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Texto
                      </button>
                    </div>

                    {welcome.type === "image" ? (
                      <div className="flex flex-col">
                        <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                          IMAGEM DO POPUP
                        </label>

                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden hover:border-orange-500 transition-colors min-h-[220px]">
                          {welcome.imageUrl ? (
                            <img src={welcome.imageUrl} className="w-full h-full object-cover p-2" />
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
                            onChange={(e) => handleImageUpload("promoWelcomeImage", e.target.files?.[0] as File)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                          TEXTO DO POPUP
                        </label>
                        <textarea
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner h-40"
                          value={welcome.text || ""}
                          onChange={(e) =>
                            setForm((prev: any) => ({
                              ...(prev || {}),
                              promoSettings: {
                                ...(prev?.promoSettings || {}),
                                welcomePopup: { ...(prev?.promoSettings?.welcomePopup || {}), text: e.target.value },
                              },
                            }))
                          }
                          placeholder="Escreva a mensagem de boas-vindas..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- DESTAQUES ---------------- */}
          {activeTab === "destaques" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <Star size={18} className="text-orange-400" /> Carrossel de Destaques
                    </h4>
                    <p className="text-xs text-slate-500">Selecione os produtos que aparecem em destaque no topo do cardápio.</p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-xs font-bold text-slate-400">Ativar</span>
                    <input
                      type="checkbox"
                      checked={!!featured.active}
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...(prev || {}),
                          featuredSettings: { ...(prev?.featuredSettings || {}), active: e.target.checked },
                        }))
                      }
                      className="w-5 h-5"
                    />
                  </label>
                </div>

                <div className="mb-5">
                  <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                    TÍTULO DA SEÇÃO
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                    value={featured.title || ""}
                    onChange={(e) =>
                      setForm((prev: any) => ({
                        ...(prev || {}),
                        featuredSettings: { ...(prev?.featuredSettings || {}), title: e.target.value },
                      }))
                    }
                    placeholder="Ex: Destaques da Casa 🔥"
                  />
                </div>

                <div className="mb-4">
                  <label className="text-[10px] text-orange-400 font-bold uppercase mb-2 block tracking-wider">
                    SELECIONAR PRODUTOS ({(featured.productIds || []).length})
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-orange-500 shadow-inner"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Buscar produto..."
                  />
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">Nenhum produto encontrado.</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((p: any) => {
                        const checked = (featured.productIds || []).includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-950 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFeaturedProduct(p.id)}
                              className="w-5 h-5"
                            />
                            {p.imageUrl ? (
                              <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-slate-800" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                                <ImageIcon size={16} className="text-slate-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-white truncate">{p.name}</p>
                              <p className="text-xs text-slate-500">
                                {formatCurrency?.(p.price ?? 0) ?? `R$ ${(p.price ?? 0).toFixed(2)}`}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- PAGAMENTO ---------------- */}
          {activeTab === "pagamento" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" /> Pagamento (PIX)
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
                      CHAVE PIX
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 shadow-inner"
                      value={(form as any)?.pixKey || ""}
                      onChange={(e) => setForm({ ...(form as any), pixKey: e.target.value } as any)}
                      placeholder="Ex: CPF/CNPJ/Email/Chave aleatória"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
                      NOME DO TITULAR
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 shadow-inner"
                      value={(form as any)?.pixName || ""}
                      onChange={(e) => setForm({ ...(form as any), pixName: e.target.value } as any)}
                      placeholder="Ex: JhansBurgers"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
                      CIDADE DO TITULAR
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 shadow-inner"
                      value={(form as any)?.pixCity || ""}
                      onChange={(e) => setForm({ ...(form as any), pixCity: e.target.value } as any)}
                      placeholder="Ex: Juruti"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- ENTREGA ---------------- */}
          {activeTab === "entrega" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-orange-500 transition-colors w-full md:w-auto">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-800"
                      checked={!!(form as any)?.enableDeliveryFees}
                      onChange={(e) => setForm({ ...(form as any), enableDeliveryFees: e.target.checked } as any)}
                    />
                    <div>
                      <span className="text-sm font-bold text-white block">Ativar Taxas Automáticas</span>
                    </div>
                  </label>
                </div>

                {!!(form as any)?.enableDeliveryFees && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-inner">
                    <div className="flex flex-col gap-3 mb-4">
                      <input
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-orange-500 min-w-0"
                        placeholder="Nome do Bairro"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-orange-500 min-w-0"
                          placeholder="R$ Taxa"
                          value={newZoneFee}
                          onChange={(e) => setNewZoneFee(e.target.value)}
                        />
                        <button
                          onClick={handleAddZone}
                          className="bg-orange-600 hover:bg-orange-500 text-white w-12 h-12 rounded-lg transition-colors shadow-lg active:scale-95 shrink-0 flex items-center justify-center"
                        >
                          <PlusCircle size={24} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                      {(((form as any)?.deliveryZones || []) as any[]).map((zone: any, idx: number) => (
                        <div
                          key={`${zone.name}-${idx}`}
                          className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <span className="text-sm text-white font-medium">{zone.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-emerald-400 font-bold bg-emerald-900/20 px-2 py-1 rounded">
                              {formatCurrency(zone.fee)}
                            </span>
                            <button
                              onClick={() => handleRemoveZone(idx)}
                              className="text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(((form as any)?.deliveryZones || []) as any[]).length === 0 && (
                        <div className="text-center py-10 text-slate-500 text-sm">Nenhuma zona cadastrada.</div>
                      )}
                    </div>
                  </div>
                )}

                {!((form as any)?.enableDeliveryFees) && (
                  <div className="text-slate-500 text-sm flex items-center gap-2">
                    <Ban size={16} /> Taxas automáticas desativadas.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- HORÁRIOS ---------------- */}
          {activeTab === "horarios" && (
  <div className="animate-in fade-in h-full flex flex-col">
    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden mb-6 flex-1 flex flex-col">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Clock size={200} className="text-emerald-500" />
      </div>

      {/* Mensagem padrão de fechado (GLOBAL) */}
      <div className="relative z-10 mb-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
          Mensagem padrão quando fechado (global)
        </label>
        <input
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500"
          value={(form as any)?.closedMessageDefault || ""}
          onChange={(e) => setForm((prev: any) => ({ ...(prev || {}), closedMessageDefault: e.target.value }))}
          placeholder="Ex: Estamos fechados. Voltamos às 19:00."
        />
        <p className="text-[10px] text-slate-500 mt-2">
          Se um dia não tiver mensagem própria, essa será usada como fallback.
        </p>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar relative z-10">
        {days.map((day, idx) => {
          const schedule = normalizeScheduleShape((form as any)?.schedule)[idx];
          const isEnabled = !!schedule.enabled;
          const closedText = schedule.closedText ?? "";

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all duration-200 group ${
                isEnabled
                  ? "bg-slate-900/80 border-slate-700 hover:border-slate-600"
                  : "bg-slate-950/50 border-slate-800"
              }`}
            >
              {/* Cabeçalho do dia */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isEnabled}
                      onChange={(e) => handleDayEnabled(idx, e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                  </label>

                  <span className={`font-bold text-sm ${isEnabled ? "text-white" : "text-slate-500"}`}>{day}</span>
                </div>

                {/* Botão adicionar slot */}
                <button
                  type="button"
                  onClick={() => addSlot(idx)}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
                  title="Adicionar mais um horário no mesmo dia"
                >
                  + Horário
                </button>
              </div>

              {/* Slots do dia */}
              <div className="mt-3 space-y-2">
                {schedule.slots.map((slot, sIdx) => (
                  <div key={sIdx} className="flex flex-col sm:flex-row gap-2 items-center">
                    <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                      <input
                        type="time"
                        className="bg-transparent text-white font-bold text-xs outline-none text-center w-24"
                        value={slot.open}
                        onChange={(e) => handleSlotChange(idx, sIdx, "open", e.target.value)}
                        disabled={!isEnabled}
                      />
                      <span className="text-slate-600 font-bold text-[10px]">ATÉ</span>
                      <input
                        type="time"
                        className="bg-transparent text-white font-bold text-xs outline-none text-center w-24"
                        value={slot.close}
                        onChange={(e) => handleSlotChange(idx, sIdx, "close", e.target.value)}
                        disabled={!isEnabled}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSlot(idx, sIdx)}
                      className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                      title="Remover este horário"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {/* Mensagem detalhada de fechado */}
              {!isEnabled && (
                <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <label className="text-[10px] text-amber-400 font-bold uppercase mb-2 block tracking-wider">
                    Mensagem de fechado (opcional) — este dia
                  </label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 min-h-[80px]"
                    value={closedText}
                    onChange={(e) => handleClosedText(idx, e.target.value)}
                    placeholder={`Ex: Hoje não abrimos. Voltamos amanhã das ${schedule.slots?.[0]?.open || "19:00"} às ${schedule.slots?.[0]?.close || "23:00"}.`}
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Se ficar vazio, o sistema usa a mensagem global: <b>{(form as any)?.closedMessageDefault || "Estamos fechados no momento."}</b>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}


          {/* ---------------- LOCALIZAÇÃO ---------------- */}
          {activeTab === "localizacao" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-400" /> Localização
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
                      LATITUDE
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 shadow-inner"
                      value={(form as any)?.latitude || ""}
                      onChange={(e) => setForm({ ...(form as any), latitude: e.target.value } as any)}
                      placeholder="-23.55052"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block tracking-wider">
                      LONGITUDE
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 shadow-inner"
                      value={(form as any)?.longitude || ""}
                      onChange={(e) => setForm({ ...(form as any), longitude: e.target.value } as any)}
                      placeholder="-46.633308"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- SISTEMA ---------------- */}
          {activeTab === "sistema" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider flex items-center gap-2">
                      <DollarSign size={12} /> Pedido Mínimo (R$)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-purple-500 text-sm shadow-inner"
                      placeholder="0.00"
                      value={(form as any)?.minOrderValue ?? ""}
                      onChange={(e) =>
                        setForm({ ...(form as any), minOrderValue: parseFloat(e.target.value || "0") } as any)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider flex items-center gap-2">
                      <Timer size={12} /> Tempo Estimado (Texto)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-purple-500 text-sm shadow-inner"
                      placeholder="Ex: 40-45"
                      value={(form as any)?.estimatedTime || ""}
                      onChange={(e) => setForm({ ...(form as any), estimatedTime: e.target.value } as any)}
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Printer size={18} /> Impressora Térmica
                  </h4>

                  <div className="max-w-xs">
                    <label className="text-[10px] text-purple-400 font-bold uppercase mb-2 block tracking-wider">
                      LARGURA DO PAPEL
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-purple-500 text-sm shadow-inner"
                      value={(form as any)?.printerWidth || "80mm"}
                      onChange={(e) => setForm({ ...(form as any), printerWidth: e.target.value } as any)}
                    >
                      <option value="80mm">80mm (Padrão)</option>
                      <option value="58mm">58mm (Mini)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-500" /> Segurança & Backup
                  </h4>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Baixe um backup de todas as configurações para segurança.</p>
                      <p className="text-[10px] text-slate-500">Útil para restaurar manualmente se precisar.</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={downloadBackup}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Download size={14} /> Baixar Config
                      </button>

                      <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer">
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

        {/* Footer Save */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 shrink-0">
          <button
            onClick={handleSaveClick}
            className="w-full bg-[#009e60] hover:bg-[#00804d] text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide"
          >
            <Download size={18} /> SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>
    </div>
  );
}
