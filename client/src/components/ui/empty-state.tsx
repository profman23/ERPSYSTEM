import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    iconContainer: 'w-10 h-10',
    iconSize: 'w-5 h-5',
    titleSize: 'text-sm font-medium',
    descriptionSize: 'text-xs',
    gap: 'gap-3',
    buttonSize: 'sm' as const,
  },
  md: {
    iconContainer: 'w-14 h-14',
    iconSize: 'w-7 h-7',
    titleSize: 'text-lg font-semibold',
    descriptionSize: 'text-sm',
    gap: 'gap-4',
    buttonSize: 'default' as const,
  },
  lg: {
    iconContainer: 'w-20 h-20',
    iconSize: 'w-10 h-10',
    titleSize: 'text-xl font-semibold',
    descriptionSize: 'text-base',
    gap: 'gap-5',
    buttonSize: 'lg' as const,
  },
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12',
        config.gap,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          config.iconContainer
        )}
        style={{ backgroundColor: 'var(--color-accent-light)' }}
      >
        <Icon
          className={config.iconSize}
          style={{ color: 'var(--color-accent)' }}
        />
      </div>

      <div className="space-y-2">
        <h3
          className={config.titleSize}
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn('max-w-md', config.descriptionSize)}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          variant={action.variant || 'default'}
          size={config.buttonSize}
          onClick={action.onClick}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
