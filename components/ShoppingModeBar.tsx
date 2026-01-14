
import React from 'react';

interface ShoppingModeBarProps {
  cartTotal: number;
  budget: number;
  itemCount: number;
  checkedCount: number;
  onFinish: () => void;
  onExitMode: () => void;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const ShoppingModeBar: React.FC<ShoppingModeBarProps> = ({
  cartTotal,
  budget,
  itemCount,
  checkedCount,
  onFinish,
  onExitMode
}) => {
  // Lógica de Cores do Orçamento
  const percentUsed = budget > 0 ? (cartTotal / budget) * 100 : 0;
  let progressColor = 'bg-green-500';
  let budgetStatusText = 'Dentro da meta';
  
  if (budget > 0) {
      if (percentUsed >= 100) {
          progressColor = 'bg-red-500';
          budgetStatusText = 'Orçamento Estourado!';
      } else if (percentUsed >= 85) {
          progressColor = 'bg-yellow-500';
          budgetStatusText = 'Atenção ao limite';
      }
  }

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 animate-slide-up bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      {/* Barra de Progresso Financeiro (Fina no topo) */}
      {budget > 0 && (
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700">
              <div 
                  className={`h-full ${progressColor} transition-all duration-500`} 
                  style={{ width: `${Math.min(percentUsed, 100)}%` }} 
              />
          </div>
      )}

      <div className="p-4 pb-8 lg:pb-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            
            {/* Esquerda: Informações Financeiras */}
            <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Total no Carrinho
                </p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {formatCurrency(cartTotal)}
                    </span>
                    {budget > 0 && (
                        <span className={`text-xs font-bold ${percentUsed >= 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            / {formatCurrency(budget)}
                        </span>
                    )}
                </div>
                <p className={`text-xs font-medium mt-0.5 ${percentUsed >= 100 ? 'text-red-600 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`}>
                    {budget > 0 ? budgetStatusText : `${checkedCount} de ${itemCount} itens pegos`}
                </p>
            </div>

            {/* Direita: Ações */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={onExitMode}
                    className="p-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Sair do modo compras (Voltar a editar)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                </button>
                
                <button 
                    onClick={onFinish}
                    className="px-6 py-3.5 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-2"
                >
                    <span>Concluir</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
