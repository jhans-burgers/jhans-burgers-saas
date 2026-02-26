import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { parseOrderItems, downloadCSV, isToday, formatCurrency, formatDate } from '../utils';
import { Download, Filter, Package } from 'lucide-react';
import { Footer } from './Shared';

interface ItemReportProps {
    orders: Order[];
}

export function ItemReportView({ orders }: ItemReportProps) {
    const [filterPeriod, setFilterPeriod] = useState<'today'|'month'|'all'>('today');

    const reportData = useMemo(() => {
        let filteredOrders = orders.filter(o => o.status === 'completed');
        
        if (filterPeriod === 'today') {
            filteredOrders = filteredOrders.filter(o => isToday(o.completedAt));
        } else if (filterPeriod === 'month') {
            const now = new Date();
            filteredOrders = filteredOrders.filter(o => {
                const d = new Date(o.completedAt?.seconds * 1000);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        }

        const items: any[] = [];
        filteredOrders.forEach(order => {
            const parsed = parseOrderItems(order.items);
            parsed.forEach(item => {
                items.push({
                    date: formatDate(order.completedAt),
                    orderId: order.id,
                    product: item.name,
                    qty: item.qty,
                    payment: order.paymentMethod,
                    customer: order.customer
                });
            });
        });
        return items;
    }, [orders, filterPeriod]);

    const handleExport = () => {
        let csv = "Data,Pedido,Produto,Qtd,Pagamento,Cliente\n";
        reportData.forEach(row => {
            csv += `${row.date},${row.orderId},"${row.product}",${row.qty},${row.payment},"${row.customer}"\n`;
        });
        downloadCSV(csv, `relatorio_itens_${filterPeriod}.csv`);
    };

    return (
        <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-auto w-full h-full pb-8 flex flex-col">
            <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="text-amber-500"/> Relatório de Saída de Itens</h2>
                        <p className="text-slate-400 text-sm">Análise detalhada de produtos vendidos</p>
                    </div>
                    <div className="flex gap-2">
                        <select value={filterPeriod} onChange={(e:any) => setFilterPeriod(e.target.value)} className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2 outline-none font-bold text-sm">
                            <option value="today">Hoje</option>
                            <option value="month">Este Mês</option>
                            <option value="all">Todo o Período</option>
                        </select>
                        <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all">
                            <Download size={16}/> Exportar Excel
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-950 text-slate-200 font-bold uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Pedido</th>
                                    <th className="p-4">Produto</th>
                                    <th className="p-4 text-right">Qtd</th>
                                    <th className="p-4">Pagamento</th>
                                    <th className="p-4">Cliente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum dado encontrado para o período.</td>
                                    </tr>
                                ) : (
                                    reportData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-mono text-xs">{row.date}</td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{row.orderId}</td>
                                            <td className="p-4 font-bold text-white">{row.product}</td>
                                            <td className="p-4 text-right font-bold text-emerald-400">{row.qty}</td>
                                            <td className="p-4 text-xs">{row.payment}</td>
                                            <td className="p-4 text-xs">{row.customer}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <Footer />
        </div>
    );
}
