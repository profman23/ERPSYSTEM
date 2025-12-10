import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string | number;
  retryAction?: () => void;
  retryLabel?: string;
  backAction?: () => void;
  backLabel?: string;
  variant?: 'inline' | 'page';
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  code,
  retryAction,
  retryLabel = 'Try again',
  backAction,
  backLabel = 'Go back',
  variant = 'inline',
  className,
}: ErrorStateProps) {
  if (variant === 'inline') {
    return (
      <Alert
        variant="error"
        className={cn('', className)}
      >
        <XCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{message}</p>
          {retryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryAction}
              className="mt-3"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              {retryLabel}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 gap-5',
        className
      )}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-danger-light)' }}
      >
        <XCircle
          className="w-8 h-8"
          style={{ color: 'var(--color-danger)' }}
        />
      </div>

      <div className="space-y-2">
        {code && (
          <p
            className="text-xs font-mono uppercase tracking-wider"
            style={{ color: 'var(--color-danger)' }}
          >
            Error {code}
          </p>
        )}
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>
        <p
          className="text-sm max-w-md"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {retryAction && (
          <Button variant="default" onClick={retryAction}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
        {backAction && (
          <Button variant="outline" onClick={backAction}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
