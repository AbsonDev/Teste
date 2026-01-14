
import React, { useState, useRef } from 'react';
import { scanReceipt } from '../services/geminiService';
import { ScannedItem } from '../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedItemNames: string[];
  onApplyUpdates: (updates: ScannedItem[]) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  expectedItemNames,
  onApplyUpdates
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!imagePreview) return;
    setIsScanning(true);
    setError(null);
    setScannedItems([]);
    
    try {
      const results = await scanReceipt(imagePreview, expectedItemNames);
      if (results.length === 0) {
          setError("Não conseguimos identificar itens no cupom. Tente uma foto com melhor iluminação.");
      } else {
          setScannedItems(results);
          // Auto-select items that have high confidence or match expected list
          const autoSelected = new Set<number>();
          results.forEach((item, idx) => {
              if (expectedItemNames.some(name => name.toLowerCase() === item.originalName.toLowerCase())) {
                  autoSelected.add(idx);
              } else if (item.confidence === 'high') {
                  autoSelected.add(idx);
              }
          });
          setSelectedIndices(autoSelected);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Verifique sua conexão.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleConfirm = () => {
    const itemsToUpdate = scannedItems.filter((_, idx) => selectedIndices.has(idx));
    onApplyUpdates(itemsToUpdate);
    onClose();
    // Reset state for next time
    setImagePreview(null);
    setScannedItems([]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            Leitor de Cupom
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
          
          {/* Step 1: Upload/Camera */}
          {!scannedItems.length && !isScanning && (
            <div className="flex flex-col items-center gap-4 py-6">
               {imagePreview ? (
                 <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-md border-2 border-brand-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                 </div>
               ) : (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-3"
                 >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    </div>
                    <p className="font-medium text-sm">Toque para tirar foto ou upload</p>
                 </div>
               )}
               
               <input 
                 type="file" 
                 accept="image/*" 
                 capture="environment"
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={handleFileChange}
               />

               {error && (
                 <div className="text-red-500 text-sm text-center px-4 py-2 bg-red-50 rounded-lg w-full">
                   {error}
                 </div>
               )}

               <button 
                 onClick={handleScan}
                 disabled={!imagePreview}
                 className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                 Analisar Preços
               </button>
            </div>
          )}

          {/* Step 2: Scanning Loading State */}
          {isScanning && (
            <div className="flex flex-col items-center justify-center h-64 gap-6">
               <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-brand-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                  </div>
               </div>
               <div className="text-center space-y-1">
                 <h3 className="font-bold text-gray-800 dark:text-white">Lendo Cupom...</h3>
                 <p className="text-sm text-gray-500">A IA está comparando com sua lista.</p>
               </div>
            </div>
          )}

          {/* Step 3: Results & Selection */}
          {scannedItems.length > 0 && (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Itens Encontrados</span>
                 <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded-full">{selectedIndices.size} selecionados</span>
               </div>

               <div className="space-y-2">
                 {scannedItems.map((item, idx) => {
                   const isSelected = selectedIndices.has(idx);
                   const isExpected = expectedItemNames.some(name => name.toLowerCase() === item.originalName.toLowerCase());

                   return (
                     <div 
                        key={idx} 
                        onClick={() => toggleSelection(idx)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-white border-brand-500 ring-1 ring-brand-500 dark:bg-gray-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-70'}`}
                     >
                        <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-300'}`}>
                           {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-900 dark:text-white truncate">{item.originalName}</span>
                              <div className="flex items-center gap-1.5">
                                 {item.quantity > 1 && (
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                        {item.quantity}x
                                    </span>
                                 )}
                                 <span className="font-bold text-green-600">{formatCurrency(item.price)}</span>
                              </div>
                           </div>
                           <p className="text-xs text-gray-500 truncate" title={item.receiptName}>
                             Cupom: "{item.receiptName}"
                           </p>
                           {isExpected && <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded inline-block mt-1">Na Lista</span>}
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {scannedItems.length > 0 && (
           <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button 
                onClick={() => { setScannedItems([]); setImagePreview(null); }}
                className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Refazer
              </button>
              <button 
                onClick={handleConfirm}
                disabled={selectedIndices.size === 0}
                className="flex-1 py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                Aplicar Preços
              </button>
           </div>
        )}
      </div>
    </div>
  );
};
