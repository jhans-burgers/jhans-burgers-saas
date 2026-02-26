import React, { useMemo, useState, useEffect } from 'react';
import { Order, Driver, AppConfig } from '../types';
import { formatTime, formatCurrency, formatOrderId, copyToClipboard, getPixCodeOnly, getOrderReceivedText } from '../utils';
import { StatBox, Footer } from './Shared';
import {
  ClipboardList,
  DollarSign,
  Trash2,
  Edit,
  FileText,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  TrendingUp,
  CheckCircle2,
  QrCode,
  MessageSquare,
  Hash,
  ShieldCheck,
  Bike,
  Camera // Adicionado o ícone da câmera para ver a prova
} from 'lucide-react';
import { EditOrderModal, ReceiptModal } from './Modals';

interface DailyProps {
  orders: Order[];
  drivers: Driver[];
  onDeleteOrder: (id: string) => void;
  setModal: (modal: any) => void;
  onUpdateOrder: (id: string, data: any) => void;
  appConfig: AppConfig;
}

const SalesChart = ({
  allOrders,
  selectedDate,
  period,
  setPeriod,
}: {
  allOrders: Order[];
  selectedDate: Date;
  period: 'day' | 'week' | 'month';
  setPeriod: (p: 'day' | 'week' | 'month') => void;
}) => {
  const chartData = useMemo(() => {
    let labels: string[] = [];
    let data: number[] = [];

    const validOrders = allOrders.filter((o) => o.status !== 'cancelled' && o.createdAt);

    if (period === 'day') {
      const targetDateStr = selectedDate.toLocaleDateString('pt-BR');
      const dayOrders = validOrders.filter(
        (o) => new Date(o.createdAt.seconds * 1000).toLocaleDateString('pt-BR') === targetDateStr
      );

      data = new Array(24).fill(0);
      dayOrders.forEach((o) => {
        const hour = new Date(o.createdAt.seconds * 1000).getHours();
        data[hour] += o.value || 0;
      });
      labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    } else if (period === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      data = new Array(7).fill(0);

      validOrders.forEach((o) => {
        const d = new Date(o.createdAt.seconds * 1000);
        if (d >= startOfWeek && d <= endOfWeek) data[d.getDay()] += o.value || 0;
      });

      labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    } else {
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      data = new Array(daysInMonth).fill(0);

      validOrders.forEach((o) => {
        const d = new Date(o.createdAt.seconds * 1000);
        if (d.getMonth() === month && d.getFullYear() === year) data[d.getDate() - 1] += o.value || 0;
      });

      labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    }

    const maxVal = Math.max(...data, 1);

    let displayData = data.map((v, i) => ({ v, l: labels[i] }));

    if (period === 'day') {
      const activeIndices = data.map((val, idx) => ({ idx, val })).filter((h) => h.val > 0);
      const start = activeIndices.length > 0 ? Math.max(0, activeIndices[0].idx - 1) : 17;
      const end = activeIndices.length > 0 ? Math.min(23, activeIndices[activeIndices.length - 1].idx + 1) : 23;
      displayData = displayData.slice(start, end + 1);
    }

    return { displayData, maxVal };
  }, [allOrders, selectedDate, period]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl mb-6 flex flex-col h-[340px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-bold flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} />
          {period === 'day' ? 'Vendas por Hora' : period === 'week' ? 'Performance da Semana' : 'Evolução no Mês'}
        </h3>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setPeriod('day')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              period === 'day' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              period === 'week' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              period === 'month' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-end gap-2 md:gap-3 w-full pb-2">
        {chartData.displayData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibir.</div>
        ) : (
          chartData.displayData.map(({ v, l }, i) => {
            const heightPercent = (v / chartData.maxVal) * 100;
            const isPeak = v === chartData.maxVal && v > 0;

            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="w-full relative flex items-end h-full">
                  <div
                    className={`w-full rounded-t-sm md:rounded-t-lg transition-all duration-500 relative ${
                      v > 0
                        ? isPeak
                          ? 'bg-gradient-to-t from-amber-600/80 to-amber-400'
                          : 'bg-gradient-to-t from-emerald-900/50 to-emerald-500 hover:to-emerald-400'
                        : 'bg-slate-800/30'
                    }`}
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20 shadow-xl font-bold">
                      {formatCurrency(v)}
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] md:text-[10px] mt-2 truncate max-w-full font-bold ${isPeak ? 'text-amber-500' : 'text-slate-500'}`}>
                  {l}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const CalendarModal = ({ isOpen, onClose, selectedDate, onSelectDate }: any) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  useEffect(() => {
    if (isOpen) setViewDate(new Date(selectedDate));
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const handleSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelectDate(newDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white text-lg capitalize">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={onClose}>
            <X className="text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-full text-white">
              <ChevronLeft />
            </button>
            <button onClick={() => setViewDate(new Date())} className="text-xs font-bold text-amber-500 hover:text-amber-400 uppercase">
              Hoje
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-full text-white">
              <ChevronRight />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs font-bold text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={i} />;

              const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const isSelected = currentDate.toDateString() === selectedDate.toDateString();
              const isToday = currentDate.toDateString() === new Date().toDateString();

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(day)}
                  className={`
                    h-10 rounded-lg text-sm font-bold transition-all
                    ${isSelected ? 'bg-amber-500 text-slate-900 shadow-lg scale-105' : 'text-slate-300 hover:bg-slate-800'}
                    ${isToday && !isSelected ? 'border border-amber-500/50 text-amber-500' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export function DailyOrdersView({ orders, drivers, onDeleteOrder, setModal, onUpdateOrder, appConfig }: DailyProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<'edit' | 'receipt' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day');

  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [copiedPixIds, setCopiedPixIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  // ✅ ESTADO PARA VISUALIZAR A FOTO DA ENTREGA
  const [photoToView, setPhotoToView] = useState<string | null>(null);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  const dailyData = useMemo(() => {
    const targetDateStr = selectedDate.toLocaleDateString('pt-BR');
    const filteredOrders = orders
      .filter((o: Order) => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt.seconds * 1000);
        return orderDate.toLocaleDateString('pt-BR') === targetDateStr;
      })
      .sort((a: Order, b: Order) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled');
    const totalValue = validOrders.reduce((acc, o) => acc + (o.value || 0), 0);

    return { filteredOrders, totalOrders: validOrders.length, totalValue };
  }, [orders, selectedDate]);

  const handleCopyMsg = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const text = getOrderReceivedText(order, appConfig.appName, appConfig.estimatedTime);
    copyToClipboard(text);
    setCopiedIds((prev) => new Set(prev).add(order.id));
    setTimeout(() => {
      setCopiedIds((prev) => {
        const n = new Set(prev);
        n.delete(order.id);
        return n;
      });
    }, 2000);
  };

  const handleCopyPix = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (appConfig.pixKey) {
      const code = getPixCodeOnly(appConfig.pixKey, appConfig.pixName || '', appConfig.pixCity || '', order.value, order.id);
      copyToClipboard(code);
      setCopiedPixIds((prev) => new Set(prev).add(order.id));
      setTimeout(() => {
        setCopiedPixIds((prev) => {
          const n = new Set(prev);
          n.delete(order.id);
          return n;
        });
      }, 2000);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 px-[5%] py-6 md:py-8 overflow-y-auto w-full pb-40 md:pb-10 custom-scrollbar flex flex-col h-full relative">
      <div className="flex-1 max-w-7xl mx-auto w-full">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="text-amber-500" /> Histórico e Análise
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              {isSelectedDateToday
                ? 'Movimentação de Hoje'
                : `Visualizando: ${selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 shadow-lg w-full md:w-auto">
            <button onClick={handlePrevDay} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors group"
            >
              <CalendarIcon size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-white whitespace-nowrap">{selectedDate.toLocaleDateString('pt-BR')}</span>
            </button>
            <button
              onClick={handleNextDay}
              disabled={isSelectedDateToday}
              className={`p-2 rounded-lg transition-colors ${
                isSelectedDateToday ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:mb-8">
          <StatBox
            label="Pedidos no Dia"
            value={dailyData.totalOrders}
            icon={<ClipboardList />}
            color="bg-blue-900/20 text-blue-400 border-blue-900/50"
          />
          <StatBox
            label="Faturamento do Dia"
            value={formatCurrency(dailyData.totalValue)}
            icon={<DollarSign />}
            color="bg-emerald-900/20 text-emerald-400 border-emerald-900/50"
          />
        </div>

        {/* TABELA (DESKTOP) */}
        <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl min-h-[300px] mb-8">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-slate-400" /> Lista de Pedidos ({selectedDate.toLocaleDateString('pt-BR')})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 table-fixed">
              <thead className="bg-slate-950 text-slate-200 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4 w-24">Hora</th>
                  <th className="p-4 w-28">ID</th>
                  <th className="p-4 w-32">Status</th>
                  <th className="p-4 w-48">Cliente</th>
                  <th className="p-4">Ações Rápidas</th>
                  <th className="p-4 w-44 text-center">Códigos</th>
                  <th className="p-4 w-32 text-right">Valor</th>
                  <th className="p-4 w-32 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {dailyData.filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      Nenhum pedido registrado.
                    </td>
                  </tr>
                ) : (
                  dailyData.filteredOrders.map((o: Order) => {
                    const isPix = o.paymentMethod?.toLowerCase().includes('pix');
                    const copied = copiedIds.has(o.id);
                    const copiedPix = copiedPixIds.has(o.id);
                    const assignedDriver = drivers.find(d => d.id === o.driverId);

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedOrder(o);
                          setModalType('edit');
                        }}
                      >
                        <td className="p-4 font-bold text-white truncate">{formatTime(o.createdAt)}</td>
                        <td className="p-4 font-mono text-xs truncate">{formatOrderId(o.id)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                              o.status === 'completed'
                                ? 'bg-emerald-900/30 text-emerald-400'
                                : o.status === 'pending'
                                ? 'bg-red-900/30 text-red-400'
                                : o.status === 'cancelled'
                                ? 'bg-slate-800 text-slate-500 line-through'
                                : 'bg-amber-900/30 text-amber-400'
                            }`}
                          >
                            {o.status === 'completed' ? 'Entregue' : o.status === 'pending' ? 'Pendente' : o.status === 'cancelled' ? 'Cancelado' : 'Em Rota'}
                          </span>
                        </td>
                        
                        <td className="p-4 truncate">
                          <div className="font-medium text-slate-300">{o.customer}</div>
                          {assignedDriver && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold mt-1 uppercase">
                                  <Bike size={12} /> {assignedDriver.name}
                              </div>
                          )}
                          {!assignedDriver && o.status !== 'completed' && o.status !== 'cancelled' && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1 uppercase">
                                  Sem motoboy
                              </div>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-bold uppercase bg-slate-800 px-2 py-1 rounded text-slate-400 min-w-[60px] text-center">
                              {o.paymentMethod?.split(' ')[0]}
                            </span>

                            <div className="flex gap-1">
                              <button
                                onClick={(e) => handleCopyMsg(e, o)}
                                className={`p-1.5 rounded transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-emerald-900/30 text-emerald-400'}`}
                                title="Copiar Mensagem"
                              >
                                {copied ? <CheckCircle2 size={14} /> : <MessageSquare size={14} />}
                              </button>

                              {isPix && (
                                <button
                                  onClick={(e) => handleCopyPix(e, o)}
                                  className={`p-1.5 rounded transition-all ${copiedPix ? 'bg-purple-500 text-white' : 'bg-purple-900/30 text-purple-400'}`}
                                  title="Copiar Código PIX"
                                >
                                  {copiedPix ? <CheckCircle2 size={14} /> : <QrCode size={14} />}
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(o);
                                  setModalType('receipt');
                                }}
                                className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                                title="Ver Comprovante"
                              >
                                <FileText size={14} />
                              </button>

                              {/* ✅ BOTÃO DA FOTO DA ENTREGA (Admin Panel) */}
                              {o.photoProof && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoToView(o.photoProof as string);
                                  }}
                                  className="p-1.5 bg-blue-900/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors"
                                  title="Ver Foto da Entrega"
                                >
                                  <Camera size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="text-center">
                              <p className="text-[8px] text-slate-500 font-bold uppercase">Loja</p>
                              <p className="text-xs font-black text-amber-500">{o.restaurantCode || '---'}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-800"></div>
                            <div className="text-center">
                              <p className="text-[8px] text-slate-500 font-bold uppercase">Cli</p>
                              <p className="text-xs font-black text-emerald-500">{o.deliveryConfirmationCode || '---'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-right text-emerald-400 font-bold truncate">{formatCurrency(o.value || 0)}</td>

                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {o.status !== 'completed' && o.status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmAction({
                                    title: 'Finalizar Pedido?',
                                    message: 'Deseja finalizar este pedido manualmente e liberar o motoboy?',
                                    onConfirm: () => {
                                        onUpdateOrder(o.id, { 
                                          status: 'completed', 
                                          completedAt: new Date(),
                                          updatedAt: new Date() 
                                        });
                                    }
                                  });
                                }}
                                className="p-2 bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-900/20"
                                title="Finalizar Manualmente"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(o);
                                setModalType('edit');
                              }}
                              className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOrder(o.id);
                              }}
                              className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARDS MOBILE */}
        <div className="md:hidden space-y-3 mb-8">
          {dailyData.filteredOrders.map((o: Order) => {
            const isPix = o.paymentMethod?.toLowerCase().includes('pix');
            const copied = copiedIds.has(o.id);
            const copiedPix = copiedPixIds.has(o.id);
            const assignedDriver = drivers.find(d => d.id === o.driverId);

            return (
              <div
                key={o.id}
                className={`bg-slate-900 rounded-xl border p-4 shadow-md ${o.status === 'cancelled' ? 'border-slate-800 opacity-60' : 'border-slate-800'}`}
                onClick={() => {
                  setSelectedOrder(o);
                  setModalType('edit');
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className={`font-bold text-base truncate block ${o.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {o.customer}
                    </span>
                    {assignedDriver ? (
                        <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1 uppercase">
                            <Bike size={12} /> Entregador: {assignedDriver.name}
                        </div>
                    ) : (
                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1 uppercase">
                            Sem motoboy
                        </div>
                    )}
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={10} /> <span className="truncate">{o.address || 'Balcão'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-mono font-bold text-base block ${o.status === 'cancelled' ? 'text-slate-500' : 'text-emerald-400'}`}>
                      {formatCurrency(o.value || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatTime(o.createdAt)}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 mb-3">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-amber-500/20 text-center flex flex-col items-center">
                    <p className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1"><Hash size={10}/> Retirada</p>
                    <p className="text-sm font-black text-amber-500">{o.restaurantCode || '---'}</p>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-emerald-500/20 text-center flex flex-col items-center">
                    <p className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1"><ShieldCheck size={10}/> Entrega</p>
                    <p className="text-sm font-black text-emerald-500">{o.deliveryConfirmationCode || '---'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${o.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {o.status}
                  </span>

                  <div className="flex gap-2">
                    {/* ✅ BOTÃO FOTO NO MOBILE */}
                    {o.photoProof && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToView(o.photoProof as string);
                          }}
                          className="p-2 rounded-lg bg-blue-900/30 text-blue-400 border border-blue-900/50 hover:bg-blue-500 hover:text-white"
                        >
                          <Camera size={16} />
                        </button>
                    )}

                    {o.status !== 'completed' && o.status !== 'cancelled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                              title: 'Finalizar Pedido?',
                              message: 'Deseja finalizar este pedido manualmente e liberar o motoboy?',
                              onConfirm: () => {
                                  onUpdateOrder(o.id, { 
                                    status: 'completed', 
                                    completedAt: new Date(),
                                    updatedAt: new Date()
                                  });
                              }
                          });
                        }}
                        className="bg-emerald-900/30 text-emerald-500 p-2 rounded-lg border border-emerald-500/30"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleCopyMsg(e, o)}
                      className={`p-2 rounded-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-emerald-900/30 text-emerald-400'}`}
                    >
                      {copied ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
                    </button>

                    {isPix && (
                      <button
                        onClick={(e) => handleCopyPix(e, o)}
                        className={`p-2 rounded-lg ${copiedPix ? 'bg-purple-500 text-white' : 'bg-purple-900/30 text-purple-400'}`}
                      >
                        {copiedPix ? <CheckCircle2 size={16} /> : <QrCode size={16} />}
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOrder(o.id);
                      }}
                      className="bg-slate-800 text-red-400 p-2 rounded-lg border border-slate-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <SalesChart allOrders={orders} selectedDate={selectedDate} period={chartPeriod} setPeriod={setChartPeriod} />
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <EditOrderModal
        isOpen={modalType === 'edit' && !!selectedOrder}
        order={selectedOrder}
        onClose={() => {
          setModalType(null);
          setSelectedOrder(null);
        }}
        onSave={(id: string, data: any) => onUpdateOrder(id, data)}
      />

      {modalType === 'receipt' && selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => {
            setModalType(null);
            setSelectedOrder(null);
          }}
          appConfig={appConfig}
        />
      )}

      {/* ✅ VISUALIZADOR DA FOTO EM TELA CHEIA (ADMIN) */}
      {photoToView && (
          <div 
              className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
              onClick={() => setPhotoToView(null)}
          >
              <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50">
                  <X size={24} />
              </button>
              <img 
                  src={photoToView} 
                  alt="Prova de Entrega" 
                  className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              />
          </div>
      )}

      {confirmAction && (
        <div 
            className="fixed inset-0 z-[1400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
        >
            <div 
                className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">{confirmAction.title}</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {confirmAction.message}
                    </p>
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                confirmAction.onConfirm();
                                setConfirmAction(null);
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <Footer />
    </div>
  );
}