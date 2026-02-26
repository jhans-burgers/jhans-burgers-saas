
import React, { useMemo } from 'react';
import { Order, Product, DailyStats } from '../types';
import { formatCurrency, parseOrderItems, isToday } from '../utils';
import { TrendingUp, TrendingDown, Award, BarChart3, Users, ShoppingCart, Percent } from 'lucide-react';
import { Footer } from './Shared';

interface AnalyticsProps {
    orders: Order[];
    products: Product[];
    siteVisits?: DailyStats[]; // New prop for traffic stats
}

export function AnalyticsView({ orders, products, siteVisits = [] }: AnalyticsProps) {
    const analytics = useMemo(() => {
        const completedOrders = orders.filter(o => o.status === 'completed');
        const productStats: {[key: string]: { count: number, revenue: number, name: string }} = {};

        completedOrders.forEach(order => {
            const items = parseOrderItems(order.items);
            items.forEach(item => {
                const productName = item.name.toLowerCase().trim();
                const originalProduct = products.find(p => p.name.toLowerCase() === productName) 
                                     || products.find(p => productName.includes(p.name.toLowerCase()));
                
                const key = originalProduct ? originalProduct.id : productName;
                const name = originalProduct ? originalProduct.name : item.name;
                const price = originalProduct ? originalProduct.price : 0; 

                if (!productStats[key]) {
                    productStats[key] = { count: 0, revenue: 0, name: name };
                }
                productStats[key].count += item.qty;
                productStats[key].revenue += (item.qty * price);
            });
        });

        const statsArray = Object.values(productStats);
        
        // Sorting
        const byCount = [...statsArray].sort((a, b) => b.count - a.count);
        const byRevenue = [...statsArray].sort((a, b) => b.revenue - a.revenue);

        // Traffic Stats (Today)
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const todayVisits = siteVisits.find(v => v.date === todayStr)?.visits || 0;
        const todayOrdersCount = orders.filter(o => isToday(o.createdAt)).length;
        const conversionRate = todayVisits > 0 ? (todayOrdersCount / todayVisits) * 100 : 0;

        return {
            topSelling: byCount.slice(0, 5),
            leastSelling: byCount.slice(-5).reverse(),
            topRevenue: byRevenue.slice(0, 5),
            totalItemsSold: statsArray.reduce((acc, curr) => acc + curr.count, 0),
            traffic: {
                visits: todayVisits,
                orders: todayOrdersCount,
                conversion: conversionRate
            }
        };
    }, [orders, products, siteVisits]);

    return (
        <div className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto w-full h-full pb-24 custom-scrollbar flex flex-col">
            <div className="flex-1">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="text-purple-500"/> Análise de Cardápio</h2>
                    <p className="text-slate-400 text-sm">Entenda o desempenho dos seus produtos.</p>
                </div>

                {/* FUNIL DE VENDAS (NOVO) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-blue-900/20 text-blue-400 rounded-xl">
                            <Users size={24}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Visitas Hoje</p>
                            <p className="text-2xl font-black text-white">{analytics.traffic.visits}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl">
                            <ShoppingCart size={24}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Pedidos Hoje</p>
                            <p className="text-2xl font-black text-white">{analytics.traffic.orders}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-purple-900/20 text-purple-400 rounded-xl">
                            <Percent size={24}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Conversão</p>
                            <p className="text-2xl font-black text-white">{analytics.traffic.conversion.toFixed(1)}%</p>
                            <p className="text-[9px] text-slate-500">De visitantes que compraram</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* TOP VENDAS */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                        <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                            <Award className="text-amber-400"/> Campeões de Vendas
                        </h3>
                        <div className="space-y-4">
                            {analytics.topSelling.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold text-sm w-6 text-center ${idx === 0 ? 'text-amber-400 text-lg' : 'text-slate-500'}`}>#{idx + 1}</span>
                                        <span className="text-white font-medium">{item.name}</span>
                                    </div>
                                    <span className="bg-amber-900/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">{item.count} un</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MAIOR FATURAMENTO */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                        <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                            <TrendingUp className="text-emerald-400"/> Maior Faturamento
                        </h3>
                        <div className="space-y-4">
                            {analytics.topRevenue.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-sm w-6 text-center text-slate-500">#{idx + 1}</span>
                                        <span className="text-white font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-emerald-400 font-mono font-bold">{formatCurrency(item.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MENOS VENDIDOS */}
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 mb-8">
                    <h3 className="font-bold text-slate-300 text-lg mb-4 flex items-center gap-2">
                        <TrendingDown className="text-red-400"/> Precisam de Atenção (Menos Vendidos)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.leastSelling.map((item, idx) => (
                            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                                <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                                <span className="text-xs font-bold bg-slate-800 text-slate-500 px-2 py-1 rounded">{item.count} un</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
