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

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, userId }) => {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Histórico de Atividades</h2>
            <p className="text-xs text-gray-500">Acompanhe suas compras e ações.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Analytics Summary Cards */}
        <div className="p-5 grid grid-cols-2 gap-4 border-b border-gray-100 bg-white">
           <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex flex-col">
              <span className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Gasto Estimado</span>
              <span className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalSpent)}</span>
              <span className="text-[10px] text-gray-400 mt-1">Baseado em listas finalizadas</span>
           </div>
           <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Listas Concluídas</span>
              <span className="text-2xl font-bold text-gray-800">{stats.listsFinished}</span>
              <span className="text-[10px] text-gray-400 mt-1">{stats.itemsCompleted} itens processados</span>
           </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
           {loading ? (
             <div className="flex justify-center py-8">
               <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
           ) : logs.length === 0 ? (
             <div className="text-center py-10 text-gray-400 text-sm">
               Nenhuma atividade registrada recentemente.
             </div>
           ) : (
             <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                {logs.map((log, index) => {
                   let icon = <div className="w-2 h-2 bg-gray-400 rounded-full" />;
                   let bgColor = 'bg-gray-100';
                   let borderColor = 'border-gray-200';
                   let textColor = 'text-gray-600';

                   switch(log.action) {
                       case 'finish_list':
                           icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>;
                           bgColor = 'bg-green-500';
                           borderColor = 'border-green-200';
                           textColor = 'text-gray-800';
                           break;
                        case 'add_item':
                            icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
                            bgColor = 'bg-blue-400';
                            borderColor = 'border-blue-200';
                            break;
                        case 'complete_item':
                            icon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>;
                            bgColor = 'bg-brand-400';
                            borderColor = 'border-brand-200';
                            break;
                        case 'create_list':
                             icon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>;
                             bgColor = 'bg-purple-400';
                             borderColor = 'border-purple-200';
                             break;
                        case 'update_pantry':
                             icon = <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>;
                             bgColor = 'bg-orange-400';
                             borderColor = 'border-orange-200';
                             break;
                   }

                   return (
                       <div key={log.id} className="relative pl-10 flex flex-col gap-1">
                          {/* Dot Icon */}
                          <div className={`absolute left-[0.6rem] top-1 w-7 h-7 rounded-full ${bgColor} border-4 border-white shadow-sm flex items-center justify-center z-10`}>
                             {icon}
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
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
                                <p className="text-xs font-bold text-green-600 mt-1">
                                   Valor: {formatCurrency(log.metadata.value)}
                                </p>
                             )}
                          </div>
                       </div>
                   );
                })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};