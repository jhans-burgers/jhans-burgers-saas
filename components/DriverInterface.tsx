import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    LogOut, History, MapPin, Navigation, MessageCircle, 
    CheckSquare, CheckCircle2, ClipboardList, Wallet, Package, 
    Trash2, MinusCircle, TrendingUp, Radio, Signal, RefreshCw, 
    Store, Clock, Sun, Moon, Map, Navigation2, Lock, Power,
    ChevronLeft, MoreVertical, Home, User, AlertTriangle, Camera, ChevronRight, Ban, ImagePlus, Eye, EyeOff
} from 'lucide-react';
import { Driver, Order, Vale, DriverOffer } from '../types';
import { isToday, formatTime, formatCurrency, compressImage, formatOrderId } from '../utils';
import { Footer } from './Shared';
import { EditOrderModal, GenericConfirmModal } from './Modals';
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

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const getCardinalDirection = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
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

        if (walk >= maxWalk * 0.95) {
            setIsDragging(false);
            setSliderX(maxWalk);
            onConfirm();
        }
    };
    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        setSliderX(0); 
    };

    return (
        <div 
            ref={containerRef}
            className={`relative w-full h-14 rounded-full overflow-hidden flex items-center shadow-lg select-none ${colorClass}`}
            onMouseLeave={handleEnd}
            onMouseUp={handleEnd}
            onMouseMove={(e) => handleMove(e.clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
        >
            <div className="absolute w-full text-center font-black text-xs uppercase tracking-widest pointer-events-none opacity-90">
                {text}
            </div>
            <div 
                ref={sliderRef}
                className="absolute left-1.5 h-11 w-16 bg-white rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-transform"
                style={{ transform: `translateX(${sliderX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
            >
                {Icon ? <Icon size={20} className="text-slate-800" /> : <ChevronRight size={24} className="text-slate-800" strokeWidth={3} />}
            </div>
        </div>
    );
};

export default function DriverInterface({ driver, orders, unassignedOrders = [], offers = [], vales = [], onToggleStatus, onAcceptOrder, onAcceptOffer, onPickupOrder, onCompleteOrder, onUpdateOrder, onDeleteOrder, onLogout, onUpdateDriver }: DriverAppProps) {
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem('driverTheme') !== 'light');
  const toggleTheme = () => setIsDark(prev => { const next = !prev; localStorage.setItem('driverTheme', next ? 'dark' : 'light'); return next; });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'wallet'>('home');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'all'>('today');
  const [visibleItems, setVisibleItems] = useState(20);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  const [storeCodes, setStoreCodes] = useState<{[key: string]: string}>({});
  const [clientCodes, setClientCodes] = useState<{[key: string]: string}>({});
  const [deliveryPhotos, setDeliveryPhotos] = useState<{[key: string]: string}>({});
  const [showSOSModal, setShowSOSModal] = useState<string | null>(null);

  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // ✅ ESTADO PARA MOSTRAR/OCULTAR VALORES NO APP
  const [showValues, setShowValues] = useState(false);
  
  const [isMutedTemporary, setIsMutedTemporary] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, speed: number, heading: number} | null>(null);
  const [displayLocation, setDisplayLocation] = useState<{lat: number, lng: number} | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);

  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{lat: number, lng: number, time: number} | null>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docFrontInputRef = useRef<HTMLInputElement>(null);
  const docBackInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopNotificationSound = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };

  const handleAcceptOrderWithMute = (orderId: string) => {
      setIsMutedTemporary(true); stopNotificationSound(); onAcceptOrder(orderId);
      setTimeout(() => setIsMutedTemporary(false), 2000);
  };

  const handleAcceptOfferWithMute = (orderId: string) => {
      setIsMutedTemporary(true); stopNotificationSound(); if(onAcceptOffer) onAcceptOffer(orderId);
      setTimeout(() => setIsMutedTemporary(false), 2000);
  };

  const keepScreenOn = async () => {
      if ('wakeLock' in navigator) { try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err: any) {} }
  };

  const processPosition = async (position: GeolocationPosition) => {
      const { latitude, longitude, speed, heading } = position.coords;
      const currentTime = Date.now();
      let shouldSend = false;

      setCurrentLocation({ lat: latitude, lng: longitude, speed: speed || 0, heading: heading || 0 });

      if (!lastPositionRef.current) { 
          shouldSend = true; setDisplayLocation({ lat: latitude, lng: longitude });
      } else {
          const timeDiff = currentTime - lastPositionRef.current.time;
          const distDiff = getDistance(lastPositionRef.current.lat, lastPositionRef.current.lng, latitude, longitude);
          if (timeDiff >= GPS_CONFIG.MIN_TIME_MS || distDiff >= GPS_CONFIG.MIN_DISTANCE_METERS) shouldSend = true; 
          if (distDiff > 10) setDisplayLocation({ lat: latitude, lng: longitude });
      }

      if (shouldSend) {
          setIsSending(true);
          try {
              lastPositionRef.current = { lat: latitude, lng: longitude, time: currentTime };
              await onUpdateDriver(driver.id, { lat: latitude, lng: longitude, heading: heading || 0, speed: speed || 0, lastUpdate: serverTimestamp() });
              setGpsError(''); setGpsActive(true);
          } catch (error) {} finally { setIsSending(false); }
      } else { setGpsActive(true); }
  };

  const startTracking = () => {
      setGpsError(''); keepScreenOn();
      if ('geolocation' in navigator) {
          if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = navigator.geolocation.watchPosition(
              processPosition,
              (error) => { setGpsActive(false); setGpsError(error.code === 1 ? "Permissão negada." : "Buscando sinal..."); },
              { enableHighAccuracy: true, timeout: GPS_CONFIG.TIMEOUT_MS, maximumAge: 0 }
          );
      } else { setGpsError("Celular não suporta GPS."); }
  };

  const stopTracking = () => {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (wakeLockRef.current) { wakeLockRef.current.release().then(() => wakeLockRef.current = null); }
      setGpsActive(false); setCurrentLocation(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploadingPhoto(true);
          setTimeout(async () => {
              try { 
                  const compressed = await compressImage(file); 
                  await onUpdateDriver(driver.id, { avatar: compressed }); 
                  alert("Selfie atualizada com sucesso!");
              } catch (err: any) { 
                  alert("A imagem ficou pesada ou com erro. Tire a foto novamente."); 
              } finally {
                  setIsUploadingPhoto(false);
                  if (avatarInputRef.current) avatarInputRef.current.value = '';
              }
          }, 150);
      }
  };

  const handleDocFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploadingPhoto(true);
          setTimeout(async () => {
              try { 
                  const compressed = await compressImage(file); 
                  await onUpdateDriver(driver.id, { documentFront: compressed });
                  alert("Frente do documento enviada!");
              } catch (err: any) { 
                  alert("A foto ficou muito pesada. Tire a foto de um pouco mais longe."); 
              } finally {
                  setIsUploadingPhoto(false);
                  if (docFrontInputRef.current) docFrontInputRef.current.value = '';
              }
          }, 150);
      }
  };

  const handleDocBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploadingPhoto(true);
          setTimeout(async () => {
              try { 
                  const compressed = await compressImage(file); 
                  await onUpdateDriver(driver.id, { documentBack: compressed });
                  alert("Verso do documento enviado!");
              } catch (err: any) { 
                  alert("A foto ficou muito pesada. Tire a foto de um pouco mais longe."); 
              } finally {
                  setIsUploadingPhoto(false);
                  if (docBackInputRef.current) docBackInputRef.current.value = '';
              }
          }, 150);
      }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploadingPhoto(true);
          setTimeout(async () => {
              try { 
                  const compressed = await compressImage(file); 
                  setDeliveryPhotos(prev => ({...prev, [orderId]: compressed}));
                  await onUpdateOrder(orderId, { photoProof: compressed });
                  alert("Foto anexada com sucesso!");
              } catch (err: any) { 
                  alert("Erro ao processar imagem da entrega."); 
              } finally {
                  setIsUploadingPhoto(false);
                  if (photoInputRef.current) photoInputRef.current.value = '';
              }
          }, 150);
      }
  };

  const handleReportIssue = (orderId: string, issue: string) => {
      onUpdateOrder(orderId, { routeIssue: issue, issueReportedAt: serverTimestamp() });
      setShowSOSModal(null);
      alert(`Alerta enviado à loja: ${issue}`);
  };

  useEffect(() => {
      const handleVisibilityChange = () => { if (document.visibilityState === 'visible' && driver.status !== 'offline') keepScreenOn(); };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [driver.status]);

  useEffect(() => {
      if (driver.status === 'offline') stopTracking(); else startTracking();
      return () => stopTracking();
  }, [driver.status]);

  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.loop = true; audioRef.current = audio;
  }, []);

  const todaysOrders = useMemo(() => {
     return orders.filter((o: Order) => o.driverId === driver.id && (o.status === 'assigned' || o.status === 'accepted' || o.status === 'delivering' || (o.status === 'completed' && isToday(o.completedAt))))
     .sort((a, b) => {
         if (a.status !== 'completed' && b.status === 'completed') return -1;
         if (a.status === 'completed' && b.status !== 'completed') return 1;
         return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
     });
  }, [orders, driver.id]);

  const activeOrder = useMemo(() => todaysOrders.find(o => o.status !== 'completed'), [todaysOrders]);

  const visibleUnassignedOrders = useMemo(() => {
      if (!unassignedOrders || unassignedOrders.length === 0) return [];
      return unassignedOrders.filter(o => {
          if (o.driverId && o.driverId.trim() !== "") return false;
          if (driver.status === 'available') return true; 
          let createdAtMs = now;
          if (o.createdAt) {
              if (o.createdAt.seconds) createdAtMs = o.createdAt.seconds * 1000;
              else if (typeof o.createdAt.toMillis === 'function') createdAtMs = o.createdAt.toMillis();
              else if (o.createdAt instanceof Date) createdAtMs = o.createdAt.getTime();
              else if (typeof o.createdAt === 'number') createdAtMs = o.createdAt;
          }
          return (now - createdAtMs) >= 60000; 
      });
  }, [unassignedOrders, driver.status, now]);
  
  const hasIncoming = (offers.length > 0 || visibleUnassignedOrders.length > 0);

  useEffect(() => {
      const incoming = orders.some(o => o.driverId === driver.id && o.status === 'assigned') || hasIncoming;
      if (incoming && driver.status !== 'offline' && !isMutedTemporary && driver.isActive !== false) {
          const playPromise = audioRef.current?.play();
          if (playPromise !== undefined) playPromise.catch(e => console.warn("Audio bloqueado", e));
          if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      } else { stopNotificationSound(); }
  }, [orders, offers, visibleUnassignedOrders, driver.id, driver.status, isMutedTemporary, hasIncoming, driver.isActive]);

  const allDeliveries = useMemo(() => orders.filter((o: Order) => o.status === 'completed' && o.driverId === driver.id).sort((a: Order, b: Order) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0)), [orders, driver.id]);

  const calculateDriverFee = (orderVal: number) => {
      if (driver.paymentModel === 'percentage') return orderVal * ((driver.paymentRate || 0) / 100);
      else if (driver.paymentModel === 'salary') return 0;
      else return driver.paymentRate !== undefined ? driver.paymentRate : 5.00;
  };

  const financialData = useMemo(() => {
      const lastSettlementTime = driver.lastSettlementAt?.seconds || 0;
      const currentDeliveries = orders.filter((o: Order) => o.status === 'completed' && o.driverId === driver.id && (o.completedAt?.seconds || 0) > lastSettlementTime);
      const currentVales = vales.filter((v: Vale) => v.driverId === driver.id && (v.createdAt?.seconds || 0) > lastSettlementTime);
      
      let totalDeliveriesValue = currentDeliveries.reduce((acc, o) => acc + calculateDriverFee(o.value || 0), 0);
      const totalValesValue = currentVales.reduce((acc, v) => acc + (Number(v.amount) || 0), 0);
      
      return { deliveriesCount: currentDeliveries.length, deliveriesValue: totalDeliveriesValue, valesCount: currentVales.length, valesValue: totalValesValue, netValue: totalDeliveriesValue - totalValesValue, valesList: currentVales };
  }, [orders, vales, driver]);

  const displayedHistory = useMemo(() => historyFilter === 'today' ? allDeliveries.filter((o: Order) => isToday(o.completedAt)) : allDeliveries, [allDeliveries, historyFilter]);

  const historySummary = useMemo(() => {
      const count = displayedHistory.length;
      let total = displayedHistory.reduce((acc, o) => acc + calculateDriverFee(o.value || 0), 0);
      return { count, total };
  }, [displayedHistory, driver]);

  const getSimulatedDistance = (id: string) => {
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const km = ((hash % 80) + 10) / 10;
      const min = Math.ceil(km * 4); 
      return { km: km.toFixed(1), min };
  };

  const getStoreName = (o: any) => {
      if (o.storeName && o.storeName.trim() !== '') return o.storeName;
      if (o.slug && o.slug.trim() !== '') return String(o.slug).replace(/-/g, ' ');
      return "JHAN'S BURGERS";
  };

  const speedKmh = (currentLocation?.speed || 0) * 3.6;
  const cardinalDir = getCardinalDirection(currentLocation?.heading || 0);

  const bgMain = isDark ? "bg-[#121212]" : "bg-[#f2f2f7]"; 
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-[#a1a1aa]" : "text-[#71717a]";
  
  const glassPanel = isDark 
      ? "bg-[#1c1c1e] border border-white/5 shadow-2xl" 
      : "bg-white border border-black/5 shadow-2xl";

  const inputBg = isDark ? 'bg-black/50 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-100 border-black/10 text-slate-900 placeholder:text-slate-400';

  const mapFilter = isDark 
      ? 'invert(95%) hue-rotate(180deg) brightness(85%) contrast(120%) grayscale(20%) sepia(5%)' 
      : 'contrast(1.3) brightness(0.9) saturate(1.4)'; 

  // =================================================================================
  // ✅ COMPONENTE INTERNO: ITEM DA LISTA DE DOCUMENTOS (Layout Moderno)
  // =================================================================================
  const DocumentListItem = ({ label, isSent, onClick }: { label: string, isSent: boolean, onClick: () => void }) => (
      <div className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>{label}</span>
          <div className="flex items-center gap-3">
              {isSent ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md"><CheckCircle2 size={12}/> Enviado</span>
              ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-500/10 px-2 py-1 rounded-md">Pendente</span>
              )}
              <button onClick={onClick} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-800'}`}>
                  {isSent ? 'Reenviar' : 'Enviar'}
              </button>
          </div>
      </div>
  );

  const DocumentPanelModern = () => (
      <div className={`w-full p-5 rounded-[1.5rem] border flex flex-col gap-2 pointer-events-auto ${glassPanel}`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${textSecondary}`}>Meus Documentos</h3>
          <DocumentListItem label="Selfie" isSent={!!driver.avatar} onClick={() => avatarInputRef.current?.click()} />
          <DocumentListItem label="Doc Frente" isSent={!!(driver.documentFront || driver.documentPhoto)} onClick={() => docFrontInputRef.current?.click()} />
          <DocumentListItem label="Doc Verso" isSent={!!driver.documentBack} onClick={() => docBackInputRef.current?.click()} />
          
          <input type="file" accept="image/*" capture="user" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={docFrontInputRef} onChange={handleDocFrontUpload} />
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={docBackInputRef} onChange={handleDocBackUpload} />
      </div>
  );

  return (
    <div className={`fixed inset-0 w-screen h-screen flex flex-col font-sans transition-colors duration-300 ${bgMain} overflow-hidden`}>
      
      {isUploadingPhoto && (
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto">
              <RefreshCw className="animate-spin text-[#3b82f6] mb-5" size={56}/>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center">Enviando Imagem</h2>
              <p className="text-slate-400 text-sm mt-3 text-center px-8">Processando e salvando no sistema.<br/>Por favor, aguarde.</p>
          </div>
      )}

      {driver.isActive === false ? (
          
          <div className="relative z-[500] flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto w-full h-full pointer-events-auto">
              <div className="w-24 h-24 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse mt-10">
                  <Ban className="text-red-500" size={48}/>
              </div>
              <h2 className={`text-3xl font-black uppercase tracking-widest ${textPrimary}`}>Conta Suspensa</h2>
              <p className={`text-sm mt-3 mb-8 max-w-xs leading-relaxed ${textSecondary}`}>
                  Sua conta está inativa no momento. Procure o responsável da loja para regularizar seu acesso.
              </p>
              
              <div className="w-full max-w-sm mb-8">
                  <DocumentPanelModern />
              </div>

              <button onClick={() => setShowLogoutConfirm(true)} className="mb-10 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform w-full max-w-xs">
                  <LogOut size={18}/> Sair do Aplicativo
              </button>

              {showLogoutConfirm && (
                  <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                      <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center border ${isDark ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-slate-200'}`}>
                          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <LogOut size={32} className="text-red-500" />
                          </div>
                          <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Sair do Aplicativo?</h2>
                          <p className={`text-sm mb-6 ${textSecondary}`}>Tem certeza que deseja desconectar da sua conta?</p>
                          <div className="flex w-full gap-3">
                              <button onClick={() => setShowLogoutConfirm(false)} className={`flex-1 font-bold py-3.5 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancelar</button>
                              <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">Sim, Sair</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>

      ) : driver.status !== 'offline' && !gpsActive && !gpsError ? (
          
          <div className="relative z-[100] flex-1 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
              <RefreshCw className="animate-spin text-[#3b82f6] mb-4" size={48}/>
              <h2 className={`text-xl font-semibold ${textPrimary}`}>Conectando ao Satélite...</h2>
              <p className={`text-sm mt-2 ${textSecondary}`}>Buscando sinal GPS para navegação.</p>
              <button onClick={() => { onToggleStatus(); stopTracking(); }} className={`mt-8 px-6 py-3 rounded-full font-medium transition-colors ${glassPanel} ${textPrimary} hover:opacity-80`}>Cancelar e ficar Offline</button>
          </div>

      ) : (

          <>
              {activeTab === 'home' && (
                  <div className="absolute inset-0 z-0 bg-black pointer-events-none overflow-hidden">
                      {driver.status !== 'offline' && displayLocation ? (
                          <>
                              <iframe 
                                  frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0}
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${displayLocation.lng-0.0015},${displayLocation.lat-0.0015},${displayLocation.lng+0.0015},${displayLocation.lat+0.0015}&layer=mapnik`}
                                  style={{ border: 0, filter: mapFilter, width: 'calc(100% + 150px)', height: 'calc(100% + 150px)' }}
                                  className="absolute -top-[75px] -left-[75px] max-w-none pointer-events-none" 
                              ></iframe>
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.5)_100%)] z-10 pointer-events-none"></div>
                              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center pointer-events-none">
                                  <div className="absolute -top-24 w-48 h-32 bg-gradient-to-b from-transparent to-blue-500/20 opacity-70" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                                  <div className="relative z-10 w-14 h-14 bg-gradient-to-b from-slate-800 to-black rounded-full border-[3px] border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.9)] flex items-center justify-center transition-transform duration-700 ease-out" style={{ transform: `rotate(${currentLocation?.heading ? currentLocation.heading : 0}deg)` }}>
                                      <div style={{ transform: 'rotate(-45deg)' }}>
                                          <Navigation2 size={28} fill="#60A5FA" className="text-blue-200" strokeWidth={1} />
                                      </div>
                                  </div>
                              </div>
                          </>
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 text-sm font-bold uppercase tracking-widest z-10">
                              {driver.status === 'offline' ? 'Você está Offline' : 'Aguardando Satélite...'}
                          </div>
                      )}
                  </div>
              )}

              <div className={`relative z-20 flex flex-col h-full pointer-events-none ${activeTab !== 'home' ? bgMain : ''}`}>
                  
                  <div className="pt-4 px-6 pb-4 flex justify-between items-center z-10 shrink-0 pointer-events-auto">
                    <div className="flex items-center gap-3">
                      <div className="relative cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                          <img src={driver.avatar || DEFAULT_AVATAR} className={`w-12 h-12 rounded-full object-cover shadow-lg border ${isDark ? 'border-white/10' : 'border-black/5'}`} alt="Motorista" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                      </div>
                      <div className="flex flex-col items-start gap-1">
                          <h2 className={`text-xl font-black leading-none tracking-tight drop-shadow-md ${textPrimary}`}>{driver.name || "Motorista"}</h2>
                          {driver.status !== 'offline' ? (
                              <div className="bg-emerald-500/10 text-[#34d399] px-2 py-0.5 rounded text-[9px] font-black tracking-widest border border-emerald-500/30 uppercase shadow-md flex items-center gap-1">
                                  <Signal size={8} /> GPS ATIVO
                              </div>
                          ) : (
                              <div className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-[9px] font-black tracking-widest border border-slate-500/30 uppercase shadow-md">
                                  OFFLINE
                              </div>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors shadow-lg ${isDark ? 'text-amber-400 bg-white/5 border border-white/10' : 'text-amber-500 bg-white border border-slate-200'}`}>
                            {isDark ? <Sun size={20} strokeWidth={2}/> : <Moon size={20} strokeWidth={2}/>}
                        </button>
                        <button onClick={() => setShowLogoutConfirm(true)} className={`p-2 rounded-full transition-colors shadow-lg ${isDark ? 'text-red-400 bg-white/5 border border-white/10' : 'text-red-500 bg-white border border-slate-200'}`}>
                            <LogOut size={20} strokeWidth={2}/>
                        </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col px-4 pb-[140px] overflow-y-auto no-scrollbar pt-20 pointer-events-auto">
                    <style>{`
                      .no-scrollbar::-webkit-scrollbar { display: none; }
                      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                    
                    {/* ABA PRINCIPAL (HOME) */}
                    {activeTab === 'home' && (
                      <div className="flex flex-col w-full max-w-md mx-auto relative pointer-events-none">
                          <div className="h-[calc(100vh-260px)] min-h-[400px] w-full relative shrink-0">
                              {driver.status !== 'offline' && displayLocation && (
                                  <div className="absolute right-0 bottom-4 flex flex-col items-end gap-2 z-30 pointer-events-none">
                                      <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border shadow-sm backdrop-blur-md min-w-[48px] ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
                                          <span className={`text-base font-black leading-none drop-shadow-md ${textPrimary}`}>{speedKmh.toFixed(0)}</span>
                                          <span className={`text-[7px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>km/h</span>
                                      </div>
                                      <div className={`flex flex-col items-center justify-center p-1.5 rounded-lg border shadow-sm backdrop-blur-md min-w-[48px] ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
                                          <span className={`text-base font-black leading-none drop-shadow-md ${textPrimary}`}>{cardinalDir}</span>
                                          <span className={`text-[7px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>Dir</span>
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="w-full pointer-events-auto pb-6">
                              {activeOrder ? (
                                  <div className={`p-5 rounded-[2rem] border relative w-full ${glassPanel}`}>
                                      <div className="flex justify-between items-start mb-5">
                                          <div className="flex flex-col gap-3 flex-1 min-w-0 pr-4">
                                              <div>
                                                  <div className="flex items-center gap-1.5 w-fit px-2 py-1 mb-1.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                      <Store size={10} /> {getStoreName(activeOrder).toUpperCase()}
                                                  </div>
                                                  <h3 className={`font-black text-lg truncate ${textPrimary}`}>#{formatOrderId(activeOrder.id)}</h3>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                  <button onClick={() => setShowSOSModal(activeOrder.id)} className="flex items-center gap-1.5 h-9 px-4 bg-red-500/10 rounded-full border border-red-500/30 text-red-500 active:scale-95 transition-transform shadow-sm">
                                                      <AlertTriangle size={15} />
                                                      <span className="text-[10px] font-bold uppercase tracking-widest">S.O.S</span>
                                                  </button>
                                                  <button 
                                                      onClick={() => {
                                                          const dest = activeOrder.status === 'delivering' ? activeOrder.address : ((activeOrder as any).storeAddress || (activeOrder as any).storeName || 'Loja');
                                                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank');
                                                      }}
                                                      className={`flex items-center gap-1.5 h-9 px-4 rounded-full border shadow-sm active:scale-95 transition-transform ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-800 border-slate-700 text-white'}`}
                                                  >
                                                      <Map size={15} />
                                                      <span className="text-[10px] font-bold uppercase tracking-widest">GPS</span>
                                                  </button>
                                              </div>
                                          </div>
                                          
                                          <div className="flex flex-col items-end text-right">
                                              <div className={`p-2 rounded-xl border flex flex-col items-end ${isDark ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                                  <p className={`text-[8px] font-bold uppercase ${textSecondary}`}>Cobrar do Cliente</p>
                                                  <p className="font-black text-red-500 text-2xl leading-none drop-shadow-md mt-1">{formatCurrency(activeOrder.value)}</p>
                                              </div>
                                              <p className={`text-[10px] font-bold uppercase mt-2 text-[#34d399]`}>Sua Taxa: {formatCurrency(calculateDriverFee(activeOrder.value))}</p>
                                          </div>
                                      </div>

                                      {activeOrder.status === 'assigned' && (
                                          <SwipeButton text="Deslize p/ Ir à Loja" colorClass="bg-[#3b82f6] text-white" icon={Navigation2} onConfirm={() => handleAcceptOrderWithMute(activeOrder.id)} />
                                      )}

                                      {activeOrder.status === 'accepted' && (
                                          <div className="flex flex-col gap-3 animate-in fade-in">
                                              <input type="text" inputMode="numeric" placeholder="CÓDIGO DE RETIRADA" className={`w-full p-4 rounded-full font-black text-center text-sm outline-none transition-colors tracking-widest ${inputBg}`} value={storeCodes[activeOrder.id] || ''} onChange={(e) => setStoreCodes(prev => ({...prev, [activeOrder.id]: e.target.value}))} />
                                              <SwipeButton text="Deslize p/ Pegar" colorClass="bg-amber-500 text-black" icon={Package} onConfirm={() => onPickupOrder(activeOrder.id, storeCodes[activeOrder.id], activeOrder.restaurantCode || "")} />
                                          </div>
                                      )}

                                      {activeOrder.status === 'delivering' && (
                                          <div className="flex flex-col gap-3 animate-in fade-in">
                                              <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${isDark ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                                  <div className="flex items-start gap-3">
                                                      <User size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                                                      <div className="min-w-0">
                                                          <p className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>Cliente</p>
                                                          <p className={`text-sm font-black leading-snug mt-0.5 truncate ${textPrimary}`}>{activeOrder.customer}</p>
                                                      </div>
                                                  </div>
                                                  <div className={`border-t pt-3 flex items-start gap-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                                                      <MapPin size={18} className="text-[#3b82f6] shrink-0 mt-0.5"/>
                                                      <div className="min-w-0">
                                                          <p className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>Endereço</p>
                                                          <p className={`text-xs font-bold leading-snug mt-0.5 break-words ${textPrimary}`}>{activeOrder.address}</p>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex gap-2 mb-1">
                                                  <button onClick={() => window.open(activeOrder.mapsLink || `http://google.com/maps?q=${encodeURIComponent(activeOrder.address)}`, '_blank')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all border ${isDark ? 'bg-white/5 text-white border-white/10' : 'bg-black/5 text-black border-black/10'}`}><Map size={14}/> Mapa</button>
                                                  <button onClick={() => window.open(`https://wa.me/55${activeOrder.phone.replace(/\D/g, '')}`, '_blank')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all border ${isDark ? 'bg-white/5 text-white border-white/10' : 'bg-black/5 text-black border-black/10'}`}><MessageCircle size={14}/> Chat</button>
                                                  
                                                  {/* ✅ BOTÃO DA CÂMERA (ANEXA FOTO DA ENTREGA) */}
                                                  <button onClick={() => photoInputRef.current?.click()} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all border ${deliveryPhotos[activeOrder.id] || activeOrder.photoProof ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : (isDark ? 'bg-white/5 text-white border-white/10' : 'bg-black/5 text-black border-black/10')}`}>
                                                      <Camera size={14}/> {deliveryPhotos[activeOrder.id] || activeOrder.photoProof ? 'Anexada' : 'Foto'}
                                                  </button>
                                                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={photoInputRef} onChange={(e) => handlePhotoUpload(e, activeOrder.id)} />
                                              </div>

                                              <input type="text" inputMode="numeric" placeholder="SENHA DO CLIENTE" className={`w-full p-4 rounded-full font-black text-center text-sm outline-none transition-colors tracking-widest ${inputBg}`} value={clientCodes[activeOrder.id] || ''} onChange={(e) => setClientCodes(prev => ({...prev, [activeOrder.id]: e.target.value}))} />
                                              <SwipeButton text="Deslize p/ Entregar" colorClass="bg-[#34d399] text-black" icon={CheckSquare} onConfirm={() => onCompleteOrder(activeOrder.id, clientCodes[activeOrder.id], activeOrder.deliveryConfirmationCode || "")} />
                                          </div>
                                      )}
                                  </div>
                              ) : (
                                  <div className={`p-4 rounded-2xl flex items-center justify-center shadow-lg border backdrop-blur-md w-full ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/90 border-slate-200'}`}>
                                     <span className={`text-xs font-black uppercase tracking-widest ${driver.status === 'offline' ? 'text-slate-500' : 'text-[#34d399] animate-pulse'}`}>
                                         {driver.status === 'offline' ? 'Você está Offline' : 'Buscando Corridas...'}
                                     </span>
                                  </div>
                              )}
                          </div>
                          <div className="h-[120px] w-full shrink-0"></div>
                      </div>
                    )}

                    {/* ✅ ABA HISTÓRICO (Layout Moderno e Compacto) */}
                    {activeTab === 'history' && (
                        <div className="space-y-4 pt-2 w-full max-w-md mx-auto">
                            <div className={`flex p-1.5 rounded-full border ${glassPanel}`}>
                                <button onClick={() => setHistoryFilter('today')} className={`flex-1 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-full transition-all ${historyFilter === 'today' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : textSecondary}`}>Hoje</button>
                                <button onClick={() => setHistoryFilter('all')} className={`flex-1 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-full transition-all ${historyFilter === 'all' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : textSecondary}`}>Todos</button>
                            </div>
                            
                            <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-center items-center ${glassPanel}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>Ganhos ({historyFilter === 'today' ? 'Hoje' : 'Geral'})</p>
                                    <button onClick={() => setShowValues(!showValues)} className={`p-1 rounded-full ${textSecondary} hover:${textPrimary} transition-colors`}>
                                        {showValues ? <EyeOff size={14}/> : <Eye size={14}/>}
                                    </button>
                                </div>
                                <h3 className={`text-4xl font-black ${textPrimary}`}>
                                    {showValues ? formatCurrency(historySummary.total) : 'R$ ••••'}
                                </h3>
                                <p className={`text-[10px] font-bold uppercase mt-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-md`}>{historySummary.count} Entregas Realizadas</p>
                            </div>

                            <div className="space-y-2 mt-4">
                                {displayedHistory.slice(0, visibleItems).map((o) => (
                                    <div key={o.id} className={`flex justify-between items-center p-4 rounded-xl border ${glassPanel}`}>
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className={`font-black text-sm truncate ${textPrimary}`}>{o.customer}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>{formatTime(o.completedAt)}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider block mb-1">Entregue</span>
                                            <span className={`font-black text-sm ${textPrimary}`}>{showValues ? formatCurrency(calculateDriverFee(o.value || 0)) : '••••'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="h-[120px] w-full shrink-0"></div>
                        </div>
                    )}

                    {/* ✅ ABA CARTEIRA (Layout Moderno e Compacto) */}
                    {activeTab === 'wallet' && (
                      <div className="space-y-4 pt-2 w-full max-w-md mx-auto">
                         
                         {/* Card de Saldo Moderno */}
                         <div className={`p-6 rounded-[2rem] shadow-xl border relative overflow-hidden flex flex-col justify-center items-center ${glassPanel}`} style={{ background: isDark ? 'radial-gradient(ellipse at top, rgba(59,130,246,0.15), transparent), #1c1c1e' : 'radial-gradient(ellipse at top, rgba(59,130,246,0.1), transparent), #ffffff' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>Saldo a Receber</p>
                                <button onClick={() => setShowValues(!showValues)} className={`p-1 rounded-full ${textSecondary} hover:${textPrimary} transition-colors`}>
                                    {showValues ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                            <h3 className={`text-4xl font-black ${textPrimary}`}>
                                {showValues ? formatCurrency(financialData.netValue) : 'R$ ••••'}
                            </h3>
                         </div>
                         
                         {/* Grid de Stats Moderno */}
                         <div className="grid grid-cols-3 gap-2">
                             <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center ${glassPanel}`}>
                                 <Package size={16} className={`mb-1 ${textSecondary}`} />
                                 <span className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>Hoje</span>
                                 <span className={`text-sm font-black mt-1 ${textPrimary}`}>{showValues ? historySummary.count : '•••'}</span>
                             </div>
                             <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center ${glassPanel}`}>
                                 <Clock size={16} className={`mb-1 ${textSecondary}`} />
                                 <span className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>Pendentes</span>
                                 <span className={`text-sm font-black mt-1 text-amber-500`}>{showValues ? unassignedOrders.length : '•••'}</span>
                             </div>
                             <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center ${glassPanel}`}>
                                 <CheckCircle2 size={16} className={`mb-1 ${textSecondary}`} />
                                 <span className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>Concluídas</span>
                                 <span className={`text-sm font-black mt-1 text-emerald-500`}>{showValues ? allDeliveries.length : '•••'}</span>
                             </div>
                         </div>

                         {/* Lista Compacta de Finanças */}
                         <div className="space-y-2 mt-2">
                             <div className={`flex justify-between items-center p-4 rounded-xl border ${glassPanel}`}>
                                 <span className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Ganhos</span>
                                 <span className={`font-black ${textPrimary}`}>{showValues ? formatCurrency(financialData.deliveriesValue) : '••••'}</span>
                             </div>
                             <div className={`flex justify-between items-center p-4 rounded-xl border ${glassPanel}`}>
                                 <span className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Vales Solicitados</span>
                                 <span className="font-black text-red-400">{showValues ? `- ${formatCurrency(financialData.valesValue)}` : '••••'}</span>
                             </div>
                         </div>
                         
                         {/* Lista Compacta de Documentos */}
                         <div className="mt-6">
                            <DocumentPanelModern />
                         </div>

                         <div className="h-[120px] w-full shrink-0"></div>
                      </div>
                    )}
                    
                    {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={onUpdateOrder} />}
                  </div>
              </div>

              {/* MODAIS DE AVISO (CHAMADA E FILA) NO TOPO DE TUDO */}
              {driver.status !== 'offline' && hasIncoming && (
                  <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 pointer-events-auto">
                      <div className="w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar pb-10">
                          <h2 className="text-white font-black text-2xl text-center uppercase tracking-widest mb-4 animate-bounce">Nova Corrida!</h2>
                          
                          {offers.map((offer) => {
                              const est = getSimulatedDistance(offer.id);
                              const myFee = calculateDriverFee(Number(offer.value || 0));
                              return (
                                  <div key={offer.id} className="bg-slate-900 border-2 border-amber-500 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                                      <div className="flex items-center justify-between mb-4">
                                          <h3 className="font-black text-amber-500 text-[10px] tracking-widest uppercase bg-amber-500/10 px-2 py-1 rounded">CHAMADA DIRETA</h3>
                                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-full">📍 {est.km}km • ⏳ ~{est.min}min</span>
                                      </div>
                                      <p className="font-medium text-base text-white">{offer.customer ? `${offer.customer} • ` : ''}{offer.address}</p>
                                      <div className="flex justify-between items-end mt-5 mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                          <div>
                                              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sua Taxa</p>
                                              <p className="font-black text-emerald-400 text-4xl leading-none mt-1">{formatCurrency(myFee)}</p>
                                          </div>
                                      </div>
                                      <SwipeButton text="Deslize p/ Aceitar" colorClass="bg-amber-500 text-black" onConfirm={() => handleAcceptOfferWithMute(offer.orderId)} />
                                  </div>
                              )
                          })}

                          {visibleUnassignedOrders.map((order) => {
                              let ms = now;
                              if (order.createdAt?.seconds) ms = order.createdAt.seconds * 1000;
                              const waitedMins = Math.floor((now - ms) / 60000);
                              const est = getSimulatedDistance(order.id);
                              const myFee = calculateDriverFee(Number(order.value || 0));

                              return (
                                  <div key={order.id} className="bg-slate-900 border-2 border-[#3b82f6] rounded-[2rem] p-6 shadow-[0_0_50px_rgba(59,130,246,0.4)]">
                                      <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                              <Store size={10} className="text-[#3b82f6]" />
                                              <span className="text-[9px] font-bold uppercase tracking-wider">{getStoreName(order).toUpperCase()}</span>
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-full">📍 {est.km}km • ⏳ ~{est.min}min</span>
                                      </div>
                                      <p className="font-medium text-base text-white">{order.customer ? `${order.customer} • ` : ''}{order.address}</p>
                                      
                                      <div className="flex justify-between items-end mt-5 mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                          <div>
                                              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sua Taxa</p>
                                              <p className="font-black text-emerald-400 text-4xl leading-none mt-1">{formatCurrency(myFee)}</p>
                                          </div>
                                          {waitedMins > 0 && <span className="text-[10px] font-bold text-red-400 flex items-center gap-1"><Clock size={10}/> {waitedMins}m</span>}
                                      </div>
                                      <SwipeButton text="Deslize p/ Aceitar" colorClass="bg-[#3b82f6] text-white" onConfirm={() => handleAcceptOrderWithMute(order.id)} />
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              )}

              {showSOSModal && (
                  <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in pointer-events-auto">
                      <div className={`w-full max-w-sm rounded-[2rem] p-6 shadow-2xl ${glassPanel}`}>
                          <div className="text-center mb-6">
                              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <AlertTriangle size={32} className="text-red-500" />
                              </div>
                              <h2 className={`font-black text-2xl uppercase tracking-widest ${textPrimary}`}>S.O.S Rota</h2>
                              <p className={`text-sm mt-1 ${textSecondary}`}>Avise a loja imediatamente.</p>
                          </div>
                          <div className="space-y-3">
                              {['Pneu Furou / Moto Quebrou', 'Sofri um Acidente', 'Fui Parado em Blitz', 'Cliente Não Atende / Não Sai'].map(issue => (
                                  <button key={issue} onClick={() => handleReportIssue(showSOSModal, issue)} className={`w-full font-bold py-4 rounded-xl text-base transition-colors text-left px-5 border ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-black/5 border-black/10 text-slate-700 hover:bg-black/10'}`}>
                                      {issue}
                                  </button>
                              ))}
                              <button onClick={() => setShowSOSModal(null)} className={`w-full mt-4 font-bold py-4 text-sm underline ${textSecondary}`}>Cancelar</button>
                          </div>
                      </div>
                  </div>
              )}

              <div className={`fixed bottom-0 left-0 w-full h-[95px] z-[40] pointer-events-none ${bgMain}`}>
                  <div className={`absolute bottom-full left-0 w-full h-10 bg-gradient-to-t ${isDark ? 'from-[#121212] to-transparent' : 'from-[#f2f2f7] to-transparent'}`}></div>
              </div>

              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] z-[50] pointer-events-auto">
                  <div className={`rounded-full p-2 flex justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] border ${isDark ? 'bg-[#1c1c1e]/90 border-white/10 backdrop-blur-xl' : 'bg-white/95 border-black/10 backdrop-blur-xl'}`}>
                      
                      <button onClick={() => setActiveTab('home')} className={`w-1/4 py-3 flex justify-center rounded-[1.2rem] transition-all ${activeTab === 'home' ? (isDark ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' : 'bg-black/5 shadow-sm border border-black/5') : 'opacity-50 hover:opacity-80'}`}>
                          <Package size={22} strokeWidth={2} className={textPrimary} />
                      </button>
                      
                      <button onClick={() => setActiveTab('history')} className={`w-1/4 py-3 flex justify-center rounded-[1.2rem] transition-all ${activeTab === 'history' ? (isDark ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' : 'bg-black/5 shadow-sm border border-black/5') : 'opacity-50 hover:opacity-80'}`}>
                          <Clock size={22} strokeWidth={2} className={textPrimary} />
                      </button>

                      <button onClick={() => setActiveTab('wallet')} className={`w-1/4 py-3 flex justify-center rounded-[1.2rem] transition-all ${activeTab === 'wallet' ? (isDark ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5' : 'bg-black/5 shadow-sm border border-black/5') : 'opacity-50 hover:opacity-80'}`}>
                          <Wallet size={22} strokeWidth={2} className={textPrimary} />
                      </button>

                      <button onClick={onToggleStatus} className={`w-1/4 py-3 flex justify-center rounded-[1.2rem] transition-all opacity-90 hover:opacity-100 hover:scale-105 ${driver.status === 'offline' ? 'text-red-500' : 'text-[#34d399]'}`}>
                          <Power size={22} strokeWidth={2.5} />
                      </button>
                  </div>
              </div>
              
              <div className="fixed bottom-1 w-full text-center z-[50] pointer-events-none">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] drop-shadow-md">Desenvolvido por Jhan Houzer</p>
              </div>

              {showLogoutConfirm && (
                  <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in pointer-events-auto">
                      <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center border ${isDark ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-slate-200'}`}>
                          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <LogOut size={32} className="text-red-500" />
                          </div>
                          <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Sair do Aplicativo?</h2>
                          <p className={`text-sm mb-6 ${textSecondary}`}>Tem certeza que deseja desconectar da sua conta?</p>
                          <div className="flex w-full gap-3">
                              <button onClick={() => setShowLogoutConfirm(false)} className={`flex-1 font-bold py-3.5 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancelar</button>
                              <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">Sim, Sair</button>
                          </div>
                      </div>
                  </div>
              )}
          </>
      )}
    </div>
  );
}