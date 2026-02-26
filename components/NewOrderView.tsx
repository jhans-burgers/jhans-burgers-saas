import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, AppConfig, Client } from '../types';
import { formatCurrency, formatPhoneNumberDisplay, normalizePhone, generatePixPayload, copyToClipboard, normalizeForSearch } from '../utils';
import { Search, Plus, Minus, Trash2, User, MapPin, Phone, Bike, Store, CheckCircle2, Clipboard, X, ShoppingBag, Utensils, ArrowRight, DollarSign, CreditCard, Banknote, QrCode, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { PixIcon } from './Shared';

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

interface NewOrderViewProps {
    products: Product[];
    appConfig: AppConfig;
    onCreateOrder: (data: any) => void;
    clients?: Client[]; 
}

export function NewOrderView({ products, appConfig, onCreateOrder, clients = [] }: NewOrderViewProps) {
    // Layout State (Mobile Tabs)
    const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

    // Order State
    const [cart, setCart] = useState<{product: Product, quantity: number, obs: string}[]>([]);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [mapsLink, setMapsLink] = useState('');
    const [serviceType, setServiceType] = useState<'delivery' | 'pickup'>('delivery');
    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [deliveryFee, setDeliveryFee] = useState<string>(''); 
    const [generalObs, setGeneralObs] = useState('');
    
    // Auto-complete States
    const [nameSuggestions, setNameSuggestions] = useState<Client[]>([]);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    
    // Pix Copy Feedback
    const [pixCopied, setPixCopied] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Paste Modal
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');

    // --- AUTO COMPLETE LOGIC (PHONE) ---
    useEffect(() => {
        const cleanInput = normalizePhone(clientPhone);
        if (cleanInput.length >= 8) { 
            const found = clients.find(c => normalizePhone(c.phone) === cleanInput);
            if (found) {
                if(!clientName || clientName.toLowerCase() === found.name.toLowerCase()) {
                    setClientName(found.name);
                }
                setClientAddress(found.address);
                if (found.mapsLink) setMapsLink(found.mapsLink);
            }
        }
    }, [clientPhone, clients]);

    // --- HANDLERS FOR NAME AUTO-COMPLETE ---
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setClientName(val);

        if (val.length > 1) {
            const searchNormalized = normalizeForSearch(val);
            const matches = clients.filter(c => 
                normalizeForSearch(c.name).includes(searchNormalized)
            );
            setNameSuggestions(matches.slice(0, 5)); 
            setShowNameSuggestions(true);
        } else {
            setNameSuggestions([]);
            setShowNameSuggestions(false);
        }
    };

    const selectClientFromName = (client: Client) => {
        setClientName(client.name);
        setClientPhone(formatPhoneNumberDisplay(client.phone));
        setClientAddress(client.address);
        if (client.mapsLink) setMapsLink(client.mapsLink);
        
        setShowNameSuggestions(false);
        setNameSuggestions([]);
    };

    const nameInputRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (nameInputRef.current && !nameInputRef.current.contains(event.target)) {
                setShowNameSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Computed Data ---
    const categories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => p.category)));
        const priority = ['Hambúrgueres', 'Combos', 'Combo Familia', 'Porções', 'Bebidas'];
        return ['Todos', ...cats.sort((a, b) => {
            const idxA = priority.indexOf(a);
            const idxB = priority.indexOf(b);
            if(idxA !== -1 && idxB !== -1) return idxA - idxB;
            return a.localeCompare(b);
        })];
    }, [products]);

    // Group Products by Category for Display
    const groupedProducts = useMemo(() => {
        let prods = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (selectedCategory !== 'Todos') {
            prods = prods.filter(p => p.category === selectedCategory);
        }

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
    }, [products, searchTerm, selectedCategory]);

    const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0), [cart]);
    
    const finalTotal = useMemo(() => {
        const fee = parseFloat(deliveryFee.replace(',', '.')) || 0;
        return cartTotal + fee;
    }, [cartTotal, deliveryFee]);

    // --- PIX GENERATION ---
    const pixPayload = useMemo(() => {
        if (paymentMethod === 'PIX' && appConfig.pixKey && finalTotal > 0) {
            return generatePixPayload(appConfig.pixKey, appConfig.pixName || '', appConfig.pixCity || '', finalTotal, 'PEDIDO');
        }
        return '';
    }, [paymentMethod, finalTotal, appConfig]);

    const handleCopyPix = () => {
        if(pixPayload) {
            copyToClipboard(pixPayload);
            setPixCopied(true);
            setTimeout(() => setPixCopied(false), 2000);
        }
    };

    // --- Handlers ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if(existing) {
                return prev.map(i => i.product.id === product.id ? {...i, quantity: i.quantity + 1} : i);
            }
            return [...prev, { product, quantity: 1, obs: '' }];
        });
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].quantity += delta;
            if (newCart[index].quantity <= 0) newCart.splice(index, 1);
            return newCart;
        });
    };

    const updateItemObs = (index: number, val: string) => {
        setCart(prev => {
            const newCart = [...prev];
            newCart[index].obs = val;
            return newCart;
        });
    };

    const handlePasteFromWhatsApp = () => {
        const phoneRegex = /(?:(?:\+|00)?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[\-\s]?(\d{4}))/g;

        let extractedName = '';
        let extractedAddress = '';
        let extractedPhone = '';

        const phoneMatch = pasteText.match(phoneRegex);
        if (phoneMatch && phoneMatch[0]) {
             let raw = phoneMatch[0].replace(/\D/g, '');
             if (raw.startsWith('55') && raw.length >= 12) raw = raw.substring(2);
             if (raw.length >= 10) extractedPhone = raw;
        }

        const lines = pasteText.split('\n');
        lines.forEach(line => {
            const cleanLine = line.trim();
            const lower = cleanLine.toLowerCase();

            if (lower.startsWith('nome:') || lower.startsWith('cliente:') || lower.startsWith('para:')) {
                extractedName = cleanLine.replace(/^(nome|cliente|para):/i, '').trim();
            } 
            else if (lower.startsWith('end:') || lower.startsWith('endereço:') || lower.startsWith('entrega:') || lower.startsWith('rua:') || lower.startsWith('av:')) {
                extractedAddress = cleanLine.replace(/^(end|endereço|entrega|rua|av):/i, '').trim();
            }
            else if (!extractedAddress && (lower.includes('rua ') || lower.includes('av ') || lower.includes('bairro '))) {
                 extractedAddress = cleanLine;
            }
            
            if (!extractedPhone && (lower.startsWith('tel:') || lower.startsWith('cel:') || lower.startsWith('contato:') || lower.startsWith('fone:'))) {
                 const rawPhone = cleanLine.replace(/^(tel|cel|contato|fone):/i, '').trim().replace(/\D/g, '');
                 if (rawPhone.length >= 10) extractedPhone = rawPhone;
                 if (extractedPhone.startsWith('55') && extractedPhone.length >= 12) extractedPhone = extractedPhone.substring(2);
            }
        });

        if (!extractedName && lines.length > 0) {
             const firstLine = lines[0].trim();
             if (firstLine.length < 30 && !firstLine.includes(':') && firstLine.length > 2) {
                 extractedName = firstLine;
             }
        }

        if (extractedName) setClientName(extractedName);
        if (extractedAddress) setClientAddress(extractedAddress);
        
        if (extractedPhone) {
            const formatted = formatPhoneNumberDisplay(extractedPhone);
            setClientPhone(formatted);
        }
        
        setShowPasteModal(false);
        setPasteText('');
        showToast("Dados processados e preenchidos!", "success");
    };

    const handleSubmit = () => {
        if (!clientName) return showToast('Informe o nome do cliente', 'error');
        if (cart.length === 0) return showToast('Adicione itens ao pedido', 'error');

        const itemsText = cart.map(i => `${i.quantity}x ${i.product.name}${i.obs ? ` (${i.obs})` : ''}`).join('\n');
        const fee = parseFloat(deliveryFee.replace(',', '.')) || 0;
        
        const restaurantCode = Math.floor(1000 + Math.random() * 9000).toString();
        const deliveryConfirmationCode = Math.floor(1000 + Math.random() * 9000).toString();

        const orderData = {
            customer: clientName,
            phone: clientPhone,
            address: serviceType === 'delivery' ? clientAddress : 'Retirada no Balcão',
            mapsLink,
            items: itemsText,
            value: finalTotal,
            deliveryFee: fee,
            paymentMethod,
            status: 'pending',
            origin: 'manual',
            serviceType,
            obs: generalObs,
            amount: formatCurrency(finalTotal),
            restaurantCode,
            deliveryConfirmationCode,
            driverId: ''
        };

        onCreateOrder(orderData);
        
        setCart([]);
        setClientName('');
        setClientPhone('');
        setClientAddress('');
        setGeneralObs('');
        setDeliveryFee('');
        setMobileTab('menu');
        
        showToast('Pedido criado com sucesso!', 'success');
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-950 overflow-hidden relative">
            
            {/* --- LEFT SIDE: MENU (Products) --- */}
            <div className={`flex-1 flex-col min-w-0 ${mobileTab === 'menu' ? 'flex' : 'hidden md:flex'} pb-24 md:pb-0 h-full`}>
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-amber-500 transition-colors text-sm"
                            placeholder="Buscar produto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategory === cat ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-950 custom-scrollbar space-y-6">
                    {groupedProducts.map(([category, items]) => (
                        <div key={category}>
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2 border-l-4 border-amber-500 pl-2">
                                {category}
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {items.map(product => (
                                    <button 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="bg-slate-900 border border-slate-800 p-2 rounded-lg hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between relative overflow-hidden active:scale-95"
                                    >
                                        <div className="z-10 relative w-full flex gap-3">
                                            {/* MINIATURA NOVO PEDIDO */}
                                            <div className="w-12 h-12 bg-slate-800 rounded-lg shrink-0 overflow-hidden">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Utensils size={16}/></div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-1">
                                                    <span className="font-bold text-white text-xs leading-tight line-clamp-2 flex-1">{product.name}</span>
                                                </div>
                                                <span className="text-emerald-400 font-bold text-xs whitespace-nowrap block mt-1">{formatCurrency(product.price)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-end border-t border-slate-800 pt-1">
                                            <div className="bg-slate-800/50 p-1 rounded text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                                <Plus size={10}/>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {groupedProducts.length === 0 && (
                        <div className="text-center text-slate-500 py-10 text-sm">Nenhum produto encontrado.</div>
                    )}
                </div>
            </div>

            {/* --- RIGHT SIDE: ORDER FORM --- */}
            <div className={`w-full md:w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 ${mobileTab === 'cart' ? 'flex' : 'hidden md:flex'} pb-24 md:pb-0 h-full`}>
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                        Novo Pedido
                    </h2>
                    <button onClick={() => setShowPasteModal(true)} className="text-[10px] flex items-center gap-1 text-amber-500 hover:text-amber-400 font-bold border border-amber-500/30 px-2 py-1 rounded bg-amber-900/10 transition-colors">
                        <Clipboard size={12}/> Colar Dados
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* CLIENT INFO */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dados do Cliente</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-8 pr-2 text-xs text-white outline-none focus:border-amber-500" 
                                    placeholder="Telefone (Busca)"
                                    value={clientPhone}
                                    onChange={e => setClientPhone(formatPhoneNumberDisplay(e.target.value))}
                                />
                            </div>
                            
                            {/* NOME COM SUGESTÕES */}
                            <div className="relative" ref={nameInputRef}>
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-8 pr-2 text-xs text-white outline-none focus:border-amber-500" 
                                    placeholder="Nome"
                                    value={clientName}
                                    onChange={handleNameChange}
                                    onFocus={() => { if(nameSuggestions.length > 0) setShowNameSuggestions(true); }}
                                    autoComplete="off"
                                />
                                {showNameSuggestions && nameSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                        {nameSuggestions.map(suggestion => (
                                            <button
                                                key={suggestion.id}
                                                onClick={() => selectClientFromName(suggestion)}
                                                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
                                            >
                                                <span className="font-bold block">{suggestion.name}</span>
                                                <span className="text-[10px] text-slate-400">{formatPhoneNumberDisplay(suggestion.phone)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <input 
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-8 pr-2 text-xs text-white outline-none focus:border-amber-500" 
                                placeholder="Endereço Completo"
                                value={clientAddress}
                                onChange={e => setClientAddress(e.target.value)}
                            />
                        </div>
                        
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder:text-slate-600" 
                            placeholder="Link do Google Maps (Opcional)"
                            value={mapsLink}
                            onChange={e => setMapsLink(e.target.value)}
                        />
                    </div>

                    {/* SERVICE TYPE */}
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button onClick={() => setServiceType('delivery')} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${serviceType === 'delivery' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                            <Bike size={14}/> Entrega
                        </button>
                        <button onClick={() => setServiceType('pickup')} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${serviceType === 'pickup' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                            <Store size={14}/> Retira
                        </button>
                    </div>

                    {/* CART ITEMS */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                            Itens ({cart.length})
                            <span onClick={() => setCart([])} className="cursor-pointer hover:text-red-500 text-[9px]">Limpar</span>
                        </p>
                        
                        {cart.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 text-xs">
                                Carrinho vazio
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white flex-1">{item.product.name}</span>
                                        <span className="text-xs font-bold text-emerald-400 ml-2">{formatCurrency(item.product.price * item.quantity)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <input 
                                            className="bg-transparent text-[10px] text-slate-400 outline-none w-full placeholder:text-slate-700" 
                                            placeholder="Obs: Sem cebola..."
                                            value={item.obs}
                                            onChange={e => updateItemObs(idx, e.target.value)}
                                        />
                                        <div className="flex items-center bg-slate-900 rounded border border-slate-800 ml-2">
                                            <button onClick={() => updateQuantity(idx, -1)} className="px-2 text-slate-400 hover:text-white"><Minus size={10}/></button>
                                            <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(idx, 1)} className="px-2 text-slate-400 hover:text-white"><Plus size={10}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* GENERAL OBS & FEES */}
                    <div>
                        <textarea 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white outline-none focus:border-amber-500 h-16 resize-none mb-3"
                            placeholder="Observação Geral do Pedido..."
                            value={generalObs}
                            onChange={e => setGeneralObs(e.target.value)}
                        />
                        
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                                <span className="text-white">{formatCurrency(cartTotal)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold uppercase flex items-center gap-1"><Bike size={12}/> Taxa Entrega</span>
                                <input 
                                    className="w-20 bg-slate-900 border border-slate-700 rounded p-1 text-right text-white text-xs outline-none focus:border-amber-500"
                                    placeholder="0,00"
                                    value={deliveryFee}
                                    onChange={e => setDeliveryFee(e.target.value)}
                                    type="number"
                                />
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                                <span className="text-xs text-emerald-400 font-bold uppercase">Total Final</span>
                                <span className="text-xl font-black text-white">{formatCurrency(finalTotal)}</span>
                            </div>
                            
                            {/* NEW ICON BASED PAYMENT SELECTION */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Forma de Pagamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setPaymentMethod('PIX')}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod === 'PIX' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                                    >
                                        <PixIcon size={20} className="mb-1"/>
                                        <span className="text-[10px] font-bold">PIX</span>
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod('Dinheiro')}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod === 'Dinheiro' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                                    >
                                        <Banknote size={20} className="mb-1"/>
                                        <span className="text-[10px] font-bold">Dinheiro</span>
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod('Cartão')}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod.includes('Cartão') ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                                    >
                                        <CreditCard size={20} className="mb-1"/>
                                        <span className="text-[10px] font-bold">Cartão</span>
                                    </button>
                                </div>
                            </div>

                            {/* PIX COPIA E COLA AUTOMÁTICO */}
                            {paymentMethod === 'PIX' && pixPayload && (
                                <div className="animate-in slide-in-from-top-2 bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-emerald-400 overflow-hidden">
                                        <QrCode size={16} className="shrink-0"/>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold uppercase">Pix Gerado</span>
                                            <span className="text-[9px] text-slate-400 truncate w-full max-w-[150px]">{pixPayload}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCopyPix}
                                        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all shadow ${pixCopied ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                                    >
                                        {pixCopied ? <Check size={12}/> : <Copy size={12}/>}
                                        {pixCopied ? 'Copiado' : 'Copiar Código'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button 
                        onClick={handleSubmit}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wide flex items-center justify-center gap-2"
                    >
                        Confirmar Pedido <CheckCircle2 size={18}/>
                    </button>
                </div>
            </div>

            {/* MOBILE TABS - BOTTOM POSITION */}
            <div className="md:hidden flex bg-slate-900 border-t border-slate-800 shrink-0 absolute bottom-0 w-full z-30">
                <button 
                    onClick={() => setMobileTab('menu')}
                    className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 ${mobileTab === 'menu' ? 'text-amber-500 bg-slate-800' : 'text-slate-500'}`}
                >
                    <Utensils size={20}/> Cardápio
                </button>
                <button 
                    onClick={() => setMobileTab('cart')}
                    className={`flex-1 py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 ${mobileTab === 'cart' ? 'text-emerald-500 bg-slate-800' : 'text-slate-500'}`}
                >
                    <ShoppingBag size={20}/> Pedido ({cart.reduce((a,b)=>a+b.quantity,0)})
                </button>
            </div>

            {/* PASTE MODAL */}
            {showPasteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Colar do WhatsApp</h3>
                            <button onClick={() => setShowPasteModal(false)}><X className="text-slate-500 hover:text-white"/></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">Copie a mensagem do cliente e cole abaixo. Tentaremos extrair Nome, Endereço e Telefone.</p>
                        <textarea 
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 mb-4 font-mono"
                            placeholder={"Nome: João\nEndereço: Rua das Flores, 123\nTel: 11999999999"}
                            value={pasteText}
                            onChange={e => setPasteText(e.target.value)}
                        />
                        <button onClick={handlePasteFromWhatsApp} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl">Processar Texto</button>
                    </div>
                </div>
            )}
        </div>
    );
}