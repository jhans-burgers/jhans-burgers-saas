import React, { useMemo } from 'react';
import { Driver, Order, Vale, AppConfig } from '../types';
import { formatCurrency, formatTime } from '../utils';
import { Battery, Bike, DollarSign, ShoppingBag, Clock, User, Signal, Wallet, MapPin, Ban, CheckCircle } from 'lucide-react';

interface DriverCardProps {
    driver: Driver;
    orders: Order[];
    vales?: Vale[];
    onEdit: () => void;
    onToggleActive?: (id: string, isActive: boolean) => void;
    onCloseCycle?: (driverId: string, data: any) => void;
}

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; 

const DriverCard: React.FC<DriverCardProps> = React.memo(({ driver, orders, vales = [], onEdit, onToggleActive, onCloseCycle }) => {
    const financial = useMemo(() => {
        const lastSettlement = driver.lastSettlementAt?.seconds || 0;
        
        const cycleOrders = orders.filter(o => 
            o.driverId === driver.id && 
            o.status === 'completed' && 
            (o.completedAt?.seconds || 0) > lastSettlement
        );

        const cycleVales = vales.filter(v => 
            v.driverId === driver.id && 
            (v.createdAt?.seconds || 0) > lastSettlement
        );

        let earnings = 0;
        if (driver.paymentModel === 'percentage') {
            earnings = cycleOrders.reduce((acc, o) => acc + (o.value * ((driver.paymentRate || 0) / 100)), 0);
        } else if (driver.paymentModel === 'salary') {
            earnings = 0;
        } else {
            const rate = driver.paymentRate !== undefined ? driver.paymentRate : 5.00;
            earnings = cycleOrders.length * rate;
        }

        const totalVales = cycleVales.reduce((acc, v) => acc + (Number(v.amount) || 0), 0);
        const toPay = earnings - totalVales;

        return {
            deliveriesCount: cycleOrders.length,
            deliveriesTotal: earnings,
            valesTotal: totalVales,
            toPay
        };
    }, [driver, orders, vales]);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit();
    };

    const handleToggleState = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (onToggleActive) {
            // Se ele for undefined, assumimos que é true (ativo)
            const currentStatus = driver.isActive !== undefined ? driver.isActive : true;
            onToggleActive(driver.id, !currentStatus);
        }
    };

    const handleCloseCycle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (onCloseCycle) {
            onCloseCycle(driver.id, {
                driverId: driver.id,
                driverName: driver.name,
                startAt: driver.lastSettlementAt,
                endAt: new Date(),
                ...financial,
                finalAmount: financial.toPay
            });
        }
    };

    const isOnline = driver.status !== 'offline';
    const isDelivering = driver.status === 'delivering';
    const isActive = driver.isActive !== undefined ? driver.isActive : true; // Motoboy inativado/suspenso

    // Se estiver inativo, ele fica com cor de bloqueado, independente de estar online ou não.
    const statusColor = !isActive ? 'text-red-500 bg-red-500/10 border-red-500/20'
                      : isDelivering ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                      : isOnline ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-slate-500 bg-slate-800 border-slate-700';

    const statusLabel = !isActive ? 'Suspenso'
                      : isDelivering ? 'Entregando' 
                      : isOnline ? 'Disponível'
                      : 'Offline';

    return (
        <div 
            onClick={handleEdit}
            className={`relative rounded-2xl border p-4 transition-all hover:border-slate-500 cursor-pointer group flex flex-col justify-between backdrop-blur-md ${(!isOnline || !isActive) ? 'bg-slate-950/60 border-slate-800 opacity-60 grayscale-[0.5]' : 'bg-slate-900/80 border-slate-700/50 shadow-xl'}`}
        >
            {/* ✅ NOVO BOTÃO DE SUSPENDER/REATIVAR MOTOBOY (PENALIDADE) */}
            {onToggleActive && (
                <button 
                    onClick={handleToggleState}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-all z-20 shadow-md border ${isActive ? 'bg-slate-900/80 text-slate-500 hover:text-red-500 border-slate-700' : 'bg-red-900/40 text-red-500 hover:text-emerald-500 border-red-500/30'}`}
                    title={isActive ? "Suspender Motoboy" : "Reativar Motoboy"}
                >
                    {isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                </button>
            )}

            <div className="flex items-start justify-between mb-4 pr-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={driver.avatar || DEFAULT_AVATAR} 
                            className="w-12 h-12 rounded-full object-cover bg-slate-800 border border-slate-700" 
                            alt={driver.name}
                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                        {(isOnline && isActive) && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDelivering ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-4 w-4 ${isDelivering ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            </span>
                        )}
                    </div>
                    <div>
                        <h4 className={`font-bold text-base leading-tight truncate max-w-[130px] ${!isActive ? 'text-red-400 line-through' : 'text-white'}`}>{driver.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border whitespace-nowrap ${statusColor}`}>
                                {statusLabel}
                            </span>
                            {driver.vehicle && <span className="text-[10px] text-slate-400 uppercase font-medium">{driver.vehicle}</span>}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 absolute bottom-[130px] right-4">
                    {isOnline && driver.battery !== undefined && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${driver.battery < 20 ? 'text-red-500' : 'text-slate-400'}`}>
                            <Battery size={12}/> {driver.battery}%
                        </div>
                    )}
                    {driver.lastUpdate && (
                        <div className="text-[9px] text-slate-500 flex items-center gap-1">
                            <Signal size={10}/> {formatTime(driver.lastUpdate)}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2 mb-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Entregas (Ciclo)</span>
                    <span className="text-white font-bold">{financial.deliveriesCount} <span className="text-slate-500">({formatCurrency(financial.deliveriesTotal)})</span></span>
                </div>
                {financial.valesTotal > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Vales</span>
                        <span className="text-red-400 font-bold">- {formatCurrency(financial.valesTotal)}</span>
                    </div>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">A Pagar</span>
                    <span className="text-sm font-black text-emerald-400">{formatCurrency(financial.toPay)}</span>
                </div>
            </div>

            <button 
                onClick={handleCloseCycle}
                className="w-full bg-slate-800/80 hover:bg-emerald-600 hover:text-white text-slate-300 font-bold text-xs py-2.5 rounded-lg transition-all border border-slate-700 hover:border-emerald-500 flex items-center justify-center gap-2 mt-auto backdrop-blur-sm"
            >
                <Wallet size={14}/> Fechar Ciclo & Pagar
            </button>
        </div>
    );
});

interface MonitoringProps {
    drivers: Driver[];
    orders: Order[];
    vales?: Vale[];
    center?: { lat: number; lng: number };
    onUpdateDriver?: (id: string, data: any) => void;
    setDriverToEdit?: (driver: any) => void;
    setModal?: (modal: any) => void;
    onCloseCycle?: (driverId: string, data: any) => void;
    isFleetOpen?: boolean;
    setIsFleetOpen?: (isOpen: boolean) => void;
    appConfig: AppConfig;
    onNavigate?: (view: string) => void;
}

export function MonitoringView({ 
    drivers, 
    orders, 
    vales = [],
    setDriverToEdit,
    setModal,
    onCloseCycle,
    onUpdateDriver
}: MonitoringProps) {
    
    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const startOfDaySeconds = now.getTime() / 1000;
        let sales = 0;
        let count = 0;
        let pending = 0;
        
        // Conta apenas motoristas ATIVOS E ONLINE
        const activeDrivers = drivers.filter(d => d.isActive !== false);
        const onlineDrivers = activeDrivers.filter(d => d.status !== 'offline').length;

        for (let i = 0; i < orders.length; i++) {
            const o = orders[i];
            const t = o.createdAt?.seconds || 0;
            if (t >= startOfDaySeconds) {
                count++;
                if (o.status === 'completed') sales += (o.value || 0);
            }
            if (o.status === 'pending' || o.status === 'preparing') pending++;
        }
        return { sales, count, online: onlineDrivers, pending };
    }, [orders, drivers]);

    const sortedDrivers = useMemo(() => {
        return [...drivers]
            .sort((a, b) => {
                // Suspense vai pro final da lista
                if (a.isActive === false && b.isActive !== false) return 1;
                if (a.isActive !== false && b.isActive === false) return -1;

                const statusOrder: any = { delivering: 3, available: 2, offline: 1 };
                const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
                if (statusDiff !== 0) return statusDiff;
                return (b.lastUpdate?.seconds || 0) - (a.lastUpdate?.seconds || 0);
            });
    }, [drivers]);

    return (
        <div className="flex-1 bg-slate-950 h-full flex flex-col overflow-hidden relative">
            <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1974&auto=format&fit=crop')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'grayscale(100%) contrast(1.1) brightness(0.6)'
                }}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/95 pointer-events-none"></div>

            <div className="flex flex-col h-full z-10 relative">
                <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 border-b border-white/5 shadow-sm bg-slate-950/50 backdrop-blur-sm">
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl flex items-center p-4 relative overflow-hidden backdrop-blur-md">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0 mr-4">
                            <DollarSign size={24} strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vendas Hoje</p>
                            <p className="text-xl md:text-2xl font-black text-white truncate">{formatCurrency(stats.sales)}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl flex items-center p-4 relative overflow-hidden backdrop-blur-md">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0 mr-4">
                            <ShoppingBag size={24} strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pedidos</p>
                            <p className="text-xl md:text-2xl font-black text-white truncate">{stats.count}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl flex items-center p-4 relative overflow-hidden backdrop-blur-md">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0 mr-4">
                            <Bike size={24} strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Online</p>
                            <p className="text-xl md:text-2xl font-black text-white truncate">{stats.online}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl flex items-center p-4 relative overflow-hidden backdrop-blur-md">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 mr-4 ${stats.pending > 0 ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/20 animate-pulse' : 'bg-gradient-to-br from-slate-700 to-slate-800'}`}>
                            <Clock size={24} strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pendentes</p>
                            <p className="text-xl md:text-2xl font-black text-white truncate">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-32">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <Bike className="text-emerald-500"/> Gestão da Frota
                        </h3>
                        <button 
                            onClick={() => { if(setDriverToEdit && setModal) { setDriverToEdit(null); setModal('driver_invite'); } }}
                            className="bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700/50 backdrop-blur-sm"
                        >
                            <User size={14}/> Novo Motoboy
                        </button>
                    </div>

                    {sortedDrivers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-3xl bg-slate-900/30 backdrop-blur-sm">
                            <Bike size={48} className="mb-4 opacity-20"/>
                            <p className="text-lg font-bold">Nenhum motoboy cadastrado.</p>
                            <p className="text-sm">Clique em "Novo Motoboy" para começar.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {sortedDrivers.map(driver => (
                                <DriverCard 
                                    key={driver.id}
                                    driver={driver}
                                    orders={orders}
                                    vales={vales}
                                    onEdit={() => { if(setDriverToEdit && setModal) { setDriverToEdit(driver); setModal('driver'); }}}
                                    onToggleActive={(id, isActive) => {
                                        if (onUpdateDriver) onUpdateDriver(id, { isActive, status: 'offline' });
                                    }}
                                    onCloseCycle={onCloseCycle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}