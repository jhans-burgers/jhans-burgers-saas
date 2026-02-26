
import React, { useState, useEffect } from 'react';
import { Supplier, InventoryItem, ShoppingItem, AppConfig } from '../types';
import { PlusCircle, Edit, Trash2, Box, Truck, Search, Phone, FileText, ShoppingCart, Send, Wand2, CheckSquare, Square, Copy, MessageCircle, X, Check, Calculator, FlaskConical, ArrowRight } from 'lucide-react';
import { formatCurrency, copyToClipboard } from '../utils';
import { Footer } from './Shared';
import { GenericAlertModal } from './Modals';

interface InventoryProps {
    inventory: InventoryItem[];
    suppliers: Supplier[];
    shoppingList: ShoppingItem[];
    
    onCreateSupplier: (data: any) => void;
    onUpdateSupplier: (id: string, data: any) => void;
    onDeleteSupplier: (id: string) => void;
    
    onCreateInventory: (data: any) => void;
    onUpdateInventory: (id: string, data: any) => void;
    onDeleteInventory: (id: string) => void;

    // Novos handlers para Compras
    onAddShoppingItem: (name: string) => void;
    onToggleShoppingItem: (id: string, currentVal: boolean) => void;
    onDeleteShoppingItem: (id: string) => void;
    onClearShoppingList: () => void;

    appConfig: AppConfig;
}

export function InventoryManager(props: InventoryProps) {
    const [tab, setTab] = useState<'items' | 'suppliers' | 'shopping'>('items');
    const [searchTerm, setSearchTerm] = useState('');
    const [newShoppingItem, setNewShoppingItem] = useState('');
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null); // Pode ser supplier ou inventory
    const [alertModal, setAlertModal] = useState<{isOpen: boolean, title: string, message: string} | null>(null);

    // Mix Calculator State
    const [showMixModal, setShowMixModal] = useState(false);

    // Shopping List Preview State
    const [showShoppingPreview, setShowShoppingPreview] = useState(false);
    const [shoppingMessage, setShoppingMessage] = useState('');

    // Filtragems
    const filteredInventory = props.inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredSuppliers = props.suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const openModal = (item?: any) => {
        setEditingItem(item || null);
        setShowModal(true);
    };

    const handleSave = (e: React.FormEvent, form: any) => {
        e.preventDefault();
        if (tab === 'suppliers') {
            if (editingItem) props.onUpdateSupplier(editingItem.id, form);
            else props.onCreateSupplier(form);
        } else {
            if (editingItem) props.onUpdateInventory(editingItem.id, form);
            else props.onCreateInventory(form);
        }
        setShowModal(false);
    };

    // --- FUNÇÕES DA LISTA DE COMPRAS ---
    
    const handleAddShoppingItem = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newShoppingItem.trim()) return;
        props.onAddShoppingItem(newShoppingItem.trim());
        setNewShoppingItem('');
    };

    const generateLowStockList = () => {
        let count = 0;
        props.inventory.forEach(item => {
            // Verifica se estoque baixo E se item já não está na lista (para não duplicar)
            if (item.quantity <= (item.minQuantity || 0)) {
                const itemName = `${item.name} (${item.unit})`;
                // Verifica duplicidade simples por nome
                const exists = props.shoppingList.some(s => s.name.toLowerCase() === itemName.toLowerCase() || s.name.toLowerCase() === item.name.toLowerCase());
                
                if (!exists) {
                    props.onAddShoppingItem(itemName);
                    count++;
                }
            }
        });
        if(count === 0) setAlertModal({isOpen: true, title: "Estoque OK", message: "Nenhum item com estoque baixo encontrado ou todos já estão na lista."});
        else setAlertModal({isOpen: true, title: "Lista Gerada", message: `${count} itens adicionados à lista de compras!`});
    };

    const prepareShoppingList = () => {
        if (props.shoppingList.length === 0) {
            setAlertModal({isOpen: true, title: "Lista Vazia", message: "Adicione itens antes de visualizar."});
            return;
        }

        const date = new Date().toLocaleDateString('pt-BR');
        const companyName = props.appConfig?.appName || 'Minha Loja';
        
        let message = `🛒 *LISTA DE COMPRAS - ${companyName.toUpperCase()}*\n`;
        message += `📅 Data: ${date}\n\n`;
        
        const pending = props.shoppingList.filter(i => !i.isChecked);
        const checked = props.shoppingList.filter(i => i.isChecked);

        const formatItemLine = (sItem: ShoppingItem) => {
            // Tenta encontrar o item no inventário para pegar detalhes de unidade e quantidade
            // A comparação remove o (un) gerado automaticamente para tentar bater o nome
            const inventoryMatch = props.inventory.find(inv => 
                sItem.name.toLowerCase().startsWith(inv.name.toLowerCase()) || 
                inv.name.toLowerCase() === sItem.name.toLowerCase()
            );

            if (inventoryMatch) {
                return `- [ ] *${inventoryMatch.name}*\n      📦 Atual: ${inventoryMatch.quantity} ${inventoryMatch.unit} (Min: ${inventoryMatch.minQuantity})`;
            }
            return `- [ ] ${sItem.name}`;
        };

        if (pending.length > 0) {
            message += `*🚨 A COMPRAR / REPOR:*\n`;
            pending.forEach(item => {
                message += `${formatItemLine(item)}\n`;
            });
        }

        if (checked.length > 0) {
            message += `\n*✅ JÁ MARCADOS:*\n`;
            checked.forEach(item => {
                message += `- [x] ~${item.name}~\n`;
            });
        }

        message += `\n-----------------------\nGerado pelo Sistema ${companyName}`;
        
        setShoppingMessage(message);
        setShowShoppingPreview(true);
    };

    return (
        <div className="flex-1 bg-slate-950 flex flex-col h-full w-full overflow-hidden relative">
            
            {/* --- CABEÇALHO FIXO (Não Rola) --- */}
            <div className="p-4 md:p-8 pb-4 shrink-0 bg-slate-950 z-10 border-b border-slate-800/50">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {tab === 'items' ? <Box className="text-amber-500"/> : tab === 'suppliers' ? <Truck className="text-blue-500"/> : <ShoppingCart className="text-emerald-500"/>}
                            {tab === 'items' ? 'Controle de Estoque' : tab === 'suppliers' ? 'Fornecedores' : 'Lista de Compras'}
                        </h2>
                        <p className="text-slate-400 text-sm">Gerencie insumos, parceiros e reabastecimento.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex overflow-x-auto shrink-0">
                            <button onClick={() => setTab('items')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tab==='items' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Insumos</button>
                            <button onClick={() => setTab('suppliers')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tab==='suppliers' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Fornecedores</button>
                            <button onClick={() => setTab('shopping')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tab==='shopping' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-400'}`}>Compras</button>
                        </div>
                        
                        {/* Botão Calculadora movido para cá para evitar pulo de layout na busca */}
                        {tab === 'items' && (
                            <button onClick={() => setShowMixModal(true)} className="bg-purple-900/30 border border-purple-500/30 hover:bg-purple-600 hover:border-purple-500 text-purple-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0 h-[42px]">
                                <FlaskConical size={18}/> <span className="hidden md:inline">Misturas</span>
                            </button>
                        )}

                        {tab !== 'shopping' && (
                            <button onClick={() => openModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg active:scale-95 shrink-0 h-[42px]">
                                <PlusCircle size={18}/> Novo {tab === 'items' ? 'Item' : 'Fornecedor'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ÁREA DE CONTROLES FIXOS (BUSCA OU INPUTS DE COMPRA) */}
                {tab === 'shopping' ? (
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl animate-in fade-in duration-300">
                        <form onSubmit={handleAddShoppingItem} className="flex gap-2 mb-4">
                            <input 
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                placeholder="Digite o nome do item para comprar..."
                                value={newShoppingItem}
                                onChange={e => setNewShoppingItem(e.target.value)}
                            />
                            <button type="submit" className="bg-slate-800 hover:bg-white hover:text-slate-900 text-white font-bold px-6 rounded-xl transition-all active:scale-95 shadow-lg">
                                Adicionar
                            </button>
                        </form>
                        
                        <div className="flex flex-wrap gap-3">
                            <button onClick={generateLowStockList} className="flex-1 bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600 hover:text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95">
                                <Wand2 size={16}/> Gerar Automático (Estoque Baixo)
                            </button>
                            <button onClick={prepareShoppingList} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                                <Send size={16}/> Visualizar & Compartilhar
                            </button>
                            {props.shoppingList.length > 0 && (
                                <button onClick={() => props.onClearShoppingList()} className="px-4 bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-900/50 py-3 rounded-xl font-bold text-xs transition-all active:scale-95">
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Barra de Busca - AGORA FIXA SEM BOTÃO LATERAL PARA EVITAR PULO */
                    <div className="relative w-full animate-in fade-in duration-300">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input 
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-amber-500 transition-colors" 
                            placeholder={`Buscar ${tab === 'items' ? 'insumo' : 'fornecedor'}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* --- ÁREA DE CONTEÚDO ROLÁVEL --- */}
            {/* scrollbar-gutter: stable impede que a largura do conteúdo mude quando a scrollbar aparece/desaparece */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                
                {/* LISTA DE COMPRAS */}
                {tab === 'shopping' && (
                    <div className="w-full max-w-4xl mx-auto space-y-6 mt-4">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                            {props.shoppingList.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center text-slate-500">
                                    <ShoppingCart size={48} className="mb-4 opacity-20"/>
                                    <p className="text-lg font-bold">Sua lista está vazia.</p>
                                    <p className="text-sm">Adicione itens manualmente ou gere pelo estoque.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {props.shoppingList.sort((a,b) => (a.isChecked === b.isChecked ? 0 : a.isChecked ? 1 : -1)).map(item => (
                                        <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors ${item.isChecked ? 'opacity-50 bg-slate-950' : ''}`}>
                                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => props.onToggleShoppingItem(item.id, item.isChecked)}>
                                                <div className={`transition-colors ${item.isChecked ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                    {item.isChecked ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                </div>
                                                <span className={`text-lg font-medium ${item.isChecked ? 'line-through text-slate-500' : 'text-white'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => props.onDeleteShoppingItem(item.id)} 
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LISTAS DE ITENS E FORNECEDORES */}
                {tab !== 'shopping' && (
                    <div className="mt-4">
                        {/* LISTA DE ITENS */}
                        {tab === 'items' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredInventory.map(item => {
                                    const supplierName = props.suppliers.find(s => s.id === item.supplierId)?.name || 'N/A';
                                    const isLowStock = item.quantity <= (item.minQuantity || 0);

                                    return (
                                        <div key={item.id} className={`bg-slate-900 rounded-xl border p-4 transition-all hover:border-slate-600 ${isLowStock ? 'border-red-900/50 bg-red-900/10' : 'border-slate-800'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${isLowStock ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><Truck size={12}/> {supplierName}</p>
                                            <div className="flex justify-between items-end border-t border-slate-800 pt-3">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Custo Unitário</p>
                                                    <span className="text-emerald-400 font-mono font-bold">{formatCurrency(item.cost)}/{item.unit}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal(item)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit size={16}/></button>
                                                    <button onClick={() => props.onDeleteInventory(item.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {filteredInventory.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhum item cadastrado.</div>}
                            </div>
                        )}

                        {/* LISTA DE FORNECEDORES */}
                        {tab === 'suppliers' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredSuppliers.map(sup => (
                                    <div key={sup.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 hover:border-blue-500/30 transition-colors">
                                        <h3 className="font-bold text-white text-lg mb-1">{sup.name}</h3>
                                        <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">{sup.category}</span>
                                        
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs text-slate-400 flex items-center gap-2"><Phone size={14}/> {sup.contact}</p>
                                            {sup.obs && <p className="text-xs text-slate-500 flex items-start gap-2"><FileText size={14} className="shrink-0"/> {sup.obs}</p>}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                                            <button onClick={() => openModal(sup)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit size={16}/></button>
                                            <button onClick={() => props.onDeleteSupplier(sup.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                                {filteredSuppliers.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhum fornecedor cadastrado.</div>}
                            </div>
                        )}
                    </div>
                )}
                
                <Footer/>
            </div>

            {/* MODAL UNIVERSAL PARA ESTOQUE/FORNECEDOR */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-800 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-white">
                                {editingItem ? 'Editar' : 'Novo'} {tab === 'items' ? 'Insumo' : 'Fornecedor'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <InventoryForm 
                            type={tab} 
                            initialData={editingItem} 
                            suppliers={props.suppliers} 
                            onSave={handleSave} 
                        />
                    </div>
                </div>
            )}

            {/* MODAL CALCULADORA DE MISTURA */}
            {showMixModal && (
                <MixCalculatorModal onClose={() => setShowMixModal(false)} />
            )}

            {/* MODAL PRÉVIA DA LISTA DE COMPRAS */}
            {showShoppingPreview && (
                <ShoppingListPreviewModal 
                    message={shoppingMessage} 
                    onClose={() => setShowShoppingPreview(false)} 
                />
            )}

            {/* ALERTA LOCAL */}
            {alertModal && (
                <GenericAlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    onClose={() => setAlertModal(null)}
                />
            )}
        </div>
    );
}

function InventoryForm({ type, initialData, suppliers, onSave }: any) {
    const [form, setForm] = useState(initialData || (type === 'items' 
        ? { name: '', unit: 'un', quantity: '', minQuantity: '', cost: '', supplierId: '' } 
        : { name: '', contact: '', category: '', obs: '' }
    ));

    // ESTADO PARA CALCULADORA INTERNA (PACOTE)
    const [showCalculator, setShowCalculator] = useState(false);
    const [packPrice, setPackPrice] = useState('');
    const [packSize, setPackSize] = useState('');

    const calculateUnitCost = () => {
        const price = parseFloat(packPrice);
        const size = parseFloat(packSize);
        if (price > 0 && size > 0) {
            const unitCost = price / size;
            // Arredonda para 4 casas decimais para precisão em gramas
            setForm({...form, cost: parseFloat(unitCost.toFixed(4))});
            setShowCalculator(false);
        }
    };

    return (
        <form onSubmit={(e) => onSave(e, form)} className="space-y-4">
            <div>
                <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Nome</label>
                <input required className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={type === 'items' ? "Ex: Picles, Bacon Fatia" : "Nome da Empresa"} />
            </div>

            {type === 'suppliers' ? (
                <>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Contato / Telefone</label><input required className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Categoria (Ex: Bebidas, Carnes)</label><input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
                    <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Observações</label><textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500 h-24" value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} /></div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Unidade de Medida</label>
                            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                                <option value="un">Unidade (un)</option>
                                <option value="kg">Quilo (kg)</option>
                                <option value="g">Grama (g)</option>
                                <option value="l">Litro (l)</option>
                                <option value="ml">Mililitro (ml)</option>
                                <option value="fatia">Fatia</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase block mb-1 flex justify-between">
                                <span>Custo Unitário</span>
                                <button type="button" onClick={() => setShowCalculator(!showCalculator)} className="text-amber-500 flex items-center gap-1 hover:text-white transition-colors"><Calculator size={10}/> Calcular</button>
                            </label>
                            <input required type="number" step="0.0001" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-mono" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value)})} placeholder="0.00" />
                        </div>
                    </div>

                    {/* CALCULADORA DE PACOTE INTEGRADA */}
                    {showCalculator && (
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-amber-500/30 animate-in slide-in-from-top-2">
                            <p className="text-[10px] text-amber-400 font-bold uppercase mb-2">Calculadora de Custo por {form.unit || 'unidade'}</p>
                            <div className="flex gap-2 mb-2">
                                <input type="number" placeholder="Preço Pago (R$)" className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={packPrice} onChange={e => setPackPrice(e.target.value)} />
                                <input type="number" placeholder={`Qtd Total (${form.unit})`} className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" value={packSize} onChange={e => setPackSize(e.target.value)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-slate-400">Ex: Picles 400g pagou R$ 20 &rarr; Custo p/g</p>
                                <button type="button" onClick={calculateUnitCost} className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-amber-500">Aplicar</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Qtd em Estoque</label><input required type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.quantity} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} /></div>
                        <div><label className="text-xs text-slate-500 font-bold uppercase block mb-1">Alerta Mínimo</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.minQuantity} onChange={e => setForm({...form, minQuantity: parseFloat(e.target.value)})} /></div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Fornecedor</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-500" value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
                            <option value="">Selecione...</option>
                            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </>
            )}

            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2">Salvar Dados</button>
        </form>
    );
}

// --- NOVO MODAL: CALCULADORA DE MISTURA/MOLHO ---
function MixCalculatorModal({ onClose }: { onClose: () => void }) {
    const [items, setItems] = useState<{name: string, cost: string, qty: string}[]>([{name: '', cost: '', qty: ''}]);
    const [result, setResult] = useState<{totalCost: number, totalWeight: number, unitCost: number} | null>(null);

    const addItem = () => setItems([...items, {name: '', cost: '', qty: ''}]);
    const updateItem = (idx: number, field: string, val: string) => {
        const newItems = [...items];
        (newItems[idx] as any)[field] = val;
        setItems(newItems);
    };
    const removeItem = (idx: number) => {
        const newItems = [...items];
        newItems.splice(idx, 1);
        setItems(newItems);
    };

    const calculate = () => {
        let totalCost = 0;
        let totalWeight = 0;
        
        items.forEach(item => {
            const cost = parseFloat(item.cost); // Custo total do ingrediente usado
            const qty = parseFloat(item.qty);   // Peso usado
            if(!isNaN(cost) && !isNaN(qty)) {
                totalCost += cost;
                totalWeight += qty;
            }
        });

        if (totalWeight > 0) {
            setResult({
                totalCost,
                totalWeight,
                unitCost: totalCost / totalWeight
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-800 animate-in zoom-in shadow-2xl relative overflow-y-auto max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                <h3 className="font-bold text-xl text-white mb-2 flex items-center gap-2"><FlaskConical className="text-purple-500"/> Calculadora de Misturas</h3>
                <p className="text-xs text-slate-400 mb-4">Use para calcular o custo por grama de molhos (Ex: Cheddar + Creme de Leite ou Maionese + Ketchup).</p>

                <div className="space-y-2 mb-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input placeholder="Ingrediente (Opcional)" className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} />
                            <input type="number" placeholder="Custo R$ (do que usou)" className="w-24 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" value={item.cost} onChange={e => updateItem(idx, 'cost', e.target.value)} />
                            <input type="number" placeholder="Peso (g/ml)" className="w-20 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                            {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={16}/></button>}
                        </div>
                    ))}
                    <button onClick={addItem} className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-white"><PlusCircle size={14}/> Adicionar Ingrediente</button>
                </div>

                <button onClick={calculate} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl mb-4 shadow-lg">Calcular Custo Final</button>

                {result && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-purple-500/30">
                        <div className="flex justify-between mb-2">
                            <span className="text-slate-400 text-xs">Peso Final:</span>
                            <span className="text-white font-bold text-sm">{result.totalWeight} g/ml</span>
                        </div>
                        <div className="flex justify-between mb-4">
                            <span className="text-slate-400 text-xs">Custo Total da Mistura:</span>
                            <span className="text-white font-bold text-sm">{formatCurrency(result.totalCost)}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-700 text-center">
                            <p className="text-xs text-purple-400 font-bold uppercase mb-1">Custo por Grama/ML</p>
                            <p className="text-2xl font-black text-white">{formatCurrency(result.unitCost)}</p>
                            <p className="text-[10px] text-slate-500 mt-2">Dica: Crie um novo Item no estoque com este valor de custo unitário.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- NOVO MODAL: PRÉVIA DA LISTA DE COMPRAS ---
function ShoppingListPreviewModal({ message, onClose }: { message: string, onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        copyToClipboard(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenWhatsapp = () => {
        const encoded = encodeURIComponent(message);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const url = isMobile ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-800 animate-in zoom-in shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-white flex items-center gap-2"><ShoppingCart className="text-emerald-500"/> Prévia da Lista</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-500 hover:text-white" size={20}/></button>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
                    <textarea 
                        readOnly 
                        value={message} 
                        className="w-full bg-transparent text-slate-300 text-sm font-mono h-60 outline-none resize-none custom-scrollbar"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleCopy} 
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                    >
                        {copied ? <Check size={18}/> : <Copy size={18}/>}
                        {copied ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                    <button 
                        onClick={handleOpenWhatsapp} 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={18}/> Enviar no WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
