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
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 max-w-md ${
          isSuccess
            ? 'border-primary text-dark bg-primary'
            : isError
            ? 'border-dark text-dark bg-bg-secondary'
            : 'border-dark text-dark bg-secondary'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-dark shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-dark shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-dark shrink-0" />}

        <div className="text-sm font-medium pr-2 flex-1">{message}</div>

        <button
          onClick={onClose}
          className="text-dark/70 hover:text-dark p-1 rounded-lg hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
