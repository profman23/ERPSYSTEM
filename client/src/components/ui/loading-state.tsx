import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'muted';
  message?: string;
  fullPage?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function LoadingState({
  size = 'md',
  tone = 'accent',
  message,
  fullPage = false,
  className,
}: LoadingStateProps) {
  const spinnerColor = tone === 'accent' 
    ? 'var(--color-accent)' 
    : 'var(--color-text-muted)';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullPage && 'min-h-[50vh]',
        className
      )}
    >
      <Loader2
        className={cn('animate-spin', sizeClasses[size])}
        style={{ color: spinnerColor }}
      />
      {message && (
        <p
          className={cn(textSizes[size])}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default LoadingState;
