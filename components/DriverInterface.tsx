import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    LogOut, History, MapPin, Navigation, MessageCircle, 
    CheckSquare, CheckCircle2, ClipboardList, Wallet, Package, 
    Trash2, MinusCircle, TrendingUp, Radio, Signal, RefreshCw, 
    Store, Clock, Sun, Moon, Map, Navigation2, Lock, Power,
    ChevronLeft, MoreVertical, Home, User, AlertTriangle, Camera, ChevronRight, Ban, ImagePlus, Eye, EyeOff
} from 'lucide-react';
import { Driver, Order, Vale, DriverOffer } from '../types';
import { isToday, formatTime, formatCurrency, formatOrderId } from '../utils';
import { serverTimestamp } from 'firebase/firestore';

interface DriverAppProps {
    driver: Driver;
    orders: Order[];
    unassignedOrders?: Order[];
    offers?: DriverOffer[];
    vales?: Vale[]; 
    onToggleStatus: () => void;
    onAcceptOrder: (id: string) => void;
    onAcceptOffer?: (orderId: string) => void;
    onPickupOrder: (orderId: string, input: string, correct: string) => void;
    onCompleteOrder: (oid: string, input: string, correct: string) => void;
    onUpdateOrder: (id: string, data: any) => void;
    onDeleteOrder: (id: string) => void;
    onLogout: () => void;
    onUpdateDriver: (id: string, data: any) => void;
}

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; 
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; 
const GPS_CONFIG = { MIN_DISTANCE_METERS: 0, MIN_TIME_MS: 1000, MAX_AGE_MS: 5000, TIMEOUT_MS: 10000 };

const compressImageNative = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const MAX_SIZE = 800;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lng2-lng1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const SwipeButton = ({ text, onConfirm, colorClass, icon: Icon }: any) => {
    const [sliderX, setSliderX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const handleStart = () => setIsDragging(true);
    const handleMove = (clientX: number) => {
        if (!isDragging || !containerRef.current || !sliderRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxWalk = containerRect.width - sliderRef.current.getBoundingClientRect().width - 8; 
        let walk = clientX - containerRect.left - (sliderRef.current.getBoundingClientRect().width / 2);
        walk = Math.max(0, Math.min(walk, maxWalk));
        setSliderX(walk);
        if (walk >= maxWalk * 0.95) { setIsDragging(false); setSliderX(maxWalk); onConfirm(); }
    };
    const handleEnd = () => { setIsDragging(false); setSliderX(0); };
    return (
        <div ref={containerRef} className={`relative w-full h-14 rounded-full overflow-hidden flex items-center shadow-lg select-none ${colorClass}`} onMouseLeave={handleEnd} onMouseUp={handleEnd} onMouseMove={(e) => handleMove(e.clientX)} onTouchMove={(e) => handleMove(e.touches[0].clientX)} onTouchEnd={handleEnd}>
            <div className="absolute w-full text-center font-black text-[10px] uppercase tracking-widest pointer-events-none opacity-90">{text}</div>
            <div ref={sliderRef} className="absolute left-1.5 h-11 w-16 bg-white rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-transform" style={{ transform: `translateX(${sliderX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }} onMouseDown={handleStart} onTouchStart={handleStart}>
                {Icon ? <Icon size={20} className="text-slate-800" /> : <ChevronRight size={24} className="text-slate-800" strokeWidth={3} />}
            </div>
        </div>
    );
};

const ModernLoader = ({ title = "Processando", subtitle = "Aguarde...", isFullScreen = true }) => {
    const content = (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full border-t-[4px] border-b-[4px] border-[#3b82f6] animate-[spin_1.5s_linear_infinite] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                <div className="bg-slate-900 rounded-full p-4 animate-pulse"><Package className="text-white" size={32} /></div>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">{title}</h2>
            <p className="text-slate-400 text-xs mt-3 px-8">{subtitle}</p>
        </div>
    );
    return isFullScreen ? <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center">{content}</div> : content;
};

export default function DriverInterface({ driver, orders, unassignedOrders = [], offers = [], vales = [], onToggleStatus, onAcceptOrder, onAcceptOffer, onPickupOrder, onCompleteOrder, onUpdateOrder, onDeleteOrder, onLogout, onUpdateDriver }: DriverAppProps) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('driverTheme') !== 'light');
  const toggleTheme = () => setIsDark(prev => { const next = !prev; localStorage.setItem('driverTheme', next ? 'dark' : 'light'); return next; });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'wallet'>('home');
  const [deliveryPhotos, setDeliveryPhotos] = useState<{[key: string]: string}>({});
  const [gpsActive, setGpsActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [displayLocation, setDisplayLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, heading: number} | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // HANDLERS UPLOAD
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingPhoto(true);
      setTimeout(async () => {
          try {
              const base64 = await compressImageNative(file);
              setDeliveryPhotos(prev => ({...prev, [orderId]: base64}));
              await onUpdateOrder(orderId, { photoProof: base64 });
              alert("Foto enviada!");
          } catch (err) { alert("Erro na imagem."); }
          finally { setIsUploadingPhoto(false); if(e.target) e.target.value = ''; }
      }, 100);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingPhoto(true);
      setTimeout(async () => {
          try {
              const base64 = await compressImageNative(file);
              await onUpdateDriver(driver.id, { [fieldName]: base64 });
              alert("Documento atualizado!");
          } catch (err) { alert("Erro no documento."); }
          finally { setIsUploadingPhoto(false); if(e.target) e.target.value = ''; }
      }, 50);
  };

  useEffect(() => {
      if (driver.status !== 'offline') {
          watchIdRef.current = navigator.geolocation.watchPosition(
              (pos) => {
                  const { latitude, longitude, heading } = pos.coords;
                  setDisplayLocation({ lat: latitude, lng: longitude });
                  setCurrentLocation({ lat: latitude, lng: longitude, heading: heading || 0 });
                  onUpdateDriver(driver.id, { lat: latitude, lng: longitude, heading: heading || 0, lastUpdate: serverTimestamp() });
                  setGpsActive(true);
              },
              () => setGpsActive(false),
              { enableHighAccuracy: true }
          );
      }
      return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [driver.status]);

  const activeOrder = useMemo(() => orders.find(o => o.driverId === driver.id && o.status !== 'completed'), [orders, driver.id]);
  
  const bgMain = isDark ? "bg-[#121212]" : "bg-[#f2f2f7]";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const glassPanel = isDark ? "bg-[#1c1c1e] border border-white/5 shadow-2xl" : "bg-white border border-black/5 shadow-2xl";
  const mapFilter = isDark ? 'invert(95%) hue-rotate(180deg) brightness(85%)' : 'brightness(0.9)';

  const DocumentListItem = ({ id, label, isSent, onChange }: any) => (
      <div className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
          <span className="text-[11px] font-bold uppercase opacity-60">{label}</span>
          <div className="flex items-center gap-2">
              {isSent && <CheckCircle2 size={14} className="text-emerald-500" />}
              <label htmlFor={id} className="text-[10px] font-bold px-3 py-1.5 bg-blue-500 text-white rounded-md cursor-pointer active:scale-95 transition-transform">
                  {isSent ? 'Trocar' : 'Enviar'}
              </label>
              <input id={id} type="file" accept="image/*" className="hidden" onChange={onChange} />
          </div>
      </div>
  );

  return (
    <div className={`fixed inset-0 w-screen h-screen flex flex-col ${bgMain} overflow-hidden font-sans`}>
      {isUploadingPhoto && <ModernLoader title="Enviando" subtitle="Sincronizando com servidor..." />}

      {/* BACKGROUND MAPA (SOMENTE NA HOME) */}
      {activeTab === 'home' && (
          <div className="absolute inset-0 z-0 bg-black pointer-events-none overflow-hidden">
              {displayLocation ? (
                  <>
                      <iframe 
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${displayLocation.lng-0.002},${displayLocation.lat-0.002},${displayLocation.lng+0.002},${displayLocation.lat+0.002}&layer=mapnik`}
                          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                          style={{ filter: mapFilter, transform: 'scale(1.5)' }}
                      ></iframe>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black z-10"></div>
                      
                      {/* BÚSSOLA */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                          <div 
                              className="w-16 h-16 bg-blue-500 rounded-full border-4 border-white shadow-[0_0_30px_rgba(59,130,246,0.8)] flex items-center justify-center transition-transform duration-500"
                              style={{ transform: `rotate(${currentLocation?.heading || 0}deg)` }}
                          >
                              <Navigation2 size={32} fill="white" className="text-white" />
                          </div>
                      </div>
                  </>
              ) : (
                  <div className="flex items-center justify-center h-full text-slate-700 font-bold uppercase tracking-widest text-xs animate-pulse">Buscando Sinal GPS...</div>
              )}
          </div>
      )}

      {/* HEADER */}
      <div className="pt-4 px-6 pb-4 flex justify-between items-center z-10 pointer-events-auto shrink-0">
          <div className="flex items-center gap-3">
              <label htmlFor="header-up" className="cursor-pointer">
                  <img src={driver.avatar || DEFAULT_AVATAR} className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover" />
                  <input id="header-up" type="file" accept="image/*" className="hidden" onChange={(e) => handleDocumentUpload(e, 'avatar')} />
              </label>
              <div>
                  <h2 className={`text-lg font-black ${textPrimary}`}>{driver.name}</h2>
                  <div className={`text-[9px] font-bold uppercase ${gpsActive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {gpsActive ? '● GPS Online' : '○ GPS Offline'}
                  </div>
              </div>
          </div>
          <button onClick={toggleTheme} className="p-3 rounded-full bg-white/5 border border-white/10 text-amber-400 backdrop-blur-md">
              {isDark ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
      </div>

      {/* CONTEUDO */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 pointer-events-auto z-10">
          {activeTab === 'home' && (
              <div className="max-w-md mx-auto mt-[40vh]">
                  {activeOrder ? (
                      <div className={`p-6 rounded-[2.5rem] ${glassPanel} space-y-6 shadow-2xl animate-in slide-in-from-bottom-10`}>
                          <div className="flex justify-between items-start">
                              <div>
                                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Entrega Ativa</span>
                                  <h3 className={`text-2xl font-black ${textPrimary}`}>#{activeOrder.id.slice(-5)}</h3>
                              </div>
                              <div className="text-right">
                                  <p className="text-2xl font-black text-emerald-500">{formatCurrency(activeOrder.value)}</p>
                              </div>
                          </div>

                          {activeOrder.status === 'delivering' && (
                              <label htmlFor="order-photo-up" className="w-full py-4 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs uppercase cursor-pointer active:scale-95 transition-all shadow-lg">
                                  <ImagePlus size={20}/> 
                                  {deliveryPhotos[activeOrder.id] || activeOrder.photoProof ? 'Foto Anexada' : 'Foto da Galeria'}
                                  <input id="order-photo-up" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, activeOrder.id)} />
                              </label>
                          )}

                          <SwipeButton 
                              text={activeOrder.status === 'assigned' ? "Deslize para Aceitar" : "Deslize para Finalizar"} 
                              colorClass={activeOrder.status === 'assigned' ? "bg-blue-600" : "bg-emerald-600"} 
                              onConfirm={() => activeOrder.status === 'assigned' ? onAcceptOrder(activeOrder.id) : onCompleteOrder(activeOrder.id, '', '')} 
                          />
                      </div>
                  ) : (
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md text-center">
                          <p className="text-white text-xs font-bold uppercase tracking-widest">Aguardando novos pedidos...</p>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'wallet' && (
              <div className="max-w-md mx-auto space-y-4">
                  <div className={`p-8 rounded-[2.5rem] ${glassPanel} text-center`}>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo</span>
                      <h2 className={`text-4xl font-black mt-2 ${textPrimary}`}>{formatCurrency(150.00)}</h2>
                  </div>
                  
                  <div className={`p-6 rounded-[2.5rem] ${glassPanel} space-y-3`}>
                      <h3 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Documentação</h3>
                      <DocumentListItem id="wallet-selfie" label="Minha Selfie" isSent={!!driver.avatar} onChange={(e:any) => handleDocumentUpload(e, 'avatar')} />
                      <DocumentListItem id="wallet-front" label="CNH (Frente)" isSent={!!driver.documentFront} onChange={(e:any) => handleDocumentUpload(e, 'documentFront')} />
                      <DocumentListItem id="wallet-back" label="CNH (Verso)" isSent={!!driver.documentBack} onChange={(e:any) => handleDocumentUpload(e, 'documentBack')} />
                  </div>
              </div>
          )}
      </div>

      {/* NAVBAR */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50 pointer-events-auto">
          <div className={`rounded-full p-2 flex justify-between items-center ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-black/5'} backdrop-blur-2xl border shadow-2xl`}>
              <button onClick={() => setActiveTab('home')} className={`flex-1 py-3 flex justify-center rounded-full transition-all ${activeTab === 'home' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Package size={22}/></button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 flex justify-center rounded-full transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Clock size={22}/></button>
              <button onClick={() => setActiveTab('wallet')} className={`flex-1 py-3 flex justify-center rounded-full transition-all ${activeTab === 'wallet' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Wallet size={22}/></button>
              <button onClick={onToggleStatus} className={`flex-1 py-3 flex justify-center rounded-full transition-all ${driver.status === 'offline' ? 'text-red-500' : 'text-emerald-500'}`}><Power size={22}/></button>
          </div>
      </div>
    </div>
  );
}