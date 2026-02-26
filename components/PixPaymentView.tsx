
import React, { useEffect, useState, useMemo } from 'react';
import { Order, AppConfig } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatCurrency, generatePixPayload, copyToClipboard, normalizePhone, formatOrderId } from '../utils';
import { CheckCircle2, Copy, AlertCircle, ShoppingBag, Loader2, Share2, Lock, MessageCircle } from 'lucide-react';
import { PixIcon } from './Shared';

interface PixViewProps {
    orderId: string;
    appConfig: AppConfig;
    onBack: () => void;
}

export default function PixPaymentView({ orderId, appConfig, onBack }: PixViewProps) {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setError('ID do pedido inválido.');
                setLoading(false);
                return;
            }

            try {
                // Tenta buscar documento direto
                const docRef = doc(db, 'orders', orderId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setOrder({ ...docSnap.data(), id: docSnap.id } as Order);
                } else {
                    setError('Pedido não encontrado.');
                }
            } catch (err) {
                console.error(err);
                setError('Erro ao buscar pedido.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const pixData = useMemo(() => {
        if (!order || !appConfig.pixKey) return null;
        
        // Validação de Expiração (Ex: 24h após criação)
        const createdAt = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
        const now = new Date();
        const diffHours = Math.abs(now.getTime() - createdAt.getTime()) / 36e5;
        const isExpired = diffHours > 24 || order.status === 'cancelled';

        const payload = generatePixPayload(
            appConfig.pixKey, 
            appConfig.pixName || '', 
            appConfig.pixCity || '', 
            order.value, 
            order.id
        );

        return { payload, isExpired };
    }, [order, appConfig]);

    const handleCopy = () => {
        if (pixData?.payload) {
            copyToClipboard(pixData.payload);
            setCopied(true);
            if (navigator.vibrate) navigator.vibrate(50); // Feedback tátil
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleWhatsAppReturn = () => {
        if (appConfig.storePhone) {
            const phone = normalizePhone(appConfig.storePhone);
            const text = `Olá! Já realizei o pagamento do pedido ${formatOrderId(orderId)}.`;
            window.location.href = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
                <Loader2 size={48} className="text-emerald-500 animate-spin mb-4"/>
                <p className="text-sm font-medium text-slate-400">Carregando dados do pagamento...</p>
            </div>
        );
    }

    if (error || !order || !pixData) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/10">
                    <AlertCircle size={40} className="text-red-500"/>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado.</h2>
                <p className="text-slate-400 mb-8">{error || 'Configuração PIX inválida.'}</p>
                <button onClick={onBack} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm">
                    Voltar ao Início
                </button>
            </div>
        );
    }

    if (pixData.isExpired) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-amber-900/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-amber-500/10">
                    <AlertCircle size={40} className="text-amber-500"/>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Código Expirado</h2>
                <p className="text-slate-400 mb-8 max-w-xs mx-auto">Este pedido é antigo ou foi cancelado. Por favor, entre em contato com o estabelecimento.</p>
                <button onClick={handleWhatsAppReturn} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
                    <MessageCircle size={18}/> Falar no WhatsApp
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col text-white font-sans">
            {/* Header Seguro */}
            <div className="p-4 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    {appConfig.appLogoUrl ? (
                        <img src={appConfig.appLogoUrl} className="w-full h-full rounded-full object-cover"/>
                    ) : (
                        <ShoppingBag size={18} className="text-slate-400"/>
                    )}
                </div>
                <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pagamento Seguro</p>
                    <h1 className="text-sm font-bold text-white">{appConfig.appName}</h1>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-700">
                
                {/* Card Valor */}
                <div className="text-center mb-8 mt-4">
                    <p className="text-slate-400 text-sm font-medium mb-1">Valor Total do Pedido</p>
                    <h2 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
                        {formatCurrency(order.value)}
                    </h2>
                    <div className="inline-flex items-center gap-2 mt-3 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-mono text-slate-300">Pedido #{formatOrderId(order.id).replace('#','')}</span>
                    </div>
                </div>

                {/* Área de Ação Principal */}
                <div className="w-full bg-slate-900 rounded-3xl border border-slate-800 p-1 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500"></div>
                    
                    <div className="p-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                            <PixIcon size={32}/>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2 text-center">Pix Copia e Cola</h3>
                        <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
                            Clique no botão abaixo para copiar o código, abra o app do seu banco e escolha a opção <b>"Pix Copia e Cola"</b>.
                        </p>

                        <button 
                            onClick={handleCopy}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden
                                ${copied 
                                    ? 'bg-emerald-500 text-white scale-[1.02]' 
                                    : 'bg-white hover:bg-slate-100 text-slate-900'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 size={20} className="animate-bounce"/>
                                    <span>Código Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={20}/>
                                    <span>Copiar Código Pix</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Fallback Textarea (Visualmente oculto mas acessível) */}
                    <div className="bg-black/40 p-4 border-t border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 text-center">Código para cópia manual</p>
                        <div className="relative">
                            <textarea 
                                readOnly
                                value={pixData.payload}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] text-slate-400 font-mono h-20 resize-none outline-none focus:border-slate-700"
                                onClick={(e) => e.currentTarget.select()}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 w-full space-y-3">
                    <button 
                        onClick={handleWhatsAppReturn}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Share2 size={18} className="text-emerald-400"/>
                        Já paguei, enviar comprovante
                    </button>
                    
                    <button onClick={onBack} className="w-full text-slate-500 font-bold text-xs py-3 hover:text-white transition-colors">
                        Voltar para a Loja
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-600 flex items-center justify-center gap-1">
                        <Lock size={10}/> Ambiente Seguro 256-bit SSL
                    </p>
                </div>
            </div>
        </div>
    );
}
