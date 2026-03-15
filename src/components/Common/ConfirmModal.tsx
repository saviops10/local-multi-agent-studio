import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0F0F0F] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8">
              <p className="text-zinc-400 text-sm leading-relaxed">
                {message}
              </p>
            </div>

            <div className="p-6 bg-zinc-900/30 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-zinc-800 transition-all"
              >
                {cancelText}
              </button>
              <button 
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-3 px-4 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-xl ${
                  variant === 'danger' 
                    ? 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
