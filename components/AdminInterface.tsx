import React, { useState, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, ShoppingBag, Utensils, Users, 
    Bike, BarChart3, Settings, LogOut, Menu, X, 
    ChefHat, ClipboardList, Box, Package, PlusCircle, MoreHorizontal, Grid, Gift, BellRing, ArrowRight
} from 'lucide-react';
import { MonitoringView } from './MonitoringView';
import { DailyOrdersView } from './DailyOrdersView';
import { KitchenDisplay } from './KitchenDisplay';
import { MenuManager } from './MenuManager';
import { ClientsView } from './ClientsView';
import { InventoryManager } from './InventoryManager';
import { AnalyticsView } from './AnalyticsView';
import { ItemReportView } from './ItemReportView';
import { NewOrderView } from './NewOrderView';
import { GiveawayLiveView } from './GiveawayLiveView';
import { BrandLogo, SidebarBtn } from './Shared';
import { Driver, Order } from '../types';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function AdminInterface(props: any) {
    const [view, setView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [fleetSidebarOpen, setFleetSidebarOpen] = useState(false);
    const [newOrderAlert, setNewOrderAlert] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(new Audio(NOTIFICATION_SOUND));

    const knownOrderIds = useRef<Set<string>>(new Set(props.orders.filter((o: Order) => o.status === 'pending').map((o: Order) => o.id)));

    useEffect(() => {
        const pendingOrders = props.orders.filter((o: Order) => o.status === 'pending');
        
        let hasNew = false;
        pendingOrders.forEach((o: Order) => {
            if (!knownOrderIds.current.has(o.id)) {
                knownOrderIds.current.add(o.id);
                hasNew = true;
            }
        });

        if (hasNew) {
            setNewOrderAlert(true);
            
            try {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.warn("Autoplay bloqueado pelo navegador:", e));
            } catch (error) {
                console.error("Erro ao tocar som:", error);
            }

            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }, [props.orders]);

    const handleGoToKitchen = () => {
        setNewOrderAlert(false);
        setView('kitchen');
    };

    const renderContent = () => {
        switch(view) {
            case 'dashboard':
                return <MonitoringView 
                            drivers={props.drivers} 
                            orders={props.orders} 
                            vales={props.vales}
                            center={props.appConfig.location} 
                            onNavigate={setView}
                            onDeleteDriver={props.onDeleteDriver}
                            onUpdateDriver={props.onUpdateDriver} // ✅ AQUI ESTAVA FALTANDO O "FIO" DE ATUALIZAR O STATUS
                            setDriverToEdit={props.setModalData}
                            setModal={props.setModal}
                            onCloseCycle={props.onCloseCycle}
                            isFleetOpen={fleetSidebarOpen}
                            setIsFleetOpen={setFleetSidebarOpen}
                            appConfig={props.appConfig}
                        />;
            case 'new_order':
                return <NewOrderView 
                            products={props.products} 
                            appConfig={props.appConfig} 
                            onCreateOrder={props.onCreateOrder} 
                            clients={props.clients}
                        />;
            case 'kitchen':
                return <KitchenDisplay 
                            orders={props.orders} 
                            products={props.products}
                            drivers={props.drivers}
                            onUpdateStatus={(id, st) => props.onUpdateOrder(id, st)}
                            onDeleteOrder={props.onDeleteOrder}
                            appConfig={props.appConfig}
                            onEditOrder={(o) => { props.setModalData(o); props.setModal('editOrder'); }}
                            disableSound={true}
                        />;
            case 'orders':
                return <DailyOrdersView 
                            orders={props.orders} 
                            drivers={props.drivers} 
                            onDeleteOrder={props.onDeleteOrder} 
                            setModal={props.setModal} 
                            onUpdateOrder={props.onUpdateOrder}
                            appConfig={props.appConfig}
                        />;
            case 'menu':
                return <MenuManager 
                            products={props.products} 
                            inventory={props.inventory}
                            onCreate={props.onCreateProduct} 
                            onUpdate={props.onUpdateProduct} 
                            onDelete={props.onDeleteProduct} 
                        />;
            case 'clients':
                return <ClientsView 
                            clients={props.clients} 
                            orders={props.orders} 
                            giveawayEntries={props.giveawayEntries}
                            setModal={props.setModal} 
                            setClientToEdit={props.setClientToEdit}
                            appConfig={props.appConfig}
                            onCreateOrder={props.onCreateOrder}
                            onDeleteGiveawayEntry={props.onDeleteGiveawayEntry}
                            onNavigateToLive={() => setView('giveaway_live')}
                        />;
            case 'giveaway_live':
                return <GiveawayLiveView 
                            entries={props.giveawayEntries}
                            pastWinners={props.giveawayWinners}
                            onSaveWinner={props.onRegisterWinner}
                            appConfig={props.appConfig}
                            onBack={() => setView('clients')}
                        />;
            case 'inventory':
                return <InventoryManager 
                            inventory={props.inventory}
                            suppliers={props.suppliers}
                            shoppingList={props.shoppingList}
                            onCreateSupplier={props.onCreateSupplier}
                            onUpdateSupplier={props.onUpdateSupplier}
                            onDeleteSupplier={props.onDeleteSupplier}
                            onCreateInventory={props.onCreateInventory}
                            onUpdateInventory={props.onUpdateInventory}
                            onDeleteInventory={props.onDeleteInventory}
                            onAddShoppingItem={props.onAddShoppingItem}
                            onToggleShoppingItem={props.onToggleShoppingItem}
                            onDeleteShoppingItem={props.onDeleteShoppingItem}
                            onClearShoppingList={props.onClearShoppingList}
                            appConfig={props.appConfig}
                        />;
            case 'analytics':
                return <AnalyticsView 
                            orders={props.orders} 
                            products={props.products} 
                            siteVisits={props.siteVisits}
                        />;
            case 'report':
                return <ItemReportView orders={props.orders} />;
            default:
                return <MonitoringView drivers={props.drivers} orders={props.orders} appConfig={props.appConfig} />;
        }
    };

    if (view === 'giveaway_live') {
        return renderContent();
    }

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans relative">
            
            {/* GLOBAL NEW ORDER MODAL */}
            {newOrderAlert && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 w-full max-w-sm rounded-3xl border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)] p-8 relative text-center">
                        <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <BellRing size={40} className="text-white"/>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase">Novo Pedido!</h2>
                        <p className="text-slate-400 text-sm mb-8">Um novo pedido acabou de chegar. Vá para a cozinha para preparar.</p>
                        
                        <button 
                            onClick={handleGoToKitchen}
                            className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-wide text-sm"
                        >
                            Ver na Cozinha <ArrowRight size={20}/>
                        </button>
                        
                        <button 
                            onClick={() => setNewOrderAlert(false)}
                            className="mt-4 text-xs font-bold text-slate-500 hover:text-white"
                        >
                            Fechar e continuar aqui
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar Mobile Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed md:relative z-[70] w-64 md:w-[270px] h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <BrandLogo config={props.appConfig} />
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar flex flex-col">
                    
                    <p className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 mt-1">Principal</p>
                    <SidebarBtn icon={<LayoutDashboard size={20}/>} label="Visão Geral" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setSidebarOpen(false); }} />
                    <SidebarBtn icon={<ClipboardList size={20}/>} label="Pedidos" active={view === 'orders'} onClick={() => { setView('orders'); setSidebarOpen(false); }} />
                    <SidebarBtn icon={<Utensils size={20}/>} label="Cardápio" active={view === 'menu'} onClick={() => { setView('menu'); setSidebarOpen(false); }} />
                    
                    <button 
                        onClick={() => { setView('kitchen'); setSidebarOpen(false); }} 
                        className={`w-full flex items-center justify-start gap-4 p-3.5 rounded-xl transition-all border-2 mb-2 mt-1
                        ${view === 'kitchen' 
                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/20 font-bold' 
                            : 'bg-orange-900/10 border-orange-500/30 text-orange-400 hover:bg-orange-900/30 hover:text-orange-300'
                        }`}
                        title="Cozinha (KDS)" 
                    >
                      <div className="shrink-0"><ChefHat size={20}/></div>
                      <span className="font-bold text-sm block tracking-wide uppercase">Cozinha (KDS)</span>
                    </button>

                    <div className="py-2 px-1">
                        <button 
                            onClick={() => { setView('new_order'); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-xl transition-all shadow-lg font-bold text-sm uppercase tracking-wide ${view === 'new_order' ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-800 hover:bg-emerald-600 text-white border border-slate-700'}`}
                        >
                            <PlusCircle size={20}/> NOVO PEDIDO
                        </button>
                    </div>

                    <p className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 mt-2">Operacional</p>
                    <SidebarBtn icon={<Users size={20}/>} label="Clientes" active={view === 'clients'} onClick={() => { setView('clients'); setSidebarOpen(false); }} />
                    <SidebarBtn icon={<Box size={20}/>} label="Estoque & Compras" active={view === 'inventory'} onClick={() => { setView('inventory'); setSidebarOpen(false); }} />

                    <p className="text-[10px] uppercase font-bold text-slate-500 px-4 mb-2 mt-2">Gestão</p>
                    <SidebarBtn icon={<BarChart3 size={20}/>} label="Analytics" active={view === 'analytics'} onClick={() => { setView('analytics'); setSidebarOpen(false); }} />
                    <SidebarBtn icon={<Package size={20}/>} label="Relatório de Itens" active={view === 'report'} onClick={() => { setView('report'); setSidebarOpen(false); }} />
                    <SidebarBtn icon={<Settings size={20}/>} label="Configurações" active={false} onClick={() => { props.setModal('settings'); setSidebarOpen(false); }} />

                    <div className="mt-auto pt-4 border-t border-slate-800">
                        <button onClick={props.onLogout} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors">
                            <LogOut size={20}/> <span className="font-medium text-sm">Sair do Sistema</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
                <header className="md:hidden bg-[#0f172a] border-b border-slate-800 p-4 flex justify-between items-center shrink-0 z-20 h-[60px]">
                    <BrandLogo size="small" config={props.appConfig} />
                    
                    {view === 'dashboard' && (
                        <button 
                            onClick={() => setFleetSidebarOpen(!fleetSidebarOpen)}
                            className={`p-2 rounded-lg transition-colors ${fleetSidebarOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Bike size={20}/>
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {renderContent()}
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="md:hidden bg-[#0f172a] border-t border-slate-800 flex justify-between items-center px-4 pb-safe h-[70px] fixed bottom-0 w-full z-50">
                    <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center gap-1 ${view === 'dashboard' ? 'text-amber-500' : 'text-slate-500'}`}>
                        <Grid size={20} />
                        <span className="text-[10px] font-medium">Painel</span>
                    </button>
                    
                    <button onClick={() => setView('orders')} className={`flex flex-col items-center justify-center gap-1 ${view === 'orders' ? 'text-amber-500' : 'text-slate-500'}`}>
                        <ClipboardList size={20} />
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </button>

                    <div className="relative -top-5">
                        <button 
                            onClick={() => setView('new_order')}
                            className="w-14 h-14 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 transition-transform"
                        >
                            <PlusCircle size={28} strokeWidth={2.5} />
                        </button>
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-400 w-full text-center">Novo</span>
                    </div>

                    <button onClick={() => setView('kitchen')} className={`flex flex-col items-center justify-center gap-1 ${view === 'kitchen' ? 'text-amber-500' : 'text-slate-500'}`}>
                        <ChefHat size={20} />
                        <span className="text-[10px] font-medium">Cozinha</span>
                    </button>

                    <button onClick={() => setSidebarOpen(true)} className={`flex flex-col items-center justify-center gap-1 ${sidebarOpen ? 'text-white' : 'text-slate-500'}`}>
                        <MoreHorizontal size={20} />
                        <span className="text-[10px] font-medium">Mais</span>
                    </button>
                </div>
                
                <div className="h-[70px] md:hidden"></div>
            </main>
        </div>
    );
}