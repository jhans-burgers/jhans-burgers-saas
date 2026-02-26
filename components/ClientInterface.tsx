import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, AppConfig, UserType, GiveawayFieldConfig } from '../types';
import { formatCurrency, checkShopStatus, generatePixPayload, copyToClipboard, formatPhoneNumberDisplay } from '../utils';
import { 
    ShoppingCart, Plus, Minus, X, MessageCircle, ChevronRight, 
    Search, Utensils, Phone, User, Store, Gift, Lock, Bike,
    MapPin, Navigation, CreditCard, Banknote, ArrowLeft, Clock, Copy, QrCode, AlertTriangle, CalendarClock, CheckCircle2, Home, Check, Sparkles, Trophy, Flame, Timer, Ticket, Instagram, Edit, Mail, Calendar, HelpCircle, Image as ImageIcon, Star, Zap, Info, ShoppingBag, Ban
} from 'lucide-react';
import { Footer, PixIcon } from './Shared';

// ✅ SISTEMA DE NOTIFICAÇÃO PROFISSIONAL FLUTUANTE
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

const ProductSkeleton = () => (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl flex flex-col overflow-hidden h-full animate-pulse">
        <div className="aspect-[4/3] w-full bg-slate-800 relative"></div>
        <div className="p-3 flex flex-col flex-1 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-3/4"></div>
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="mt-auto pt-2 flex justify-between items-center">
                <div className="h-5 bg-slate-800 rounded w-16"></div>
                <div className="h-8 w-8 bg-slate-800 rounded-full"></div>
            </div>
        </div>
    </div>
);

export default function ClientInterface({ 
    products = [], 
    appConfig, 
    onCreateOrder, 
    onEnterGiveaway,
    allowSystemAccess,
    onSystemAccess,
    onRecordVisit
}: ClientInterfaceProps) {
    const [cart, setCart] = useState<{product: Product, quantity: number, obs: string}[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    
    const [viewProduct, setViewProduct] = useState<Product | null>(null);
    const [viewProductQty, setViewProductQty] = useState(1);
    const [viewProductObs, setViewProductObs] = useState('');

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isCarouselPaused, setIsCarouselPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const [showWelcome, setShowWelcome] = useState(false);

    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [changeFor, setChangeFor] = useState('');
    const [serviceType, setServiceType] = useState<'delivery' | 'pickup'>('delivery');
    
    const [isLocating, setIsLocating] = useState(false);
    const [exactLocation, setExactLocation] = useState<{lat: number, lng: number} | null>(null);
    
    const [showCopyFeedback, setShowCopyFeedback] = useState(false);
    const [showPixCodeFeedback, setShowPixCodeFeedback] = useState(false);
    
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderData, setLastOrderData] = useState<any>(null);

    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [showGiveaway, setShowGiveaway] = useState(false);
    const [showGiveawaySuccess, setShowGiveawaySuccess] = useState(false);
    
    const [giveawayForm, setGiveawayForm] = useState<Record<string, string>>({});

    const safeConfig = useMemo(() => {
        const base = (appConfig || {}) as any;
        const nested = base.config || {}; 
        
        return {
            appName: base.appName || nested.appName || 'Carregando...',
            appLogoUrl: base.appLogoUrl || nested.appLogoUrl || '',
            schedule: base.schedule || nested.schedule || {},
            giveawaySettings: { active: false, title: 'Sorteio', rules: '', fields: [], ...(base.giveawaySettings || nested.giveawaySettings || {}) },
            featuredSettings: { active: false, title: 'Destaques 🔥', productIds: [], ...(base.featuredSettings || nested.featuredSettings || {}) },
            deliveryZones: base.deliveryZones || nested.deliveryZones || [],
            storePhone: base.storePhone || nested.storePhone || base.phone || nested.phone || '',
            storeCountryCode: base.storeCountryCode || nested.storeCountryCode || '+55',
            pixKey: base.pixKey || nested.pixKey || '',
            pixName: base.pixName || nested.pixName || '',
            pixCity: base.pixCity || nested.pixCity || '',
            bannerUrl: base.bannerUrl || nested.bannerUrl || '',
            promoTitle: base.promoTitle || nested.promoTitle || '',
            promoSubtitle: base.promoSubtitle || nested.promoSubtitle || '',
            promoMode: base.promoMode || nested.promoMode || 'card',
            promoDate: base.promoDate || nested.promoDate || '',
            promoTime: base.promoTime || nested.promoTime || '',
            promoLocation: base.promoLocation || nested.promoLocation || '',
            welcomeMode: base.welcomeMode || nested.welcomeMode || 'image',
            welcomeBannerUrl: base.welcomeBannerUrl || nested.welcomeBannerUrl || '',
            welcomeTitle: base.welcomeTitle || nested.welcomeTitle || 'Bem-vindo!',
            welcomeMessage: base.welcomeMessage || nested.welcomeMessage || '',
            welcomeButtonText: base.welcomeButtonText || nested.welcomeButtonText || 'Ver Cardápio',
            facebookPixelId: base.facebookPixelId || nested.facebookPixelId || ''
        } as AppConfig;
    }, [appConfig]);

    const safeProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products.filter(p => p && p.id && p.name).map(p => ({
            ...p,
            price: Number(p.price) || 0,
            category: p.category || 'Outros'
        }));
    }, [products]);

    const featuredProducts = useMemo(() => {
        if (!safeConfig.featuredSettings?.active) return [];
        const ids = safeConfig.featuredSettings?.productIds || [];
        return safeProducts.filter(p => ids.includes(p.id) && p.available !== false);
    }, [safeProducts, safeConfig.featuredSettings]);

    const slides = useMemo(() => {
        const list: Array<{type: 'banner' | 'product', data: any, id: string}> = [];
        if (safeConfig.bannerUrl) {
            list.push({ type: 'banner', data: safeConfig, id: 'promo-banner' });
        }
        featuredProducts.forEach(p => {
            list.push({ type: 'product', data: p, id: p.id });
        });
        return list;
    }, [safeConfig, featuredProducts]);

    useEffect(() => {
        const hasImageContent = safeConfig.welcomeMode === 'image' && safeConfig.welcomeBannerUrl;
        const hasTextContent = safeConfig.welcomeMode === 'text' && (safeConfig.welcomeMessage || safeConfig.welcomeTitle);
        if (hasImageContent || hasTextContent) setShowWelcome(true);
    }, [safeConfig.welcomeMode, safeConfig.welcomeBannerUrl, safeConfig.welcomeMessage]);

    useEffect(() => {
        if (isCarouselPaused || slides.length <= 1) return;
        const interval = setInterval(() => setCurrentSlideIndex((prev) => (prev + 1) % slides.length), 3000);
        return () => clearInterval(interval);
    }, [isCarouselPaused, slides.length]);

    const handleTouchStart = (e: React.TouchEvent) => { setIsCarouselPaused(true); touchStartX.current = e.targetTouches[0].clientX; };
    const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; 
        if (diff > threshold) setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
        if (diff < -threshold) setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
        touchStartX.current = null; touchEndX.current = null; setIsCarouselPaused(false);
    };

    const shopStatus = useMemo(() => checkShopStatus(safeConfig.schedule), [safeConfig.schedule]);

    useEffect(() => {
        try {
            const hasVisited = sessionStorage.getItem('jhans_visit_logged');
            if (!hasVisited && onRecordVisit) {
                onRecordVisit();
                sessionStorage.setItem('jhans_visit_logged', 'true');
            }
        } catch (e) {
            console.error("Erro tracking visita", e);
        }
    }, []);

    useEffect(() => {
        if (safeConfig.facebookPixelId) {
            try {
                const scriptId = 'facebook-pixel-script';
                if (!document.getElementById(scriptId)) {
                    const script = document.createElement('script');
                    script.id = scriptId;
                    script.innerHTML = `
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '${safeConfig.facebookPixelId}');
                        fbq('track', 'PageView');
                    `;
                    document.head.appendChild(script);
                }
            } catch (e) { console.warn("Erro Pixel", e); }
        }
    }, [safeConfig.facebookPixelId]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(safeProducts.map(p => p.category)));
        const priority = ['Hambúrgueres', 'Combos', 'Combo Familia', 'Porções', 'Bebidas'];
        return ['Todos', ...cats.sort((a: string, b: string) => {
            const idxA = priority.indexOf(a);
            const idxB = priority.indexOf(b);
            if(idxA !== -1 && idxB !== -1) return idxA - idxB;
            if(idxA !== -1) return -1;
            if(idxB !== -1) return 1;
            return a.localeCompare(b);
        })];
    }, [safeProducts]);

    const groupedProducts = useMemo(() => {
        let prods = safeProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (selectedCategory !== 'Todos') prods = prods.filter(p => p.category === selectedCategory);

        const groups: {[key: string]: Product[]} = {};
        prods.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });

        const priority = ['Hambúrgueres', 'Combos', 'Combo Familia', 'Porções', 'Bebidas'];
        return Object.entries(groups).sort(([catA], [catB]) => {
            const idxA = priority.indexOf(catA);
            const idxB = priority.indexOf(catB);
            if(idxA !== -1 && idxB !== -1) return idxA - idxB;
            if(idxA !== -1) return -1;
            if(idxB !== -1) return 1;
            return catA.localeCompare(catB);
        });
    }, [safeProducts, selectedCategory, searchTerm]);

    const addToCart = (product: Product, quantity = 1, obs = '') => {
        if (product.available === false) return; 

        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id && i.obs === obs);
            if(existing) return prev.map(i => (i.product.id === product.id && i.obs === obs) ? {...i, quantity: i.quantity + quantity} : i);
            return [...prev, { product, quantity, obs }];
        });
        if (navigator.vibrate) navigator.vibrate(50);
        showToast(`Adicionado: ${product.name}`, "success");
        if ((window as any).fbq) (window as any).fbq('track', 'AddToCart', { content_name: product.name, value: product.price, currency: 'BRL' });
    };

    const handleOpenProduct = (product: Product) => {
        if (product.available === false) return; 
        setViewProduct(product);
        setViewProductQty(1);
        setViewProductObs('');
        setIsCarouselPaused(true);
    };

    const handleAddToCartFromModal = () => {
        if (viewProduct) {
            addToCart(viewProduct, viewProductQty, viewProductObs);
            setViewProduct(null);
            setIsCarouselPaused(false);
        }
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].quantity += delta;
            if (newCart[index].quantity <= 0) newCart.splice(index, 1);
            return newCart;
        });
    };

    // ✅ LÓGICA DE GEOLOCALIZAÇÃO COM CÓDIGOS OCULTOS
    const handleGeolocation = () => {
        if (!("geolocation" in navigator)) {
            showToast("Seu dispositivo não suporta geolocalização.", "error");
            return;
        }
        
        setIsLocating(true);
        const emergencyTimeout = setTimeout(() => {
            if (isLocating) {
                setIsLocating(false);
                showToast("O GPS demorou para responder. Por favor, digite o endereço.", "error");
            }
        }, 8000);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                clearTimeout(emergencyTimeout);
                const { latitude, longitude } = position.coords;
                // Guarda a coordenada exata para o motoboy (oculta do cliente)
                setExactLocation({ lat: latitude, lng: longitude }); 

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, { 
                        headers: { 'User-Agent': 'AppDelivery/1.0', 'Accept-Language': 'pt-BR' } 
                    });
                    
                    if (!response.ok) throw new Error('Erro API Mapa');
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const road = data.address.road || data.address.pedestrian || data.address.street || '';
                        const number = data.address.house_number || '';
                        const suburb = data.address.suburb || data.address.neighbourhood || '';
                        
                        let finalAddress = road;
                        if (number) finalAddress += `, ${number}`;
                        if (suburb) finalAddress += ` - ${suburb}`;
                        if (!finalAddress) finalAddress = data.display_name || '';

                        setAddress(finalAddress);
                        showToast("Localização encontrada!", "success");
                    } else {
                        // Sem código feio, apenas uma mensagem amigável
                        setAddress(`Localização capturada pelo GPS`);
                        showToast("GPS capturado! Digite o número da casa e o bairro.", "info");
                    }
                } catch (e) { 
                    // Sem código feio, apenas uma mensagem amigável
                    setAddress(`Localização capturada pelo GPS`); 
                    showToast("GPS capturado! Complete o endereço manualmente.", "info");
                } 
                finally { setIsLocating(false); }
            }, 
            (error) => { 
                clearTimeout(emergencyTimeout);
                setIsLocating(false);
                if (error.code === 1) return showToast("Permissão negada. Ative o GPS do seu navegador.", "error");
                if (error.code === 2) return showToast("Sinal de GPS indisponível no momento.", "error");
                if (error.code === 3) return showToast("O GPS demorou muito para responder.", "error");
                showToast("Erro ao obter localização.", "error"); 
            },
            { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
        );
    };

    const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0), [cart]);

    const pixPayload = useMemo(() => {
        if (paymentMethod === 'PIX' && safeConfig.pixKey) return generatePixPayload(safeConfig.pixKey, safeConfig.pixName, safeConfig.pixCity, cartTotal, 'PEDIDO');
        return '';
    }, [paymentMethod, safeConfig, cartTotal]);

    const handlePreCheckout = () => {
        if (!customerName || !phone) return showToast("Por favor, preencha seu nome e telefone.", "error");
        if (serviceType === 'delivery' && !address) return showToast("Por favor, informe o endereço de entrega.", "error");
        if (cart.length === 0) return showToast("Seu carrinho está vazio.", "error");
        
        const itemsText = cart.map(i => `${i.quantity}x ${i.product.name}${i.obs ? ` (${i.obs})` : ''}`).join('\n');
        const finalAddress = serviceType === 'delivery' ? address : 'Retirada no Balcão';
        const obsFinal = !shopStatus.isOpen ? `[PEDIDO AGENDADO - LOJA FECHADA]` : '';

        const restaurantCode = Math.floor(1000 + Math.random() * 9000).toString();
        const deliveryConfirmationCode = Math.floor(1000 + Math.random() * 9000).toString();

        let finalMapsLink = '';
        if (serviceType === 'delivery') {
            if (exactLocation) {
                finalMapsLink = `https://www.google.com/maps/search/?api=1&query=${exactLocation.lat},${exactLocation.lng}`;
            } else {
                finalMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalAddress)}`;
            }
        }

        const orderData = {
            customer: customerName,
            phone: phone,
            address: finalAddress,
            items: itemsText,
            amount: formatCurrency(cartTotal),
            value: cartTotal,
            paymentMethod: paymentMethod + (paymentMethod === 'Dinheiro' && changeFor ? ` (Troco p/ ${changeFor})` : ''),
            status: 'pending',
            origin: 'menu',
            serviceType: serviceType,
            obs: obsFinal,
            restaurantCode: restaurantCode,
            deliveryConfirmationCode: deliveryConfirmationCode,
            driverId: '',
            mapsLink: finalMapsLink
        };

        onCreateOrder(orderData);
        setLastOrderData(orderData);
        setCart([]);
        setIsCheckoutOpen(false);
        setShowSuccessModal(true);
        if ((window as any).fbq) (window as any).fbq('track', 'Purchase', { value: cartTotal, currency: 'BRL' });
    };

    const getDeepStorePhone = () => {
        const cAny = appConfig as any;
        const cn = cAny?.config || {};
        
        const possiblePhones = [
            safeConfig.storePhone, cAny.storePhone, cAny.phone, cAny.whatsapp, cAny.telefone,
            cn.storePhone, cn.phone, cn.whatsapp, cn.telefone
        ];

        for (const p of possiblePhones) {
            if (p && typeof p === 'string') {
                const cleaned = p.replace(/\D/g, '');
                if (cleaned.length >= 10) return cleaned;
            }
        }
        return ''; 
    };

    // ✅ ENVIO PARA WHATSAPP (Sem endereço poluindo a mensagem)
    const handleSendToWhatsApp = () => {
        if (!lastOrderData) return;
        const isScheduled = !shopStatus.isOpen;
        let waText = `*${isScheduled ? '📅 PEDIDO AGENDADO' : 'NOVO PEDIDO'} - ${safeConfig.appName}*\n\n`;
        waText += `*Cliente:* ${lastOrderData.customer}\n*Tel:* ${lastOrderData.phone}\n`;
        waText += `*Tipo:* ${lastOrderData.serviceType === 'delivery' ? 'Entrega 🛵' : 'Retirada 🥡'}\n\n`;
        
        // ❌ A LINHA DO ENDEREÇO FOI REMOVIDA DAQUI PARA NÃO POLUIR
        
        waText += `*ITENS:*\n${lastOrderData.items}\n\n`;
        waText += `*Total:* ${formatCurrency(lastOrderData.value)}\n*Pagamento:* ${lastOrderData.paymentMethod}\n`;

        if (lastOrderData.serviceType === 'delivery' && lastOrderData.deliveryConfirmationCode) {
            waText += `\n🔒 *CÓDIGO DE ENTREGA:* ${lastOrderData.deliveryConfirmationCode}`;
            waText += `\n_(Informe este código ao motoboy para receber o seu pedido)_\n`;
        }

        const storePhone = getDeepStorePhone();
        const countryCode = safeConfig.storeCountryCode ? safeConfig.storeCountryCode.replace('+','') : '55';
        
        let waUrl = '';
        if (storePhone) {
            waUrl = `https://api.whatsapp.com/send?phone=${countryCode}${storePhone}&text=${encodeURIComponent(waText)}`;
        } else {
            waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
            showToast("Selecione o WhatsApp da nossa loja na sua agenda para enviar!", "info");
        }
        
        window.open(waUrl, '_blank');
    };

    const handleBackToMenu = () => { setShowSuccessModal(false); setLastOrderData(null); };
    
    const handleGiveawaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fields = safeConfig.giveawaySettings?.fields || [];
        for (const field of fields) {
            if (field.enabled && field.required && !giveawayForm[field.id]) return showToast(`Por favor, preencha: ${field.label}`, "error");
        }
        onEnterGiveaway({ name: giveawayForm['name'] || 'Anônimo', phone: giveawayForm['phone'] || '', dynamicData: giveawayForm, confirmed: false });
        setShowGiveaway(false);
        setShowGiveawaySuccess(true);
    };

    const handleSendGiveawayToWhatsApp = () => {
        const title = safeConfig.giveawaySettings?.title || 'Sorteio';
        let waText = `*🎫 INSCRIÇÃO SORTEIO - ${safeConfig.appName}*\n*${title.toUpperCase()}*\n\n`;
        const fields = safeConfig.giveawaySettings?.fields || [];
        fields.forEach(field => { if (field.enabled && giveawayForm[field.id]) waText += `*${field.label}:* ${giveawayForm[field.id]}\n`; });
        waText += `\n✅ Confirmo que li e aceito as regras.\nQuero confirmar minha participação! 🍀`;
        
        const storePhone = getDeepStorePhone();
        const countryCode = safeConfig.storeCountryCode ? safeConfig.storeCountryCode.replace('+','') : '55';
        
        let waUrl = '';
        if (storePhone) {
            waUrl = `https://api.whatsapp.com/send?phone=${countryCode}${storePhone}&text=${encodeURIComponent(waText)}`;
        } else {
            waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
            showToast("Selecione o WhatsApp da nossa loja na sua agenda para enviar!", "info");
        }
        
        window.open(waUrl, '_blank');
        setShowGiveawaySuccess(false);
    };

    const handleCopyKey = () => { copyToClipboard(safeConfig.pixKey); setShowCopyFeedback(true); setTimeout(() => setShowCopyFeedback(false), 2000); };
    const handleCopyPixCode = () => { if (pixPayload) { copyToClipboard(pixPayload); setShowPixCodeFeedback(true); setTimeout(() => setShowPixCodeFeedback(false), 2000); } };

    const renderGiveawayField = (field: GiveawayFieldConfig) => {
        const value = giveawayForm[field.id] || '';
        const setValue = (val: string) => setGiveawayForm(prev => ({...prev, [field.id]: val}));
        let Icon = User;
        if (field.type === 'phone') Icon = Phone;
        if (field.type === 'email') Icon = Mail;
        if (field.type === 'date') Icon = Calendar;
        if (field.id === 'instagram') Icon = Instagram;
        if (field.id === 'custom') Icon = HelpCircle;

        return (
            <div key={field.id} className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Icon size={16}/></div>
                <input required={field.required} type={field.type === 'date' ? 'date' : 'text'} placeholder={field.placeholder || field.label} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-amber-500 transition-colors text-sm placeholder:text-slate-600" value={value} onChange={e => { let val = e.target.value; if (field.type === 'phone') val = formatPhoneNumberDisplay(val); setValue(val); }} />
            </div>
        );
    };

    if (isCheckoutOpen) {
        return (
            <div className="fixed inset-0 z-[3000] bg-[#020617] text-white flex flex-col font-sans">
                <div className="p-3 md:p-4 flex items-center gap-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-50 shadow-md">
                    <button onClick={() => setIsCheckoutOpen(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"><ArrowLeft size={18}/></button>
                    <h2 className="text-base md:text-lg font-bold flex items-center gap-2">Seu Carrinho <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">{cart.length}</span></h2>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto pb-4 no-scrollbar">
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                    <div className="max-w-md mx-auto space-y-5">
                        {!shopStatus.isOpen && (<div className="bg-red-900/20 border-l-4 border-red-500 rounded-r-xl p-3 flex flex-col gap-2 shadow-lg animate-in fade-in"><div className="flex items-center gap-2"><div className="bg-red-500/20 p-1.5 rounded-full text-red-500 animate-pulse"><Clock size={16}/></div><div><h3 className="font-black text-red-100 text-xs uppercase tracking-wide">Loja Fechada</h3><p className="text-[10px] text-red-200/70">Reabrimos: <span className="font-bold text-white">{shopStatus.nextOpen}</span>.</p></div></div></div>)}
                        <div className="space-y-3">
                            {cart.map((item, idx) => (
                                <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3"><div className="bg-slate-800 p-2 rounded-lg text-amber-500"><Utensils size={16}/></div><div><p className="font-bold text-white text-sm leading-tight">{item.product.name}</p><p className="text-emerald-400 font-bold text-xs mt-0.5">{formatCurrency(Number(item.product.price))}</p></div></div>
                                        <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 h-8"><button onClick={() => updateQuantity(idx, -1)} className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-l-lg transition-colors"><Minus size={14}/></button><span className="w-8 text-center font-bold text-sm text-white">{item.quantity}</span><button onClick={() => updateQuantity(idx, 1)} className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg transition-colors"><Plus size={14}/></button></div>
                                    </div>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500/50 placeholder:text-slate-600 transition-colors" placeholder="Observação (Ex: Sem cebola...)" value={item.obs} onChange={e => { const newCart = [...cart]; newCart[idx].obs = e.target.value; setCart(newCart); }} />
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 pl-1">Entrega</p>
                            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 mb-4"><button onClick={() => setServiceType('delivery')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${serviceType === 'delivery' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}><Bike size={14}/> Entrega</button><button onClick={() => setServiceType('pickup')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${serviceType === 'pickup' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-white'}`}><Store size={14}/> Retirada</button></div>
                            <div className="space-y-3">
                                <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><User size={16}/></div><input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-emerald-500 focus:bg-slate-900 transition-colors" placeholder="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                                <div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Phone size={16}/></div><input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-emerald-500 focus:bg-slate-900 transition-colors" placeholder="Seu WhatsApp" value={phone} onChange={e => setPhone(formatPhoneNumberDisplay(e.target.value))} type="tel" /></div>
                                {serviceType === 'delivery' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <button onClick={handleGeolocation} className="w-full bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-900/30 transition-colors active:scale-95">
                                            {isLocating ? <span className="animate-pulse">Buscando Sinal de GPS...</span> : <><Navigation size={14}/> Usar minha localização atual</>}
                                        </button>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><MapPin size={16}/></div>
                                            <input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-emerald-500 focus:bg-slate-900 transition-colors" placeholder="Endereço (Rua, Número, Bairro)" value={address} onChange={e => setAddress(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 pl-1">Pagamento</p>
                            <div className="grid grid-cols-3 gap-2">{['PIX', 'Dinheiro', 'Cartão'].map(method => (<button key={method} onClick={() => setPaymentMethod(method)} className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${paymentMethod === method ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}>{method === 'PIX' && <PixIcon size={20}/>}{method === 'Dinheiro' && <Banknote size={20}/>}{method === 'Cartão' && <CreditCard size={20}/>}<span className="text-[10px] font-bold uppercase">{method}</span></button>))}</div>
                            {paymentMethod === 'Dinheiro' && (<div className="mt-3 animate-in slide-in-from-top-1"><input className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition-colors" placeholder="Precisa de troco para quanto?" value={changeFor} onChange={e => setChangeFor(e.target.value)} /></div>)}
                            {paymentMethod === 'PIX' && (<div className="mt-4 space-y-3 animate-in slide-in-from-top-2"><div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-2"><div className="flex justify-between items-center relative"><span className="text-[10px] text-slate-500 uppercase font-bold">Chave PIX</span><div className="relative"><button onClick={handleCopyKey} className={`transition-all duration-300 p-1.5 rounded-lg ${showCopyFeedback ? 'bg-emerald-500 text-white' : 'text-emerald-500 hover:text-white hover:bg-emerald-900/30'}`} title="Copiar Chave">{showCopyFeedback ? <Check size={16} /> : <Copy size={16} />}</button></div></div><p className="text-white font-mono text-sm truncate">{safeConfig.pixKey || 'Chave não configurada'}</p><div className="pt-2 mt-1 border-t border-slate-700/50"><p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Favorecido:</p><p className="text-emerald-400 text-xs font-bold">{safeConfig.pixName || 'Não informado'}</p></div></div>{pixPayload && (<div className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-3"><div className="flex items-center gap-2 mb-2 text-emerald-400"><QrCode size={16}/><span className="text-xs font-bold uppercase">Pix Copia e Cola</span></div><div className="relative"><textarea readOnly className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 font-mono h-20 resize-none outline-none focus:border-emerald-500/50 custom-scrollbar" value={pixPayload} /><div className="absolute bottom-2 right-2"><button onClick={handleCopyPixCode} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg transition-all flex items-center gap-1 ${showPixCodeFeedback ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>{showPixCodeFeedback ? <Check size={12}/> : <Copy size={12}/>}{showPixCodeFeedback ? 'Copiado!' : 'Copiar Código'}</button></div></div></div>)}</div>)}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 border-t border-slate-800 p-4 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]"><div className="max-w-md mx-auto"><div className="flex justify-between items-end mb-4"><div><p className="text-xs text-slate-400 mb-0.5">Subtotal</p><p className="text-2xl font-black text-white">{formatCurrency(cartTotal)}</p></div>{serviceType === 'delivery' && (<div className="text-right"><p className="text-xs text-slate-400 mb-0.5">Entrega</p><p className="text-sm font-bold text-slate-300">A calcular</p></div>)}</div><button onClick={handlePreCheckout} className="w-full text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/20"><CheckCircle2 size={20}/> Confirmar Pedido</button></div></div>
            </div>
        );
    }

    return (
        <div className="bg-[#020617] h-[100dvh] w-full font-sans relative overflow-hidden flex flex-col">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {showWelcome && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-md relative flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                        <h2 className="text-white font-black text-3xl mb-6 text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-8 duration-700">
                            Seja bem-vindo(a)!
                        </h2>

                        {safeConfig.welcomeMode === 'image' && safeConfig.welcomeBannerUrl ? (
                            <div className="relative w-full flex flex-col">
                                <div className="w-full rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-white/10 relative group bg-[#020617]">
                                    <button 
                                        onClick={() => setShowWelcome(false)}
                                        className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-colors z-20"
                                    >
                                        <X size={20}/>
                                    </button>
                                    <img src={safeConfig.welcomeBannerUrl} className="w-full h-auto max-h-[65vh] object-contain" alt="Bem-vindo"/>
                                </div>
                                <div className="mt-4 w-full">
                                    <button onClick={() => setShowWelcome(false)} className="w-full bg-gradient-to-r from-[#ef4444] to-[#f97316] hover:from-red-600 hover:to-orange-600 text-white font-black text-sm py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 duration-700">
                                        Ver Cardápio <ChevronRight size={18} strokeWidth={3}/>
                                    </button>
                                </div>
                            </div>
                        ) : safeConfig.welcomeMode === 'text' ? (
                            <div className="bg-[#0f172a]/95 border border-slate-700 rounded-[2rem] p-8 w-full shadow-2xl text-center relative overflow-hidden backdrop-blur-xl">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"></div>
                                <div className="absolute top-[-60px] left-[-60px] w-40 h-40 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                                <div className="absolute bottom-[-60px] right-[-60px] w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
                                <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>

                                <div className="mb-6 inline-flex p-4 bg-slate-800/80 rounded-3xl border border-slate-700 shadow-inner">
                                    {safeConfig.appLogoUrl ? (<img src={safeConfig.appLogoUrl} className="w-16 h-16 rounded-2xl object-cover shadow-lg"/>) : (<Utensils size={40} className="text-amber-500"/>)}
                                </div>

                                <h2 className="text-3xl font-black text-white mb-4 uppercase italic tracking-wide drop-shadow-md">{safeConfig.welcomeTitle || 'Seja Bem-vindo!'}</h2>
                                <div className="max-h-[30vh] overflow-y-auto custom-scrollbar mb-8"><p className="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium px-2">{safeConfig.welcomeMessage || 'Estamos felizes em ter você aqui. Confira nosso cardápio e faça seu pedido!'}</p></div>

                                <button onClick={() => setShowWelcome(false)} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-900/30 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 relative overflow-hidden group">
                                    <span className="relative z-10 flex items-center gap-2">{safeConfig.welcomeButtonText || 'Ver Cardápio'} <ChevronRight size={18} strokeWidth={3}/></span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="bg-gradient-to-r from-[#ef4444] to-[#f97316] pt-3 pb-8 px-4 rounded-b-[1.5rem] md:rounded-b-[2rem] shadow-2xl relative overflow-hidden shrink-0">
                    <div className="max-w-5xl mx-auto relative z-10">
                        <div className="flex justify-between items-center mb-4 md:mb-8">
                            <div className="flex items-center gap-2 md:gap-3 text-white font-bold">
                                {safeConfig.appLogoUrl ? (<img src={safeConfig.appLogoUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/20"/>) : (<div className="bg-black/20 p-1.5 md:p-2 rounded-xl"><Utensils size={16} className="md:w-5 md:h-5"/></div>)}
                                <span className="text-lg md:text-xl tracking-tight drop-shadow-md">{safeConfig.appName}</span>
                            </div>
                            {allowSystemAccess && (
                                <div className="flex gap-2">
                                    <button onClick={() => onSystemAccess('admin')} className="text-[10px] font-bold bg-black/20 hover:bg-black/40 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 transition-colors backdrop-blur-md border border-white/10 uppercase"><Store size={10} className="md:w-3 md:h-3"/> Gerente</button>
                                    <button onClick={() => onSystemAccess('driver')} className="text-[10px] font-bold bg-black/20 hover:bg-black/40 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 transition-colors backdrop-blur-md border border-white/10 uppercase"><Bike size={10} className="md:w-3 md:h-3"/> Motoboy</button>
                                </div>
                            )}
                        </div>

                        <h1 className="text-xl md:text-4xl font-black text-white mb-4 leading-tight drop-shadow-md">Bateu a fome?<br/>Peça agora mesmo! 🍔</h1>

                        {slides.length > 0 && (
                            <div className="relative w-full aspect-[2/1] md:aspect-[21/9] lg:aspect-[2.5/1] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer touch-pan-y" onMouseEnter={() => setIsCarouselPaused(true)} onMouseLeave={() => setIsCarouselPaused(false)} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                                <div className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]" style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}>
                                    {slides.map((slide, idx) => {
                                        if (slide.type === 'banner') {
                                            return (
                                                <div key={slide.id} className="w-full h-full flex-shrink-0 relative" onClick={() => setShowGiveaway(true)}>
                                                    {slide.data.promoMode === 'banner' ? (<img src={slide.data.bannerUrl} className="w-full h-full object-cover bg-slate-900" />) : (<div className="bg-[#1a0505] h-full w-full"><div className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/60 via-[#1a0505] to-[#0f0202] relative h-full flex flex-col justify-center px-6 md:px-12"><div className="relative z-10 flex flex-row items-center justify-between gap-4 max-w-4xl mx-auto w-full"><div className="flex-1 space-y-2"><div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-[#1a0505] px-2 py-0.5 rounded-full shadow-sm animate-pulse mb-1 self-start"><Flame size={12} fill="currentColor"/><span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Promoção</span></div><h2 className="text-xl md:text-4xl font-black text-white leading-tight italic drop-shadow-xl uppercase">{slide.data.promoTitle || 'OFERTA ESPECIAL'}</h2><p className="text-slate-300 text-xs md:text-sm max-w-md hidden sm:block opacity-90">{slide.data.promoSubtitle}</p><div className="pt-0"><button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2 px-4 rounded-full text-xs md:text-sm uppercase flex items-center gap-2 transition-colors backdrop-blur-sm">Participar Agora <ChevronRight size={14}/></button></div></div><div className="shrink-0 w-24 h-24 md:w-40 md:h-40 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl rotate-3 transform hover:rotate-0 transition-all duration-500"><img src={slide.data.bannerUrl} className="w-full h-full object-cover"/></div></div></div></div>)}
                                                </div>
                                            );
                                        } else {
                                            const product = slide.data;
                                            return (
                                                <div key={slide.id} className="w-full h-full flex-shrink-0 relative bg-slate-900" onClick={() => handleOpenProduct(product)}>
                                                    <div className="absolute inset-0">{product.imageUrl ? (<img src={product.imageUrl} className="w-full h-full object-cover opacity-60" alt={product.name}/>) : (<div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900"><Utensils size={64}/></div>)}<div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent"></div></div>
                                                    <div className="absolute top-3 right-3 z-20"><div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full shadow-lg animate-pulse border border-white/20"><Star size={10} fill="currentColor"/><span className="text-[9px] font-black uppercase tracking-wider">Destaque</span></div></div>
                                                    <div className="relative z-10 h-full flex flex-col justify-end pb-8 px-4 md:px-8 max-w-4xl mx-auto w-full"><h2 className="text-base md:text-2xl font-bold text-white leading-tight mb-1 drop-shadow-md line-clamp-1">{product.name}</h2>{product.description && (<p className="text-slate-400 text-[9px] md:text-[10px] line-clamp-2 max-w-md mb-3 leading-relaxed hidden sm:block">{product.description}</p>)}<div className="flex items-center justify-between"><span className="text-emerald-400 font-bold text-base md:text-xl drop-shadow-md">{formatCurrency(product.price)}</span><button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"><Plus size={12}/> Adicionar</button></div></div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">{slides.map((_, idx) => (<button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentSlideIndex(idx); }} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlideIndex === idx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}/>))}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-3 md:px-4 -mt-4 md:-mt-6 relative z-20">
                    <div className="relative mb-3 md:mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16}/><input className="w-full bg-[#0f172a] border border-slate-800 rounded-full py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-slate-600 outline-none shadow-xl transition-all text-xs md:text-sm font-medium" placeholder="Buscar lanche..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2 md:mb-4">{['Todos', ...new Set(safeProducts.map(p => p.category))].map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap transition-all shadow-md ${selectedCategory === cat ? 'bg-white text-slate-900 scale-105' : 'bg-[#0f172a] text-slate-400 border border-slate-800 hover:border-slate-600'}`}>{cat}</button>))}</div>
                    {!shopStatus.isOpen && (<div className="bg-red-900/20 border-l-4 border-red-500 rounded-r-xl p-3 mb-4 flex items-start gap-3 shadow-lg"><div className="bg-red-500/20 p-1.5 rounded-full text-red-500 animate-pulse"><Clock size={16}/></div><div><h3 className="font-black text-red-100 text-xs uppercase tracking-wide">Loja Fechada</h3><p className="text-[10px] text-red-300 mt-1 font-bold flex items-center gap-1">Reabrimos: {shopStatus.nextOpen}</p></div></div>)}
                    <div className="space-y-6 md:space-y-8 pb-10">
                        {groupedProducts.length === 0 && !searchTerm ? (
                            <div className="space-y-6">{[1, 2].map(catIdx => (<div key={catIdx}><div className="h-6 w-32 bg-slate-800 rounded mb-3 animate-pulse"></div><div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{[1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)}</div></div>))}</div>
                        ) : (
                            groupedProducts.map(([category, items]) => (
                                <div key={category} className="animate-in slide-in-from-bottom-4 duration-700">
                                    <h3 className="text-white font-black text-sm md:text-lg mb-3 flex items-center gap-2 uppercase tracking-wider pl-1 border-l-4 border-orange-500">{category}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                        {items.map(product => {
                                            const isAvailable = product.available !== false;
                                            return (
                                                <div key={product.id} onClick={() => handleOpenProduct(product)} className={`bg-[#0f172a] border rounded-xl flex flex-col transition-all shadow-md group relative overflow-hidden cursor-pointer h-full ${isAvailable ? 'active:scale-[0.98] border-slate-800 hover:border-slate-600' : 'border-slate-800 opacity-60'}`}>
                                                    <div className="aspect-[4/3] w-full relative overflow-hidden bg-slate-900">{product.imageUrl ? (<img src={product.imageUrl} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ${isAvailable ? 'group-hover:scale-110' : 'grayscale'}`}/>) : (<div className="w-full h-full flex items-center justify-center text-slate-700"><Utensils size={32} /></div>)}<div className={`absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs md:text-sm font-black border shadow-lg ${isAvailable ? 'bg-black/80 backdrop-blur-sm text-emerald-400 border-emerald-500/30' : 'bg-red-900 text-white border-red-700'}`}>{isAvailable ? formatCurrency(product.price) : 'ESGOTADO'}</div></div>
                                                    <div className="p-3 flex flex-col flex-1"><h4 className={`font-bold text-xs md:text-base mb-1 transition-colors line-clamp-2 leading-tight ${isAvailable ? 'text-white group-hover:text-amber-500' : 'text-slate-500 line-through'}`}>{product.name}</h4>{product.description && (<p className="text-slate-400 text-[10px] md:text-xs leading-relaxed line-clamp-2 mb-2">{product.description}</p>)}<div className="mt-auto pt-2 flex justify-end">{isAvailable ? (<button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md border border-slate-700 group-hover:bg-amber-600 group-hover:border-amber-500"><Plus size={16}/></button>) : (<div className="w-8 h-8 flex items-center justify-center text-slate-600 cursor-not-allowed"><Ban size={16}/></div>)}</div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                        {groupedProducts.length === 0 && searchTerm && (<div className="text-center py-20 text-slate-600"><Utensils size={32} className="mx-auto mb-2 opacity-20"/><p className="text-xs">Nenhum item encontrado para "{searchTerm}".</p></div>)}
                    </div>
                </div>

                <Footer />
            </div>

            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-4 left-3 right-3 z-50 max-w-5xl mx-auto animate-in slide-in-from-bottom-10">
                    <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.4)] flex items-center justify-between transition-transform active:scale-95">
                        <div className="flex items-center gap-3"><div className="bg-black/20 w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shadow-inner">{cart.reduce((a,b) => a + b.quantity, 0)}</div><span className="font-black text-xs uppercase tracking-wider">VER CARRINHO</span></div>
                        <div className="flex items-center gap-2"><span className="font-black text-sm">{formatCurrency(cartTotal)}</span><ChevronRight size={16} strokeWidth={3}/></div>
                    </button>
                </div>
            )}

            {viewProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in duration-200">
                    <div className="bg-[#0f172a] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="aspect-[4/3] w-full bg-black relative shrink-0">
                            {viewProduct.imageUrl ? (<img src={viewProduct.imageUrl} className="w-full h-full object-cover" alt={viewProduct.name} />) : (<div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900"><Utensils size={48}/></div>)}
                            <button onClick={() => { setViewProduct(null); setIsCarouselPaused(false); }} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"><X size={20}/></button>
                        </div>
                        <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                            <div className="flex justify-between items-start mb-2"><h2 className="text-2xl font-black text-white leading-tight">{viewProduct.name}</h2><span className="text-xl font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap ml-2">{formatCurrency(viewProduct.price * viewProductQty)}</span></div>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">{viewProduct.description || 'Sem descrição detalhada.'}</p>
                            <div className="mt-auto space-y-4">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Observações do Item</label><textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 h-20 resize-none placeholder:text-slate-700" placeholder="Ex: Tirar cebola, ponto da carne..." value={viewProductObs} onChange={e => setViewProductObs(e.target.value)} /></div>
                                <div className="flex items-center gap-3"><div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 h-12"><button onClick={() => setViewProductQty(prev => Math.max(1, prev - 1))} className="w-12 h-full flex items-center justify-center text-slate-400 hover:text-white"><Minus size={18}/></button><span className="w-8 text-center font-bold text-lg text-white">{viewProductQty}</span><button onClick={() => setViewProductQty(prev => prev + 1)} className="w-12 h-full flex items-center justify-center text-slate-400 hover:text-white"><Plus size={18}/></button></div><button onClick={handleAddToCartFromModal} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 rounded-xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide flex items-center justify-center gap-2">Adicionar <ShoppingBag size={18}/></button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showGiveaway && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-amber-500/50 p-6 md:p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowGiveaway(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2"><X size={20}/></button>
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/30"><Gift size={32} className="text-amber-400"/></div>
                            <h3 className="text-xl font-black text-white uppercase italic">{safeConfig.giveawaySettings?.title || 'Sorteio Especial'}</h3>
                            <p className="text-slate-400 text-xs mt-1">Preencha para participar!</p>
                        </div>
                        <div className="bg-amber-900/20 p-3 rounded-lg mb-4 border border-amber-500/20 text-center"><p className="text-amber-400 text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1"><AlertTriangle size={10}/> Regras Obrigatórias</p><div className="text-slate-300 text-[10px] whitespace-pre-line leading-relaxed">{safeConfig.giveawaySettings?.rules || '1. Seguir o Instagram\n2. Marcar um amigo'}</div></div>
                        <form onSubmit={handleGiveawaySubmit} className="space-y-3">
                             {(safeConfig.giveawaySettings?.fields || []).filter(field => field.enabled).map(field => renderGiveawayField(field))}
                             <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black py-3 rounded-xl shadow-lg mt-2 uppercase tracking-wide text-xs">Quero Participar</button>
                        </form>
                    </div>
                </div>
            )}

            {showGiveawaySuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] p-8 relative overflow-hidden text-center">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/10"><Ticket size={40} className="text-emerald-400 animate-bounce"/></div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-wide mb-2">Inscrição Realizada!</h2>
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed">Boa sorte! Para confirmar sua participação, envie a confirmação para nosso WhatsApp.</p>
                        <div className="space-y-3"><button onClick={handleSendGiveawayToWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"><MessageCircle size={18}/> Confirmar no WhatsApp</button><button onClick={() => { setShowGiveawaySuccess(false); setShowGiveaway(true); }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-3 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"><Edit size={14}/> Corrigir Dados</button></div>
                    </div>
                </div>
            )}

            {/* ✅ MODAL DE SUCESSO DO PEDIDO */}
            {showSuccessModal && lastOrderData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] p-8 relative overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 animate-pulse"></div>
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/10"><CheckCircle2 size={40} className="text-emerald-400 animate-bounce"/></div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-wide mb-2">Pedido Recebido!</h2>
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed">Quase lá! Para confirmar e começarmos a preparar, clique no botão abaixo para enviar o pedido no nosso WhatsApp.</p>
                        
                        {lastOrderData.serviceType === 'delivery' && lastOrderData.deliveryConfirmationCode && (
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Guarde sua senha de entrega</p>
                                <h3 className="text-4xl font-black text-white tracking-[0.2em]">{lastOrderData.deliveryConfirmationCode}</h3>
                                <p className="text-[10px] text-slate-400 mt-2">Você precisará informá-la ao motoboy.</p>
                            </div>
                        )}

                        <div className="bg-slate-950 rounded-xl p-3 mb-6 border border-slate-800 text-left"><p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Resumo</p><div className="flex justify-between items-center mb-1"><span className="text-white font-bold text-sm">{lastOrderData.customer}</span><span className="text-emerald-400 font-bold text-sm">{formatCurrency(lastOrderData.value)}</span></div>{!shopStatus.isOpen && (<p className="text-[10px] text-amber-500 mt-1 font-bold flex items-center gap-1"><Clock size={10}/> Pedido Agendado</p>)}</div>
                        <div className="space-y-3"><button onClick={handleSendToWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"><MessageCircle size={18}/> Enviar no WhatsApp</button><button onClick={handleBackToMenu} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-3 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"><Home size={14}/> Voltar ao Cardápio</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}