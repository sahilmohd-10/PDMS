import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const bgStyle = {
    success: 'bg-emerald-900/90 text-white border-emerald-700/60',
    error: 'bg-rose-900/90 text-white border-rose-700/60',
    info: 'bg-slate-900/90 text-white border-slate-700/60'
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-medium ${bgStyle}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span>{toast.text}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white/70 hover:text-white cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
