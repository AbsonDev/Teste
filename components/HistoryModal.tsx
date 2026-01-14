import React, { useEffect, useState, useMemo } from 'react';
import { subscribeToHistory } from '../services/firebase';
import { HistoryLog } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
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

// --- Spending Chart Component ---
const SpendingChart = ({ logs }: { logs: HistoryLog[] }) => {
  // Filter only finished lists with value
  const dataPoints = useMemo(() => {
    return logs
      .filter(l => l.action === 'finish_list' && l.metadata?.value && l.metadata.value > 0)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-10); // Show last 10 trips to keep chart clean
  }, [logs]);

  if (dataPoints.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <span className="text-sm">Finalize pelo menos 2 compras para ver tendências de gastos.</span>
      </div>
    );
  }

  // Determine Min/Max for scaling
  const values = dataPoints.map(d => d.metadata!.value!);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1;
  const range = maxVal - minVal;

  // Chart Dimensions
  const height = 150;
  const width = 100; // using percentage width in viewbox

  // Generate Path
  const points = dataPoints.map((d, i) => {
    const x = (i / (dataPoints.length - 1)) * 100; // 0 to 100
    const y = height - ((d.metadata!.value! - minVal) / range) * height; // Invert Y
    return `${x},${y}`;
  }).join(' ');

  // Calculate Inflation Insight
  const firstAvg = values.slice(0, Math.ceil(values.length / 2)).reduce((a,b) => a+b, 0) / Math.ceil(values.length / 2);
  const lastAvg = values.slice(Math.floor(values.length / 2)).reduce((a,b) => a+b, 0) / Math.floor(values.length / 2);
  const percentageChange = ((lastAvg - firstAvg) / firstAvg) * 100;
  const isInflation = percentageChange > 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`p-4 rounded-xl border ${isInflation ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
         <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${isInflation ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isInflation ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              )}
            </div>
            <div>
              <h4 className={`font-bold text-sm ${isInflation ? 'text-red-800' : 'text-green-800'}`}>
                {isInflation ? 'Inflação Pessoal Detectada' : 'Gastos sob Controle'}
              </h4>
              <p className={`text-xs mt-1 ${isInflation ? 'text-red-600' : 'text-green-600'}`}>
                Você está gastando aproximadamente <strong>{Math.abs(percentageChange).toFixed(1)}% {isInflation ? 'a mais' : 'a menos'}</strong> em suas compras recentes comparado ao histórico anterior.
              </p>
            </div>
         </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h5 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Histórico de Valor Total (Últimas Compras)</h5>
        <div className="relative h-[150px] w-full">
           <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1={height/2} x2="100" y2={height/2} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1={height} x2="100" y2={height} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />

              {/* Gradient Area */}
              <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                 d={`M0,${height} L${points} L100,${height} Z`} 
                 fill="url(#gradient)" 
                 stroke="none"
              />

              {/* Main Line */}
              <polyline 
                 fill="none" 
                 stroke="#22c55e" 
                 strokeWidth="3" 
                 points={points} 
                 strokeLinecap="round" 
                 strokeLinejoin="round"
                 className="drop-shadow-sm"
              />

              {/* Data Points */}
              {dataPoints.map((d, i) => {
                 const x = (i / (dataPoints.length - 1)) * 100;
                 const y = height - ((d.metadata!.value! - minVal) / range) * height;
                 return (
                   <g key={d.id} className="group">
                     <circle cx={x} cy={y} r="4" fill="white" stroke="#22c55e" strokeWidth="2" className="hover:scale-150 transition-transform cursor-pointer" />
                     {/* Tooltip */}
                     <foreignObject x={x - 25} y={y - 40} width="60" height="35" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-gray-800 text-white text-[10px] p-1 rounded shadow-lg text-center leading-tight">
                          {formatCurrency(d.metadata!.value!)}
                          <br/>
                          <span className="text-[8px] opacity-75">{new Date(d.createdAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                        </div>
                     </foreignObject>
                   </g>
                 );
              })}
           </svg>
        </div>
      </div>
    </div>
  );
};


export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, userId }) => {
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

  // Analytics Calculations
  const stats = useMemo(() => {
    let totalSpent = 0;
    let itemsCompleted = 0;
    let listsFinished = 0;

    logs.forEach(log => {
       if (log.action === 'finish_list') {
           totalSpent += log.metadata?.value || 0;
           itemsCompleted += log.metadata?.count || 0;
           listsFinished++;
       } else if (log.action === 'complete_item') {
           // We might not track price on individual completion log to avoid double counting if they finish list later
           // But counting items is safe for activity metric
           // itemsCompleted++; 
       }
    });

    return { totalSpent, itemsCompleted, listsFinished };
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
                <h2 className="text-xl font-bold text-gray-900">Histórico de Atividades</h2>
                <p className="text-xs text-gray-500">Acompanhe compras e inflação pessoal.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex p-1 bg-gray-200/50 rounded-lg">
             <button 
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'activity' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Atividades
             </button>
             <button 
                onClick={() => setActiveTab('trends')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'trends' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Tendências & Inflação
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 custom-scrollbar">
           {loading ? (
             <div className="flex justify-center py-8">
               <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
           ) : (
             <>
               {activeTab === 'trends' ? (
                 <SpendingChart logs={logs} />
               ) : (
                 <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Gasto</span>
                            <span className="text-xl font-bold text-brand-600">{formatCurrency(stats.totalSpent)}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Listas Concluídas</span>
                            <span className="text-xl font-bold text-blue-600">{stats.listsFinished}</span>
                        </div>
                    </div>

                    {logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Nenhuma atividade registrada.</div>
                    ) : (
                        <div className="relative pl-4">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

                            {logs.map((log, index) => {
                                let icon = <div className="w-2 h-2 bg-gray-400 rounded-full" />;
                                let bgColor = 'bg-gray-100';
                                let textColor = 'text-gray-600';

                                switch(log.action) {
                                    case 'finish_list':
                                        icon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>;
                                        bgColor = 'bg-green-500';
                                        textColor = 'text-gray-800';
                                        break;
                                    case 'add_item':
                                        icon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
                                        bgColor = 'bg-blue-400';
                                        break;
                                    case 'complete_item':
                                        icon = <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>;
                                        bgColor = 'bg-brand-400';
                                        break;
                                    case 'create_list':
                                        icon = <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>;
                                        bgColor = 'bg-purple-400';
                                        break;
                                    case 'update_pantry':
                                        icon = <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>;
                                        bgColor = 'bg-orange-400';
                                        break;
                                }

                                return (
                                    <div key={log.id} className="relative pl-10 flex flex-col gap-1 mb-4 last:mb-0">
                                        {/* Dot Icon */}
                                        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full ${bgColor} border-4 border-white shadow-sm flex items-center justify-center z-10`}>
                                            {icon}
                                        </div>

                                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm font-semibold ${textColor}`}>
                                                    {log.action === 'finish_list' ? 'Finalizou Compras' : 
                                                    log.action === 'add_item' ? 'Adicionou item' :
                                                    log.action === 'complete_item' ? 'Comprou item' :
                                                    log.action === 'create_list' ? 'Criou lista' : 
                                                    log.action === 'update_pantry' ? 'Atualizou Dispensa' : 'Ação'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 ml-2 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5">{log.details}</p>
                                            {log.metadata?.value && (
                                                <p className="text-xs font-bold text-green-600 mt-1 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                                                {formatCurrency(log.metadata.value)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                 </div>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};