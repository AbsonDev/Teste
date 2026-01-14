import React, { useState, useEffect } from 'react';
import { sendInvite, subscribeToOutgoingInvites, cancelInvite, updateListMemberRole, removeListMember } from '../services/firebase';
import { Invite, ShoppingListGroup, Role } from '../types';

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
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');
  
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

  // Invite Logic
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      await sendInvite(list.id, list.name, email);
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

  // Member Management Logic
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

  // Reconstruct member info for display
  const membersList = (list.members || []).map((uid, index) => ({
      uid,
      email: list.memberEmails?.[index] || 'Desconhecido',
      role: list.roles?.[uid] || 'viewer'
  }));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Compartilhar Lista</h2>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{list.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
           <button 
             onClick={() => setActiveTab('invite')}
             className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'invite' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Convidar
           </button>
           <button 
             onClick={() => setActiveTab('members')}
             className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'members' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Membros ({membersList.length})
           </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
           {activeTab === 'invite' ? (
             <>
                {/* Invite View */}
                {isEditor ? (
                    <form onSubmit={handleShare} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do usuário</label>
                        <input
                        type="email"
                        placeholder="exemplo@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        autoFocus
                        required
                        />
                        <p className="text-xs text-gray-400 mt-2">
                        O usuário será convidado como <strong>Editor</strong>.
                        </p>
                    </div>

                    {status === 'success' && (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Convite enviado!
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                        {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Enviando...' : 'Enviar Convite'}
                        {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                    </button>
                    </form>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        Apenas Donos e Editores podem convidar pessoas.
                    </div>
                )}

                {pendingInvites.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-gray-100">
                        <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Convites Pendentes</h3>
                        <div className="space-y-2">
                            {pendingInvites.map(invite => (
                                <div key={invite.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                                            ?
                                        </div>
                                        <span className="text-sm text-gray-700 truncate">{invite.toEmail}</span>
                                    </div>
                                    {isEditor && (
                                        <button 
                                            type="button"
                                            onClick={() => handleCancelInvite(invite.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-white transition-colors"
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
             </>
           ) : (
             <>
               {/* Members View */}
               <div className="space-y-3">
                 {membersList.map((member) => {
                     const isMe = member.uid === currentUser.uid;
                     const isMemberOwner = member.role === 'owner';
                     const isRemoving = removingIds.includes(member.uid);
                     
                     return (
                        <div key={member.uid} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-blue-100 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isMemberOwner ? 'bg-orange-400' : 'bg-blue-400'}`}>
                                    {member.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                        {member.email} {isMe && <span className="text-gray-400">(Você)</span>}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                                        {member.role === 'owner' ? 'Dono' : (member.role === 'editor' ? 'Editor' : 'Leitor')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {isOwner && !isMemberOwner && !isMe ? (
                                    <>
                                        {/* Role Select */}
                                        <select 
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(member.uid, e.target.value as Role)}
                                            className="text-xs border border-gray-200 rounded px-1 py-1 bg-white outline-none focus:border-blue-500"
                                            disabled={isRemoving}
                                        >
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Leitor</option>
                                        </select>
                                        
                                        {/* Remove Button */}
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
                                ) : (
                                    // Just show icon if can't edit
                                    <div className="w-6"></div>
                                )}
                            </div>
                        </div>
                     );
                 })}
               </div>

               {!isOwner && (
                   <div className="mt-8 pt-4 border-t border-gray-100">
                       <button 
                         onClick={handleLeaveList}
                         disabled={isLeaving}
                         className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                         {isLeaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                                Saindo...
                            </>
                         ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                Sair da Lista
                            </>
                         )}
                       </button>
                   </div>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};