import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  dismissible?: boolean;
  onDismiss?: () => void;
}

const iconMap = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const getVariantStyles = (variant: string): React.CSSProperties => {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: 'var(--alert-success-bg)',
        borderColor: 'var(--alert-success-border)',
        color: 'var(--alert-success-text)',
      };
    case 'warning':
      return {
        backgroundColor: 'var(--alert-warning-bg)',
        borderColor: 'var(--alert-warning-border)',
        color: 'var(--alert-warning-text)',
      };
    case 'error':
      return {
        backgroundColor: 'var(--alert-danger-bg)',
        borderColor: 'var(--alert-danger-border)',
        color: 'var(--alert-danger-text)',
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

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', dismissible = false, onDismiss, children, style, ...props }, ref) => {
    const variantStyles = getVariantStyles(variant);
    const Icon = iconMap[variant];
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn('relative w-full rounded-lg border p-4 flex gap-3', className)}
        style={{ 
          ...variantStyles, 
          borderRadius: 'var(--radius)',
          ...style 
        }}
        {...props}
      >
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">{children}</div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';
