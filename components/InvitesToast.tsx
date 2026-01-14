import React from 'react';
import { Invite } from '../types';

interface InvitesToastProps {
  invites: Invite[];
  onAccept: (invite: Invite) => void;
  onReject: (inviteId: string) => void;
}

export const InvitesToast: React.FC<InvitesToastProps> = ({ invites, onAccept, onReject }) => {
  if (invites.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[90] space-y-2">
      {invites.map(invite => (
        <div key={invite.id} className="bg-white rounded-xl shadow-xl border border-blue-100 p-4 animate-slide-up flex flex-col gap-3">
           <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Convite para Lista</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold text-blue-600">{invite.invitedBy}</span> convidou você para colaborar na lista <span className="font-semibold">"{invite.listName}"</span>.
                </p>
              </div>
           </div>
           
           <div className="flex gap-2 justify-end">
             <button 
               onClick={() => onReject(invite.id)}
               className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
             >
               Recusar
             </button>
             <button 
               onClick={() => onAccept(invite)}
               className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
             >
               Aceitar e Entrar
             </button>
           </div>
        </div>
      ))}
    </div>
  );
};