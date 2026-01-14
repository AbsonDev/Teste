
import React, { useEffect, useState, useMemo } from 'react';
import { subscribeToHistory } from '../services/firebase';
import { HistoryLog, ShoppingListGroup, COLOR_PALETTES, DEFAULT_COLOR } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  lists: ShoppingListGroup[]; // Novo prop para acessar os dados detalhados
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    
    if (isToday) return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// --- Componente de Gráfico de Categorias (NOVO) ---
const CategoryBreakdown = ({ lists }: { lists: ShoppingListGroup[] }) => {
    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        let totalValue = 0;

        // Iterar apenas listas arquivadas (compras finalizadas)
        lists.filter(l => l.archived).forEach(list => {
            list.items.forEach(item => {
                if (item.completed && item.price) {
                    const value = item.price * (item.quantity || 1);
                    const cat = item.category || 'Outros';
                    stats[cat] = (stats[cat] || 0) + value;
                    totalValue += value;
                }
            });
        });

        // Transformar em array e ordenar
        return Object.entries(stats)
            .map(([name, value]) => ({
                name,
                value,
                percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value); // Maiores gastos primeiro
    }, [lists]);

    if (categoryStats.length === 0) {
        return (
            <div className="p-6 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Nenhum dado de categoria encontrado em listas arquivadas.
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in mt-6">
            <h5 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Gastos por Categoria</h5>
            <div className="space-y-3">
                {categoryStats.map((cat) => {
                    // Tenta encontrar a cor da categoria (fallback simples para cores comuns se o ID nao bater direto, ou usa DEFAULT)
                    // Na pratica, iteramos COLOR_PALETTES para ver se o ID da categoria bate, mas aqui temos apenas o NOME da categoria.
                    // Idealmente deveriamos ter acesso as categorias globais, mas para simplificar o visual vamos usar hash ou cores ciclicas.
                    const colorIndex = Math.abs(cat.name.length) % COLOR_PALETTES.length;
                    const palette = COLOR_PALETTES[colorIndex] || DEFAULT_COLOR;
                    
                    return (
                        <div key={cat.name} className="group">
                            <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
                                <span>{cat.name}</span>
                                <span>{formatCurrency(cat.value)} ({cat.percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${palette.bg.replace('bg-', 'bg-').replace('100', '500')} transition-all duration-1000 ease-out`} 
                                    style={{ width: `${cat.percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Componente de Gráfico de Linha ---
const SpendingChart = ({ logs }: { logs: HistoryLog[] }) => {
  const dataPoints = useMemo(() => {
    return logs
      .filter(l => l.action === 'finish_list' && l.metadata?.value && l.metadata.value > 0)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-10);
  }, [logs]);

  if (dataPoints.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 p-4 text-center mb-4">
        <span className="text-xs">Finalize mais compras para ver o gráfico.</span>
      </div>
    );
  }

  const values = dataPoints.map(d => d.metadata!.value!);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1;
  const range = maxVal - minVal;
  const height = 100;

  const points = dataPoints.map((d, i) => {
    const x = (i / (dataPoints.length - 1)) * 100;
    const y = height - ((d.metadata!.value! - minVal) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <h5 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Tendência de Valor Total</h5>
        <div className="relative h-[100px] w-full">
           <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M0,${height} L${points} L100,${height} Z`} fill="url(#gradient)" stroke="none" />
              <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
              {dataPoints.map((d, i) => {
                 const x = (i / (dataPoints.length - 1)) * 100;
                 const y = height - ((d.metadata!.value! - minVal) / range) * height;
                 return (
                   <circle key={d.id} cx={x} cy={y} r="3" fill="white" stroke="#22c55e" strokeWidth="2" />
                 );
              })}
           </svg>
        </div>
      </div>
  );
};


export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, userId, lists }) => {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'trends'>('activity');

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      const unsub = subscribeToHistory(userId, (fetchedLogs) => {
        setLogs(fetchedLogs);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [isOpen, userId]);

  const stats = useMemo(() => {
    let totalSpent = 0;
    let listsFinished = 0;
    logs.forEach(log => {
       if (log.action === 'finish_list') {
           totalSpent += log.metadata?.value || 0;
           listsFinished++;
       }
    });
    return { totalSpent, listsFinished };
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Histórico</h2>
                <p className="text-xs text-gray-500">
                    Total gasto: <span className="font-bold text-green-600">{formatCurrency(stats.totalSpent)}</span>
                </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex p-1 bg-gray-200/50 rounded-lg">
             <button onClick={() => setActiveTab('activity')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'activity' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Atividades</button>
             <button onClick={() => setActiveTab('trends')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'trends' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Relatórios</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 custom-scrollbar">
           {loading ? (
             <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>
           ) : (
             <>
               {activeTab === 'trends' ? (
                 <div>
                    <SpendingChart logs={logs} />
                    <CategoryBreakdown lists={lists} />
                 </div>
               ) : (
                 <div className="space-y-4">
                    {/* Lista de Logs */}
                    {logs.length === 0 ? <p className="text-center text-gray-400 text-sm py-10">Sem atividades recentes.</p> : 
                        logs.map((log) => (
                           <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-start">
                               <div>
                                   <p className="text-sm font-semibold text-gray-800">
                                     {log.action === 'finish_list' ? 'Finalizou Compras' : 
                                      log.action === 'add_item' ? 'Adicionou item' : 
                                      log.action === 'complete_item' ? 'Comprou item' : 
                                      log.action === 'create_list' ? 'Criou lista' : 
                                      log.action === 'update_pantry' ? 'Atualizou Dispensa' : 'Ação'}
                                   </p>
                                   <p className="text-xs text-gray-500">{log.details}</p>
                               </div>
                               <div className="text-right">
                                   <span className="text-[10px] text-gray-400 block">{formatDate(log.createdAt)}</span>
                                   {log.metadata?.value && <span className="text-xs font-bold text-green-600">{formatCurrency(log.metadata.value)}</span>}
                               </div>
                           </div>
                        ))
                    }
                 </div>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};
