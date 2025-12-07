import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const getToastStyles = (type: ToastType): React.CSSProperties => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: 'var(--alert-success-bg)',
        borderColor: 'var(--alert-success-border)',
        color: 'var(--alert-success-text)',
      };
    case 'error':
      return {
        backgroundColor: 'var(--alert-danger-bg)',
        borderColor: 'var(--alert-danger-border)',
        color: 'var(--alert-danger-text)',
      };
    case 'warning':
      return {
        backgroundColor: 'var(--alert-warning-bg)',
        borderColor: 'var(--alert-warning-border)',
        color: 'var(--alert-warning-text)',
      };
    case 'info':
      return {
        backgroundColor: 'var(--alert-info-bg)',
        borderColor: 'var(--alert-info-border)',
        color: 'var(--alert-info-text)',
      };
    default:
      return {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      };
  }
};

export function Toast({ id, type, title, description, onClose }: ToastProps) {
  const Icon = iconMap[type];
  const toastStyles = getToastStyles(type);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300'
      )}
      style={{
        ...toastStyles,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm opacity-80 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; title: string; description?: string }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<{ id: string; type: ToastType; title: string; description?: string }>>([]);

  const showToast = React.useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
