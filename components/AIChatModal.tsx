import React, { useState, useEffect, useRef } from 'react';
import { startChatSession } from '../services/geminiService';
import { ShoppingItem, Category } from '../types';
import { Chat } from '@google/genai';
import { logUserEvent } from '../services/firebase';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currentItems: ShoppingItem[];
  onAddItems: (items: Partial<ShoppingItem>[]) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<ShoppingItem>) => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isFunctionCall?: boolean;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  currentItems,
  onAddItems,
  onRemoveItem,
  onUpdateItem
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Olá! Sou seu assistente de compras. Posso adicionar, remover ou alterar itens para você.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref for the chat session instance
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (isOpen && !chatRef.current) {
        const catNames = categories.map(c => c.name);
        chatRef.current = startChatSession(catNames);
    }
  }, [isOpen, categories]);

  // Provide context to AI when items change (hidden system prompt concept)
  // Note: In a real complex app, we might send the full list state to the model periodically,
  // but for now we rely on the user naming the items they want to manipulate.

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findItemByName = (name: string): ShoppingItem | undefined => {
      const normalizedSearch = name.trim().toLowerCase();
      // Try exact match first
      let found = currentItems.find(i => i.name.toLowerCase() === normalizedSearch);
      
      // Try contains match
      if (!found) {
          found = currentItems.find(i => i.name.toLowerCase().includes(normalizedSearch));
      }

      // Try fuzzy / reverse contains (e.g. searching "Feijão" finds "Feijão Carioca")
      if (!found) {
          found = currentItems.find(i => normalizedSearch.includes(i.name.toLowerCase()));
      }
      
      return found;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !chatRef.current) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);

    // Analytics Log
    logUserEvent('ai_chat_sent', { message_length: userMsg.length });

    try {
      let response = await chatRef.current.sendMessage({ message: userMsg });
      
      // Handle Function Calls (Tools)
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
          const functionResponses: any[] = [];
          let actionSummary = '';

          for (const call of functionCalls) {
              // Analytics Log for Tool Use
              logUserEvent('ai_function_executed', { function_name: call.name });
              
              // --- ADD ITEMS ---
              if (call.name === 'addItemsToList') {
                  const args = call.args as any;
                  if (args.items && Array.isArray(args.items)) {
                      onAddItems(args.items);
                      actionSummary += `Adicionei ${args.items.length} itens. `;
                      functionResponses.push({
                          name: call.name,
                          id: call.id,
                          response: { result: "Items added successfully." }
                      });
                  }
              }
              
              // --- REMOVE ITEMS ---
              else if (call.name === 'removeItemsFromList') {
                  const args = call.args as any;
                  const namesToRemove = args.itemNames as string[];
                  let removedCount = 0;
                  
                  if (namesToRemove) {
                      namesToRemove.forEach(name => {
                          const item = findItemByName(name);
                          if (item) {
                              onRemoveItem(item.id);
                              removedCount++;
                          }
                      });
                  }

                  actionSummary += removedCount > 0 ? `Removi ${removedCount} itens. ` : `Não encontrei itens para remover. `;
                  
                  functionResponses.push({
                      name: call.name,
                      id: call.id,
                      response: { result: `Removed ${removedCount} items found matching names.` }
                  });
              }

              // --- UPDATE ITEMS ---
              else if (call.name === 'updateItemsInList') {
                  const args = call.args as any;
                  const updates = args.updates as any[];
                  let updatedCount = 0;

                  if (updates) {
                      updates.forEach(update => {
                          const item = findItemByName(update.originalName);
                          if (item) {
                              const changes: Partial<ShoppingItem> = {};
                              if (update.newName) changes.name = update.newName;
                              if (update.newQuantity) changes.quantity = update.newQuantity;
                              
                              onUpdateItem(item.id, changes);
                              updatedCount++;
                          }
                      });
                  }

                  actionSummary += updatedCount > 0 ? `Atualizei ${updatedCount} itens. ` : `Não encontrei itens para atualizar. `;

                  functionResponses.push({
                      name: call.name,
                      id: call.id,
                      response: { result: `Updated ${updatedCount} items.` }
                  });
              }
          }

          // Show a little system feedback message for the action performed
          if (actionSummary) {
              setMessages(prev => [...prev, { 
                  id: Date.now().toString() + 'sys', 
                  role: 'model', 
                  text: `✅ ${actionSummary}`,
                  isFunctionCall: true
              }]);
          }

          // Send function result back to model to continue conversation
          if (functionResponses.length > 0) {
              // Wrap function responses in the 'parts' structure expected by the API
              const responseParts = functionResponses.map((fr: any) => ({
                functionResponse: {
                  name: fr.name,
                  response: fr.response
                }
              }));
              response = await chatRef.current.sendMessage({ message: responseParts });
          }
      }

      // Add Model Text Response (if any exists after tool processing)
      const modelText = response.text;
      if (modelText) {
          setMessages(prev => [...prev, { id: Date.now().toString() + 'r', role: 'model', text: modelText }]);
      }

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Desculpe, tive um erro ao processar. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-none">
       {/* Backdrop */}
       <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />

      <div className="bg-white w-full h-[80vh] sm:h-[600px] sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto animate-slide-up relative z-10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
           <div className="flex items-center gap-2">
             <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
             </div>
             <div>
                <h2 className="font-bold text-lg leading-tight">Assistente IA</h2>
                <p className="text-xs text-purple-100 opacity-90">Inteligência Artificial</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white rounded-tr-none' 
                      : (msg.isFunctionCall ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none')
                  }`}
                >
                   {msg.text}
                </div>
             </div>
           ))}
           {isLoading && (
             <div className="flex justify-start">
               <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-100 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};