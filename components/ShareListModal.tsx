
import React, { useState, useEffect } from 'react';
import { sendInvite, subscribeToOutgoingInvites, cancelInvite, updateListMemberRole, removeListMember, logUserEvent } from '../services/firebase';
import { Invite, ShoppingListGroup, Role, ShoppingItem } from '../types';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingListGroup | undefined;
  currentUser: any;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  isOpen,
  onClose,
  list,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'invite' | 'copy'>('invite');
  
  // Invite State
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  // Management State
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);

  // Subscribe to pending invites
  useEffect(() => {
    if (!isOpen || !list) return;
    const unsub = subscribeToOutgoingInvites(list.id, (invites) => {
      setPendingInvites(invites);
    });
    return () => unsub();
  }, [isOpen, list?.id]);

  if (!isOpen || !list) return null;

  const currentRole = list.roles?.[currentUser.uid] || 'viewer';
  const isOwner = currentRole === 'owner';
  const isEditor = currentRole === 'editor' || isOwner;

  // --- Invite Logic ---
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      await sendInvite(list.id, list.name, email);
      logUserEvent('invite_sent', { list_id: list.id });
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao enviar.");
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (confirm("Cancelar este convite?")) {
        await cancelInvite(inviteId);
    }
  };

  // --- Member Management Logic ---
  const handleRoleChange = async (targetId: string, newRole: Role) => {
      await updateListMemberRole(list.id, targetId, newRole);
  };

  const handleRemoveMember = async (targetId: string, targetEmail: string) => {
      if (confirm(`Tem certeza que deseja remover ${targetEmail}?`)) {
          setRemovingIds(prev => [...prev, targetId]);
          try {
            await removeListMember(list.id, targetId, targetEmail);
          } catch (e: any) {
            alert("Erro ao remover: " + e.message);
          } finally {
            setRemovingIds(prev => prev.filter(id => id !== targetId));
          }
      }
  };

  const handleLeaveList = async () => {
    if (confirm("Tem certeza que deseja sair desta lista?")) {
        setIsLeaving(true);
        try {
            await removeListMember(list.id, currentUser.uid, currentUser.email);
            onClose();
        } catch (e: any) {
            alert("Erro ao sair da lista: " + e.message);
        } finally {
            setIsLeaving(false);
        }
    }
  };

  // --- Export/Text Logic ---
  const generateShareText = () => {
    const items = list.items || [];
    if (items.length === 0) return "Lista vazia!";

    const pendingItems = items.filter(i => !i.completed);
    if (pendingItems.length === 0) return `Tudo comprado na lista *${list.name}*! 🎉`;

    // Group by category
    const grouped: Record<string, ShoppingItem[]> = {};
    pendingItems.forEach(item => {
      const cat = item.category || 'Outros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    let text = `🛒 *Lista: ${list.name}*\n\n`;

    Object.entries(grouped).forEach(([category, catItems]) => {
      text += `*${category.toUpperCase()}*\n`;
      catItems.forEach(item => {
        const qtd = item.quantity && item.quantity > 1 ? ` (${item.quantity}x)` : '';
        const obs = item.note ? ` _(${item.note})_` : '';
        text += `▫️ ${item.name}${qtd}${obs}\n`;
      });
      text += `\n`;
    });

    text += `_Gerado pelo ListaInteligente_`;
    return text;
  };

  const copyToClipboard = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    logUserEvent('share_copy_text', { list_id: list.id });
    alert("Texto copiado para a área de transferência!");
  };

  const sendToWhatsApp = () => {
    const text = generateShareText();
    logUserEvent('share_whatsapp', { list_id: list.id });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Reconstruct member info for display
  const membersList = (list.members || []).map((uid, index) => ({
      uid,
      email: list.memberEmails?.[index] || 'Desconhecido',
      role: list.roles?.[uid] || 'viewer'
  }));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md relative z-10 animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
           <div className="p-5 pb-0">
               <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Compartilhar</h2>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{list.name}</p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
               </div>
               
               <div className="flex">
                  <button 
                    onClick={() => setActiveTab('invite')}
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'invite' ? 'text-brand-600 border-brand-600 dark:text-brand-400' : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Colaboradores
                  </button>
                  <button 
                    onClick={() => setActiveTab('copy')}
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'copy' ? 'text-green-600 border-green-600 dark:text-green-400' : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Enviar Cópia
                  </button>
               </div>
           </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
           {activeTab === 'invite' ? (
             <>
                {/* Invite View */}
                {isEditor ? (
                    <form onSubmit={handleShare} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Adicionar por E-mail</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="exemplo@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 outline-none transition-all"
                                autoFocus
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-brand-200 dark:shadow-none hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
                            >
                                {loading ? '...' : 'Convidar'}
                            </button>
                        </div>
                    </div>

                    {status === 'success' && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Convite enviado!
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg">
                        {errorMessage}
                        </div>
                    )}
                    </form>
                ) : (
                    <div className="text-center py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Apenas Donos e Editores podem convidar pessoas.</p>
                    </div>
                )}

                {/* Lists Members & Invites */}
                <div className="mt-6 space-y-6">
                    {/* Pending Invites */}
                    {pendingInvites.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Convites Pendentes</h3>
                            <div className="space-y-2">
                                {pendingInvites.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 text-xs font-bold shrink-0">
                                                ?
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{invite.toEmail}</span>
                                        </div>
                                        {isEditor && (
                                            <button 
                                                type="button"
                                                onClick={() => handleCancelInvite(invite.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                                                title="Cancelar Convite"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Members */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Membros da Lista</h4>
                        <div className="space-y-3">
                            {membersList.map((member) => {
                                const isMe = member.uid === currentUser.uid;
                                const isMemberOwner = member.role === 'owner';
                                const isRemoving = removingIds.includes(member.uid);
                                
                                return (
                                    <div key={member.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ${isMemberOwner ? 'bg-orange-400' : 'bg-blue-500'}`}>
                                                {member.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    {member.email.split('@')[0]} {isMe && <span className="text-gray-400 font-normal">(Você)</span>}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    {member.role === 'owner' ? 'Dono' : (member.role === 'editor' ? 'Editor' : 'Leitor')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {isOwner && !isMemberOwner && !isMe ? (
                                                <>
                                                    <select 
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.uid, e.target.value as Role)}
                                                        className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 dark:text-gray-200 outline-none focus:border-brand-500"
                                                        disabled={isRemoving}
                                                    >
                                                        <option value="editor">Editor</option>
                                                        <option value="viewer">Leitor</option>
                                                    </select>
                                                    
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveMember(member.uid, member.email);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-50"
                                                        title="Remover da lista"
                                                        disabled={isRemoving}
                                                    >
                                                        {isRemoving ? (
                                                            <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                                        )}
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!isOwner && (
                       <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                           <button 
                             onClick={handleLeaveList}
                             disabled={isLeaving}
                             className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                             {isLeaving ? 'Saindo...' : 'Sair da Lista'}
                           </button>
                       </div>
                    )}
                </div>
             </>
           ) : (
             // --- Copy Tab ---
             <div className="space-y-6 flex flex-col justify-center h-full">
               <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 text-center">
                  <p className="text-sm text-green-800 dark:text-green-300 font-bold mb-1">
                    Modo "Manda no Zap"
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                    Gera um texto formatado apenas com os itens pendentes, organizado por categoria. Ideal para quem não tem o app.
                  </p>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={sendToWhatsApp}
                    className="flex items-center justify-center gap-3 p-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:brightness-105 active:scale-95 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span>Enviar no WhatsApp</span>
                  </button>

                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Copiar Texto</span>
                  </button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
