
import React, { useState, useMemo } from 'react';
import { Client, Order, GiveawayEntry, AppConfig } from '../types';
import { normalizePhone, formatCurrency, formatDate, downloadCSV } from '../utils';
import { Search, UploadCloud, Edit, ChevronDown, Star, Trophy, Crown, Medal, TrendingUp, Calendar, DollarSign, UserCheck, Gift, Download, CheckCircle2, PlusCircle, ShoppingBag, Settings, MonitorPlay } from 'lucide-react';
import { Footer } from './Shared';
import { GiveawayManagerModal, ManualOrderModal } from './Modals';

interface ClientsViewProps {
    clients: Client[];
    orders: Order[];
    giveawayEntries: GiveawayEntry[];
    setModal: (modal: any) => void;
    setClientToEdit: (client: any) => void;
    appConfig: AppConfig;
    onCreateOrder: (data: any) => void;
    onDeleteGiveawayEntry?: (id: string) => void; // New prop definition
    onNavigateToLive?: () => void; // New prop for Live View
}

export function ClientsView({ clients, orders, giveawayEntries, setModal, setClientToEdit, appConfig, onCreateOrder, onDeleteGiveawayEntry, onNavigateToLive }: ClientsViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleClientsCount, setVisibleClientsCount] = useState(20);
    const [rankingMode, setRankingMode] = useState<'spent' | 'count'>('spent'); // spent = Gastaram mais, count = Pediram mais
    const [showGiveawayModal, setShowGiveawayModal] = useState(false);
    const [newOrderClient, setNewOrderClient] = useState<any>(null);

    const clientsData = useMemo(() => {
        const ranking = new Map();
        
        // 1. Processar Pedidos
        orders.forEach((order: Order) => {
           if (order.status === 'cancelled') return;

           const phoneKey = normalizePhone(order.phone);
           if (!phoneKey) return;
           
           const current = ranking.get(phoneKey) || { 
               id: phoneKey, 
               name: order.customer, 
               phone: order.phone, 
               address: order.address, 
               count: 0, 
               totalSpent: 0,
               lastOrderDate: order.createdAt 
           };

           const orderDate = order.createdAt?.seconds || 0;
           const currentDate = current.lastOrderDate?.seconds || 0;
           const isCompleted = order.status === 'completed';

           ranking.set(phoneKey, { 
               ...current, 
               count: current.count + (isCompleted ? 1 : 0), 
               totalSpent: current.totalSpent + (isCompleted ? (order.value || 0) : 0),
               lastOrderDate: orderDate > currentDate ? order.createdAt : current.lastOrderDate,
               name: order.customer 
           });
        });

        // 2. Mesclar com cadastro
        clients.forEach((c: Client) => {
            const k = normalizePhone(c.phone);
            if(ranking.has(k)) {
                ranking.set(k, { ...ranking.get(k), id: c.id, name: c.name, address: c.address, obs: c.obs, mapsLink: c.mapsLink });
            } else {
                ranking.set(k, { 
                    id: c.id || k, 
                    name: c.name, 
                    phone: c.phone, 
                    address: c.address, 
                    obs: c.obs, 
                    mapsLink: c.mapsLink, 
                    count: 0, 
                    totalSpent: 0,
                    lastOrderDate: null
                });
            }
        });

        const allClients = Array.from(ranking.values());

        return allClients.sort((a: any, b: any) => {
            if (rankingMode === 'spent') return b.totalSpent - a.totalSpent;
            return b.count - a.count;
        }); 
    }, [clients, orders, rankingMode]);

    const filteredClients = clientsData.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));
    const visibleClients = filteredClients.slice(0, visibleClientsCount);
    const top3 = filteredClients.slice(0, 3);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown size={28} className="text-amber-500 fill-amber-500 drop-shadow-lg"/>;
        if (index === 1) return <Trophy size={24} className="text-slate-300 fill-slate-300 drop-shadow-md"/>;
        if (index === 2) return <Trophy size={24} className="text-amber-700 fill-amber-700 drop-shadow-md"/>;
        return null;
    };

    return (
       <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto w-full h-full pb-20 custom-scrollbar flex flex-col">
           <div className="flex-1 w-full max-w-7xl mx-auto">
               
               {/* Header & Controls - IDENTICAL LAYOUT TO SCREENSHOT */}
               <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6">
                   <div className="text-left w-full xl:w-auto">
                       <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                           <Trophy className="text-amber-500" size={28}/> Hall da Fama
                       </h2>
                       <p className="text-slate-400 text-xs mt-1 font-medium">
                           Conheça seus melhores clientes e seu histórico.
                       </p>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                       
                       {/* Toggle Ranking Mode - BUTTON GROUP STYLE */}
                       <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 h-10">
                           <button 
                               onClick={() => setRankingMode('spent')}
                               className={`px-4 flex items-center gap-2 text-xs font-bold rounded-md transition-all ${rankingMode === 'spent' ? 'bg-[#009e60] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                               <DollarSign size={14}/> Total R$
                           </button>
                           <button 
                               onClick={() => setRankingMode('count')}
                               className={`px-4 flex items-center gap-2 text-xs font-bold rounded-md transition-all ${rankingMode === 'count' ? 'bg-[#009e60] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                               <UserCheck size={14}/> Qtd
                           </button>
                       </div>

                       {/* Search - DARK STYLE */}
                       <div className="relative h-10 w-full sm:w-64">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                           <input 
                               className="w-full h-full bg-slate-900 border border-slate-800 text-white rounded-lg pl-10 pr-4 text-sm outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600" 
                               placeholder="Buscar cliente..." 
                               value={searchTerm} 
                               onChange={e => setSearchTerm(e.target.value)} 
                           />
                       </div>
                       
                       {/* Sorteio Buttons Group */}
                       <div className="flex items-center gap-1 bg-purple-900/20 p-1 rounded-lg border border-purple-500/30">
                           <button onClick={() => setShowGiveawayModal(true)} className="h-8 px-3 rounded hover:bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center gap-2 transition-colors">
                               <Settings size={14}/> Gerenciar
                           </button>
                           <div className="w-px h-6 bg-purple-500/30"></div>
                           <button onClick={onNavigateToLive} className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/20">
                               <MonitorPlay size={14}/> TELA AO VIVO
                           </button>
                       </div>

                       {/* Import Button - ICON ONLY */}
                       <button onClick={() => setModal('import')} className="h-10 w-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors" title="Importar CSV">
                           <UploadCloud size={18}/>
                       </button>
                   </div>
               </div>

               {/* TOP 3 PODIUM - MATCHING CARDS LAYOUT */}
               {!searchTerm && top3.length > 0 && (
                   <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-10 mt-6">
                       {top3.map((client: any, index: number) => {
                           const isFirst = index === 0;
                           const isSecond = index === 1;
                           const isThird = index === 2;

                           // Layout Order: 2nd - 1st - 3rd
                           let orderClass = "";
                           if (isFirst) orderClass = "order-1 md:order-2 z-30 w-full md:w-[32%]";
                           else if (isSecond) orderClass = "order-2 md:order-1 z-20 w-full md:w-[30%]";
                           else orderClass = "order-3 md:order-3 z-20 w-full md:w-[30%]";

                           // Card Styling
                           const cardStyle = isFirst 
                               ? 'bg-slate-900/80 border-amber-500/50 h-[220px] shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
                               : 'bg-slate-900 border-slate-800 h-[190px] opacity-90';

                           return (
                               <div 
                                   key={client.id} 
                                   onClick={() => { setClientToEdit(client); setModal('client'); }}
                                   className={`${orderClass} relative group cursor-pointer flex flex-col rounded-2xl border p-0 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${cardStyle}`}
                               >
                                   {/* Icon Container */}
                                   <div className="flex justify-center pt-6 pb-2">
                                       <div className={`p-3 rounded-full ${isFirst ? 'bg-amber-500/10' : 'bg-slate-800'}`}>
                                           {getRankIcon(index)}
                                       </div>
                                   </div>
                                   
                                   {/* Content */}
                                   <div className="text-center px-4 flex-1">
                                       <h3 className={`font-bold text-white truncate ${isFirst ? 'text-lg' : 'text-base'}`}>{client.name}</h3>
                                       <p className="text-[10px] text-slate-500 font-mono mt-1">{normalizePhone(client.phone)}</p>
                                   </div>

                                   {/* Footer Stats Row */}
                                   <div className={`flex border-t ${isFirst ? 'border-amber-500/20 bg-amber-900/10' : 'border-slate-800 bg-slate-950/50'}`}>
                                       <div className="flex-1 py-3 text-center border-r border-white/5">
                                           <p className="text-[9px] uppercase text-slate-500 font-bold mb-0.5">Total</p>
                                           <p className={`font-bold text-sm ${isFirst ? 'text-emerald-400' : 'text-emerald-500'}`}>{formatCurrency(client.totalSpent)}</p>
                                       </div>
                                       <div className="flex-1 py-3 text-center">
                                           <p className="text-[9px] uppercase text-slate-500 font-bold mb-0.5">Pedidos</p>
                                           <p className="font-bold text-white text-sm">{client.count}</p>
                                       </div>
                                   </div>
                               </div>
                           );
                       })}
                   </div>
               )}

               {/* TABLE LIST - EXACT COLUMNS & STYLING */}
               <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-400 table-fixed min-w-[800px]">
                          <thead className="bg-slate-950 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                              <tr>
                                  <th className="p-4 pl-6 w-20"># Rank</th>
                                  <th className="p-4 w-auto">Cliente</th>
                                  <th className="p-4 w-1/3">Endereço</th>
                                  <th className="p-4 text-center w-24 cursor-pointer hover:text-white" onClick={()=>setRankingMode('count')}>
                                      Pedidos
                                  </th>
                                  <th className="p-4 text-center w-36 cursor-pointer hover:text-white" onClick={()=>setRankingMode('spent')}>
                                      Total {rankingMode==='spent' && <ChevronDown size={12} className="inline"/>}
                                  </th>
                                  <th className="p-4 text-center w-20">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {visibleClients.map((client, index) => (
                                  <tr key={client.id} className="hover:bg-slate-800/50 transition-colors group">
                                      <td className="p-4 pl-6 font-bold truncate">
                                          {index === 0 ? <span className="text-amber-500 text-base">1º</span> : 
                                           index === 1 ? <span className="text-slate-300 text-base">2º</span> : 
                                           index === 2 ? <span className="text-slate-400 text-base">3º</span> : 
                                           <span className="text-slate-600">{index + 1}º</span>}
                                      </td>
                                      <td className="p-4">
                                          <p className="font-bold text-white text-sm truncate">{client.name}</p>
                                          <p className="text-[10px] text-slate-500 font-mono truncate">{client.phone}</p>
                                      </td>
                                      <td className="p-4">
                                          <p className="truncate text-xs text-slate-500">{client.address || 'Sem endereço cadastrado'}</p>
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className="font-bold text-white">{client.count}</span>
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className="font-bold text-xs bg-[#009e60]/20 text-[#009e60] px-3 py-1.5 rounded-lg border border-[#009e60]/20 inline-block min-w-[90px]">
                                              {formatCurrency(client.totalSpent || 0)}
                                          </span>
                                      </td>
                                      <td className="p-4 text-center">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setClientToEdit(client); setModal('client'); }} 
                                            className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors mx-auto"
                                            title="Editar"
                                          >
                                              <Edit size={14}/>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  
                  {filteredClients.length > visibleClientsCount && (
                      <div className="p-4 text-center border-t border-slate-800 bg-slate-950">
                          <button onClick={() => setVisibleClientsCount(prev => prev + 20)} className="text-xs font-bold text-slate-500 hover:text-white flex items-center justify-center gap-2 mx-auto py-2 px-4 hover:bg-slate-900 rounded-lg transition-colors">
                              <ChevronDown size={14}/> Carregar mais
                          </button>
                      </div>
                  )}
               </div>
           </div>

           {/* MODAL DE GERENCIAMENTO DE SORTEIO */}
           {showGiveawayModal && (
               <GiveawayManagerModal 
                   entries={giveawayEntries}
                   onClose={() => setShowGiveawayModal(false)}
                   appConfig={appConfig}
                   onDeleteEntry={onDeleteGiveawayEntry} // Passing delete function to Modal
               />
           )}

           {/* MODAL NOVO PEDIDO MANUAL */}
           {newOrderClient && (
               <ManualOrderModal 
                   initialData={{
                       customer: newOrderClient.name || '',
                       phone: newOrderClient.phone || '',
                       address: newOrderClient.address || ''
                   }}
                   onClose={() => setNewOrderClient(null)}
                   onSave={(data: any) => {
                       onCreateOrder(data);
                       setNewOrderClient(null);
                   }}
               />
           )}

           <Footer />
       </div>
    );
}
