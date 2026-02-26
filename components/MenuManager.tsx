
import React, { useState, useMemo, useEffect } from 'react';
import { Product, InventoryItem } from '../types';
import { formatCurrency, copyToClipboard } from '../utils';
import { PlusCircle, Edit, Utensils, ListPlus, Trash2, Link as LinkIcon, ExternalLink, Copy, Check, Globe, TrendingUp, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { ProductFormModal, ReceiptModal } from './Modals';

import { Footer } from './Shared';

interface MenuProps {
    products: Product[];
    inventory: InventoryItem[]; // Novo: Recebe o estoque
    onCreate: (data: any) => void;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
}

export function MenuManager({ products, inventory, onCreate, onUpdate, onDelete }: MenuProps) {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Estado para o link base, permitindo edição manual
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Tenta pegar a URL limpa
            const url = window.location.href.split('?')[0].split('#')[0];
            setBaseUrl(url);
        }
    }, []);

    const availableCategories = useMemo(() => {
        const fixed = ['Hambúrgueres', 'Combos', 'Combo Familia', 'Porções', 'Bebidas'];
        const existing = Array.from(new Set(products.map(p => p.category)));
        return Array.from(new Set([...fixed, ...existing]));
    }, [products]);

    const sortedGroupedProducts = useMemo(() => {
        const grouped = products.reduce((acc: any, product: Product) => {
            (acc[product.category] = acc[product.category] || []).push(product);
            return acc;
        }, {});
        const ORDER = ['Hambúrgueres', 'Combos', 'Combo Familia', 'Porções', 'Bebidas'];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const idxA = ORDER.indexOf(a);
            const idxB = ORDER.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
        return sortedKeys.map(key => ({ category: key, items: grouped[key] }));
    }, [products]);

    const handleSave = (id: string | null, data: any) => {
        // Remove ID from payload to avoid saving it as a field in Firestore
        const { id: _ignored, ...cleanData } = data;
        
        if (id) {
            onUpdate(id, cleanData);
        } else {
            onCreate(cleanData);
        }
        setIsModalOpen(false);
    };

    const toggleAvailability = (product: Product) => {
        const newStatus = product.available === false ? true : false;
        onUpdate(product.id, { available: newStatus });
    };

    // Constrói o link completo com base no input do usuário
    const fullClientLink = `${baseUrl}?mode=client`;

    const handleCopyLink = () => {
        copyToClipboard(fullClientLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-auto w-full h-full pb-28 md:pb-8 flex flex-col">
            <div className="w-full max-w-6xl mx-auto flex-1">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="font-bold text-2xl text-white">Cardápio Digital</h2>
                        <p className="text-slate-400 text-sm mt-1">Gerencie produtos, preços e fichas técnicas.</p>
                    </div>
                    <button 
                        onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                        <PlusCircle size={20}/> Novo Item
                    </button>
                </div>

                {/* Área do Link do Cliente */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="bg-blue-900/20 p-4 rounded-full text-blue-400 hidden md:block">
                            <LinkIcon size={32} />
                        </div>
                        
                        <div className="flex-1 w-full space-y-4">
                            <div>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    Link Exclusivo para Clientes
                                    <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide">Público</span>
                                </h3>
                                <p className="text-sm text-slate-400">Este é o link que seus clientes usarão para fazer pedidos.</p>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <Globe size={16}/>
                                        </div>
                                        <input 
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-blue-500 font-mono transition-colors"
                                            placeholder="https://seu-site.com"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono pointer-events-none">
                                            ?mode=client
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCopyLink}
                                        className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                                    >
                                        {copied ? <Check size={16}/> : <Copy size={16}/>}
                                        {copied ? 'Copiado!' : 'Copiar Link'}
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-2 text-[11px] text-amber-500 bg-amber-900/10 p-2 rounded border border-amber-900/20">
                                    <Globe size={12} className="shrink-0"/>
                                    <p>Se o link gerado automaticamente estiver estranho (ex: blob:...), você pode editar o campo acima com seu domínio real.</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-auto flex flex-col gap-2">
                            {/* Link Relativo para garantir que funcione no mesmo domínio/contexto */}
                            <a 
                                href="?mode=client"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 no-underline"
                            >
                                Abrir Agora <ExternalLink size={18}/>
                            </a>
                            <p className="text-[10px] text-center text-slate-500">Testar em nova aba</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-10 pb-10">
                    {sortedGroupedProducts.map((group: any, index: number) => (
                        <div key={group.category}>
                            <h3 className={`text-xl font-bold mb-6 border-b-2 pb-2 uppercase tracking-wider flex items-center gap-2 ${index % 2 === 0 ? 'text-amber-500 border-amber-500/30' : 'text-purple-400 border-purple-500/30'}`}>
                                {index % 2 === 0 ? <Utensils size={20}/> : <ListPlus size={20}/>} {group.category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {group.items.map((p: Product) => {
                                    // Cálculo rápido de margem para visualização no card
                                    const cost = p.costPrice || 0;
                                    const opCost = p.operationalCost || 0;
                                    const totalCost = cost + opCost;
                                    const profit = p.price - totalCost;
                                    const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
                                    const isAvailable = p.available !== false;
                                    
                                    // Cor do indicador de margem
                                    let marginColor = 'text-slate-500';
                                    if (p.ingredients && p.ingredients.length > 0) {
                                        if (margin < 20) marginColor = 'text-red-500';
                                        else if (margin < 40) marginColor = 'text-amber-500';
                                        else marginColor = 'text-emerald-500';
                                    }

                                    return (
                                        <div key={p.id} className={`border p-0 rounded-2xl shadow-sm flex flex-col justify-between transition-all group relative overflow-hidden ${isAvailable ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                                            {/* Preview da Imagem */}
                                            <div className="h-40 w-full bg-slate-950 relative overflow-hidden border-b border-slate-800">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-105' : 'grayscale'}`} />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-700">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                )}
                                                <div className={`absolute top-2 right-2 font-bold px-2 py-1 rounded-lg text-xs shadow border border-slate-800 ${isAvailable ? 'bg-slate-900/90 text-emerald-400' : 'bg-red-900 text-white'}`}>
                                                    {isAvailable ? formatCurrency(p.price) : 'ESGOTADO'}
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className={`font-bold text-lg leading-tight line-clamp-2 ${isAvailable ? 'text-white' : 'text-slate-500 line-through'}`}>{p.name}</h4>
                                                </div>
                                                {p.description && <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 min-h-[2.5em]">{p.description}</p>}
                                                
                                                {/* Mini Indicador de Margem */}
                                                {totalCost > 0 && (
                                                    <div className="flex items-center gap-2 text-[10px] bg-slate-950 p-2 rounded-lg border border-slate-800 mb-2 mt-auto">
                                                        <TrendingUp size={12} className={marginColor}/>
                                                        <span className="text-slate-400">Margem:</span>
                                                        <span className={`font-bold ${marginColor}`}>{margin.toFixed(0)}%</span>
                                                        <span className="text-slate-600 ml-auto">Custo: {formatCurrency(totalCost)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-end p-3 pt-0 gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* BOTÃO TOGGLE DISPONIBILIDADE */}
                                                <button 
                                                    onClick={() => toggleAvailability(p)}
                                                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${isAvailable ? 'bg-slate-800 text-slate-300 hover:bg-red-900/30 hover:text-red-400' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`}
                                                    title={isAvailable ? "Marcar como Esgotado" : "Marcar como Disponível"}
                                                >
                                                    {isAvailable ? <Eye size={14}/> : <EyeOff size={14}/>}
                                                    {isAvailable ? 'Ativo' : 'Indisp.'}
                                                </button>

                                                <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-amber-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"><Edit size={14}/> Editar</button>
                                                <button onClick={() => onDelete(p.id)} className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    {sortedGroupedProducts.length === 0 && (
                        <div className="text-center py-20 text-slate-500">
                            <Utensils size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="text-lg">Nenhum item cadastrado.</p>
                            <p className="text-sm">Clique em "Novo Item" para começar.</p>
                        </div>
                    )}
                </div>
            </div>

            <ProductFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={editingProduct}
                onSave={handleSave}
                existingCategories={availableCategories}
                inventory={inventory} // Passa o estoque para o modal
            />
            
            <Footer />
        </div>
    );
}
