import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export default function NotificationToast({ type = 'success', message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border glass-panel backdrop-blur-md transition-all duration-300 max-w-md ${
          isSuccess
            ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/80 shadow-emerald-950/50'
            : isError
            ? 'border-rose-500/40 text-rose-300 bg-rose-950/80 shadow-rose-950/50'
            : 'border-cyan-500/40 text-cyan-300 bg-cyan-950/80 shadow-cyan-950/50'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}

        <div className="text-sm font-medium pr-2 flex-1">{message}</div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
