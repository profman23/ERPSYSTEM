import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PermissionCheckboxProps {
  id: string;
  label: string;
  labelAr?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  level?: 'module' | 'screen' | 'action';
  actionType?: string;
}

const actionTypeStyles: Record<string, React.CSSProperties> = {
  CREATE: { color: 'var(--color-success)' },
  READ: { color: 'var(--color-info)' },
  UPDATE: { color: 'var(--color-warning)' },
  DELETE: { color: 'var(--color-danger)' },
  EXPORT: { color: 'var(--color-accent)' },
  IMPORT: { color: 'var(--color-accent)' },
  APPROVE: { color: 'var(--color-warning)' },
  CUSTOM: { color: 'var(--color-text-secondary)' },
};

export function PermissionCheckbox({
  id,
  label,
  labelAr,
  checked,
  onCheckedChange,
  disabled = false,
  indeterminate: _indeterminate = false,
  level = 'action',
  actionType,
}: PermissionCheckboxProps) {
  void _indeterminate;
  const levelStyles = {
    module: 'font-semibold text-base',
    screen: 'font-medium text-sm',
    action: 'font-normal text-sm',
  };

  const actionStyle = actionType ? actionTypeStyles[actionType] || actionTypeStyles.CUSTOM : {};

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label
        htmlFor={id}
        className={cn(
          levelStyles[level],
          'cursor-pointer select-none',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={actionStyle}
      >
        {label}
        {labelAr && (
          <span className="ml-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            ({labelAr})
          </span>
        )}
      </Label>
    </div>
  );
}
