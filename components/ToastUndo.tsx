import React, { useEffect, useState } from 'react';

interface ToastUndoProps {
    isOpen: boolean;
    onClose: () => void;
    onUndo: () => void;
    message: string;
}

export const ToastUndo: React.FC<ToastUndoProps> = ({ isOpen, onClose, onUndo, message }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Allow fade out animation
            }, 4000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [isOpen, onClose]);

    if (!isOpen && !visible) return null;

    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-4 min-w-[280px] justify-between">
                <span className="text-sm font-medium pl-1">{message}</span>
                <button 
                    onClick={() => {
                        onUndo();
                        setVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-brand-400 font-bold text-sm uppercase tracking-wide hover:text-brand-300 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                >
                    Desfazer
                </button>
                <button 
                    onClick={() => {
                        setVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-gray-500 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
    );
};