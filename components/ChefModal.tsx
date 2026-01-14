
import React, { useState, useEffect } from 'react';
import { suggestRecipesFromPantry } from '../services/geminiService';
import { Recipe } from '../types';

interface ChefModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItemNames: string[];
  onCook: (usedIngredients: string[], recipeTitle: string) => void;
  onShopMissing: (missingIngredients: string[]) => void;
}

export const ChefModal: React.FC<ChefModalProps> = ({ 
  isOpen, 
  onClose, 
  pantryItemNames,
  onCook,
  onShopMissing
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen]);

  const loadRecipes = async () => {
    if (pantryItemNames.length === 0) {
        setError("Sua dispensa está vazia! Adicione itens primeiro.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await suggestRecipesFromPantry(pantryItemNames);
      if (result.length === 0) {
          setError("Não consegui criar receitas com esses itens. Tente adicionar mais variedade à dispensa.");
      } else {
          setRecipes(result);
      }
    } catch (e) {
      setError("Erro ao consultar o Chef IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh] animate-slide-up">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center text-2xl">
                👨‍🍳
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chef da Dispensa</h2>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Sugestões baseadas no que você tem</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center py-10 gap-4">
               <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">O Chef está analisando seus ingredientes...</p>
             </div>
           ) : error ? (
             <div className="text-center py-10 px-6">
                <div className="mb-4 text-4xl">🤔</div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                <button onClick={loadRecipes} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm">Tentar Novamente</button>
             </div>
           ) : (
             recipes.map((recipe, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                   <div className="p-4 border-b border-gray-50 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-lg text-gray-800 dark:text-white leading-tight">{recipe.title}</h3>
                         <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            recipe.difficulty === 'Fácil' ? 'bg-green-50 text-green-700 border-green-200' : 
                            recipe.difficulty === 'Médio' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                         }`}>
                           {recipe.difficulty}
                         </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-4 mb-3">
                         <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {recipe.time}
                         </span>
                         <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            {recipe.usedIngredients.length} itens da dispensa
                         </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{recipe.instructionsShort}"</p>
                   </div>

                   <div className="p-4 bg-gray-50/50 dark:bg-gray-700/20 flex-1">
                      <div className="mb-3">
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Na Dispensa</p>
                         <div className="flex flex-wrap gap-2">
                            {recipe.usedIngredients.map((ing, i) => (
                               <span key={i} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-md flex items-center gap-1">
                                  ✅ {ing}
                               </span>
                            ))}
                         </div>
                      </div>
                      
                      {recipe.missingIngredients.length > 0 && (
                         <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Falta Comprar</p>
                            <div className="flex flex-wrap gap-2">
                                {recipe.missingIngredients.map((ing, i) => (
                                <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-md flex items-center gap-1 border border-red-100 dark:border-red-800">
                                    ⚠️ {ing}
                                </span>
                                ))}
                            </div>
                         </div>
                      )}
                   </div>

                   <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                      <button 
                         onClick={() => {
                             onCook(recipe.usedIngredients, recipe.title);
                             onClose();
                         }}
                         className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm shadow-orange-200 dark:shadow-none transition-colors"
                      >
                         Cozinhar (-Estoque)
                      </button>
                      {recipe.missingIngredients.length > 0 && (
                          <button 
                             onClick={() => {
                                 onShopMissing(recipe.missingIngredients);
                                 alert(`${recipe.missingIngredients.length} itens adicionados à lista!`);
                             }}
                             className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                             title="Adicionar Faltantes à Lista"
                          >
                             +Lista
                          </button>
                      )}
                   </div>
                </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};
