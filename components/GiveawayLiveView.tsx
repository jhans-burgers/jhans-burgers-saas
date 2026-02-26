
import React, { useState, useEffect, useRef } from 'react';
import { GiveawayEntry, AppConfig, GiveawayWinner } from '../types';
import { Trophy, ArrowLeft, Shuffle, Sparkles, Instagram, Phone, User, Calendar, Mail, HelpCircle, Expand, Minimize, RotateCcw, Trash2, PartyPopper, X, History as HistoryIcon } from 'lucide-react';
import { normalizePhone, formatDate } from '../utils';

interface GiveawayLiveProps {
    entries: GiveawayEntry[];
    pastWinners: GiveawayWinner[]; // Histórico persistente do Firebase
    onSaveWinner: (winnerData: any) => void;
    appConfig: AppConfig;
    onBack: () => void;
}

// --- COMPONENTE DE CONFETE (CANVAS) ---
const ConfettiCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: any[] = [];
        const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                w: Math.random() * 10 + 5,
                h: Math.random() * 10 + 5,
                dx: (Math.random() - 0.5) * 20,
                dy: (Math.random() - 0.5) * 20,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.5,
                drag: 0.96,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        let animationId: number;

        const render = () => {
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.x += p.dx;
                p.y += p.dy;
                p.dy += p.gravity;
                p.dx *= p.drag;
                p.dy *= p.drag;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();

                if (p.y > canvas.height) particles.splice(index, 1);
            });

            if (particles.length > 0) {
                animationId = requestAnimationFrame(render);
            }
        };

        render();

        return () => cancelAnimationFrame(animationId);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none" />;
};

export function GiveawayLiveView({ entries, pastWinners, onSaveWinner, appConfig, onBack }: GiveawayLiveProps) {
    const [isRolling, setIsRolling] = useState(false);
    const [displayEntry, setDisplayEntry] = useState<GiveawayEntry | null>(null);
    const [winner, setWinner] = useState<GiveawayEntry | null>(null);
    const [localHistory, setLocalHistory] = useState<GiveawayEntry[]>([]); // Apenas desta sessão
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [historyMode, setHistoryMode] = useState<'session' | 'all'>('session');
    
    // Filtra campos para exibir no card do vencedor
    const fields = appConfig.giveawaySettings?.fields || [];

    // Função para alternar tela cheia
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const handleSortear = () => {
        if (entries.length === 0) return;
        
        setIsRolling(true);
        setWinner(null);
        setShowConfetti(false);
        
        let counter = 0;
        const maxShuffles = 50; 
        
        const interval = setInterval(() => {
            const random = entries[Math.floor(Math.random() * entries.length)];
            setDisplayEntry(random);
            counter++;

            if (counter >= maxShuffles) {
                clearInterval(interval);
                const finalWinner = entries[Math.floor(Math.random() * entries.length)];
                setDisplayEntry(finalWinner);
                setWinner(finalWinner);
                
                // 1. Salvar na sessão local
                setLocalHistory(prev => [finalWinner, ...prev]);
                
                // 2. Salvar no Banco de Dados (Persistência)
                if (onSaveWinner) {
                    onSaveWinner({
                        entryId: finalWinner.id,
                        name: finalWinner.name,
                        phone: finalWinner.phone,
                        prize: appConfig.giveawaySettings?.title || 'Prêmio Sorteio',
                        // wonAt será adicionado no backend com serverTimestamp
                    });
                }

                setIsRolling(false);
                setShowConfetti(true);
                
                // Efeito sonoro simples
                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
            }
        }, 80);
    };

    const resetStage = () => {
        setWinner(null);
        setDisplayEntry(null);
        setShowConfetti(false);
    };

    const clearLocalHistory = () => {
        if (window.confirm("Isso limpará apenas a visualização desta sessão. O histórico no banco de dados não será apagado.")) {
            setLocalHistory([]);
        }
    };

    const getFieldValue = (entry: GiveawayEntry, fieldId: string) => {
        return entry.dynamicData?.[fieldId] || (entry as any)[fieldId] || '';
    };

    const renderFieldIcon = (type: string, id: string) => {
        if (id === 'instagram') return <Instagram size={16} className="text-purple-400"/>;
        if (type === 'phone') return <Phone size={16} className="text-emerald-400"/>;
        if (type === 'email') return <Mail size={16} className="text-blue-400"/>;
        if (type === 'date') return <Calendar size={16} className="text-orange-400"/>;
        if (id === 'custom') return <HelpCircle size={16} className="text-amber-400"/>;
        return <User size={16} className="text-slate-400"/>;
    };

    // Mescla o histórico local (sessão) com o histórico do banco para exibição quando necessário
    const displayHistory = historyMode === 'session' ? localHistory : pastWinners;

    return (
        <div className="flex h-screen w-full bg-[#0f021a] text-white overflow-hidden font-sans selection:bg-purple-500/30">
            {showConfetti && <ConfettiCanvas />}

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            {/* --- LEFT COLUMN: PARTICIPANTS LIST --- */}
            <div className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-black/20 backdrop-blur-sm z-10">
                <div className="p-6 border-b border-white/10">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold mb-4">
                        <ArrowLeft size={16}/> Voltar
                    </button>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="text-purple-500"/> Participantes
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">{entries.length} inscritos validados</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {entries.map((entry, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border border-transparent transition-all ${winner?.id === entry.id ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'hover:bg-white/5 text-slate-300'}`}>
                            <p className="font-bold text-sm truncate">{entry.name}</p>
                            <p className="text-[10px] opacity-60 font-mono">
                                {fields.find(f => f.id === 'instagram')?.enabled 
                                    ? getFieldValue(entry, 'instagram') 
                                    : normalizePhone(entry.phone)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MAIN STAGE --- */}
            <div className="flex-1 flex flex-col relative z-10">
                {/* Header Controls */}
                <div className="absolute top-4 right-4 flex gap-2 z-50">
                    <button onClick={toggleFullScreen} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        {isFullscreen ? <Minimize size={20}/> : <Expand size={20}/>}
                    </button>
                </div>

                {/* Center Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                    
                    {/* Title */}
                    <div className={`text-center mb-8 transition-all duration-500 ${winner ? 'scale-75 opacity-50' : 'scale-100 opacity-100'}`}>
                        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.4)] mb-4">
                            <Trophy size={40} className="text-white drop-shadow-md"/>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 tracking-tight uppercase italic drop-shadow-sm">
                            {appConfig.giveawaySettings?.title || 'Grande Sorteio'}
                        </h1>
                    </div>

                    {/* The Stage / Card */}
                    <div className="relative w-full max-w-3xl aspect-video md:aspect-[2/1] flex items-center justify-center">
                        {/* Glow Behind */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-purple-600 via-amber-500 to-orange-600 rounded-3xl blur-3xl opacity-0 transition-all duration-500 ${isRolling ? 'opacity-30 animate-pulse' : ''} ${winner ? 'opacity-70 scale-110' : ''}`}></div>

                        <div className={`relative w-full h-full bg-[#1a0b2e] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${winner ? 'border-amber-500 ring-4 ring-amber-500/50 bg-gradient-to-b from-[#2a1b3d] to-[#1a0b2e]' : ''}`}>
                            
                            {/* Reset Stage Button (Only when winner is visible) */}
                            {winner && (
                                <button 
                                    onClick={resetStage}
                                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-slate-400 hover:text-white transition-colors z-20"
                                    title="Limpar Palco (Resetar)"
                                >
                                    <X size={20}/>
                                </button>
                            )}

                            {!displayEntry ? (
                                // Estado Inicial
                                <div className="text-center opacity-50 flex flex-col items-center animate-in fade-in">
                                    <Shuffle size={80} className="mx-auto mb-6 text-slate-600"/>
                                    <p className="text-2xl font-bold text-slate-500">Pronto para sortear?</p>
                                    <p className="text-sm text-slate-600 mt-2">Clique no botão abaixo</p>
                                </div>
                            ) : (
                                // Exibindo Nome (Rolando ou Vencedor)
                                <div className={`text-center w-full px-8 relative z-10 ${winner ? 'animate-in zoom-in duration-500' : ''}`}>
                                    {winner && (
                                        <div className="mb-6 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg uppercase tracking-widest shadow-lg animate-bounce">
                                            <Sparkles size={20}/> Vencedor!
                                        </div>
                                    )}
                                    
                                    <h2 className={`font-black text-white leading-none mb-6 break-words transition-all duration-300 ${winner ? 'text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110' : 'text-4xl md:text-6xl opacity-80'}`}>
                                        {displayEntry.name}
                                    </h2>

                                    {/* Dados Detalhados do Vencedor */}
                                    {winner && (
                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-amber-500/30 text-left animate-in slide-in-from-bottom-8 duration-700 delay-100">
                                            <div className="col-span-full pb-4 mb-2 border-b border-white/10 flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/20 rounded-xl"><Phone size={20} className="text-emerald-400"/></div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telefone</p>
                                                    <span className="font-mono text-xl text-emerald-300 font-bold tracking-wide">{normalizePhone(displayEntry.phone)}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Renderiza campos dinâmicos configurados */}
                                            {fields.filter(f => f.enabled && f.id !== 'name' && f.id !== 'phone').map(field => {
                                                const val = getFieldValue(displayEntry, field.id);
                                                if (!val) return null;
                                                return (
                                                    <div key={field.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                                        <div className="p-2 bg-white/10 rounded-lg">
                                                            {renderFieldIcon(field.type, field.id)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{field.label}</p>
                                                            <p className="text-sm font-medium text-white truncate">{val}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-10">
                        <button 
                            onClick={handleSortear}
                            disabled={isRolling}
                            className={`
                                group relative px-10 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all
                                ${isRolling 
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:shadow-[0_0_50px_rgba(147,51,234,0.7)] hover:-translate-y-1 active:translate-y-0 active:scale-95'
                                }
                            `}
                        >
                            <span className="flex items-center gap-3">
                                {isRolling ? <RefreshCw size={28} className="animate-spin"/> : <Sparkles size={28} className={winner ? "animate-pulse" : ""}/>}
                                {isRolling ? 'Sorteando...' : winner ? 'Sortear Novamente' : 'Sortear Agora'}
                            </span>
                        </button>
                    </div>

                </div>
            </div>
            
            {/* --- RIGHT COLUMN: HISTORY (Desktop only) --- */}
            <div className="hidden xl:flex w-72 flex-col border-l border-white/10 bg-black/20 backdrop-blur-sm z-10">
                <div className="p-4 border-b border-white/10 flex flex-col gap-2 bg-black/20">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide opacity-90 flex items-center gap-2">
                            <PartyPopper size={16} className="text-amber-500"/> Ganhadores
                        </h3>
                        {historyMode === 'session' && localHistory.length > 0 && (
                            <button 
                                onClick={clearLocalHistory} 
                                className="p-1.5 hover:bg-red-900/30 rounded text-slate-500 hover:text-red-400 transition-colors"
                                title="Limpar Histórico da Sessão"
                            >
                                <Trash2 size={16}/>
                            </button>
                        )}
                    </div>
                    
                    {/* Toggle de Histórico */}
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <button 
                            onClick={() => setHistoryMode('session')}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${historyMode === 'session' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sessão Atual
                        </button>
                        <button 
                            onClick={() => setHistoryMode('all')}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${historyMode === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Histórico Geral
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {displayHistory.length === 0 ? (
                        <div className="text-center py-10 opacity-30">
                            <Trophy size={32} className="mx-auto mb-2"/>
                            <p className="text-xs">Nenhum ganhador {historyMode === 'session' ? 'nesta sessão' : 'registrado'}</p>
                        </div>
                    ) : (
                        displayHistory.map((h: any, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 animate-in slide-in-from-right-2 hover:bg-white/10 transition-colors group">
                                <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs border shadow-sm shrink-0 ${historyMode === 'session' ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300/50' : 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400/50'}`}>
                                    {historyMode === 'session' ? `${localHistory.length - i}º` : <HistoryIcon size={12}/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm truncate text-white group-hover:text-amber-300 transition-colors">{h.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{normalizePhone(h.phone)}</p>
                                    
                                    {/* Data no histórico geral */}
                                    {historyMode === 'all' && h.wonAt && (
                                        <p className="text-[9px] text-slate-500 mt-0.5">{formatDate(h.wonAt)}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Icon helper for the button
function RefreshCw({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    )
}
