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

const actionTypeColors: Record<string, string> = {
  CREATE: 'text-green-600 dark:text-green-400',
  READ: 'text-blue-600 dark:text-blue-400',
  UPDATE: 'text-yellow-600 dark:text-yellow-400',
  DELETE: 'text-red-600 dark:text-red-400',
  EXPORT: 'text-purple-600 dark:text-purple-400',
  IMPORT: 'text-indigo-600 dark:text-indigo-400',
  APPROVE: 'text-orange-600 dark:text-orange-400',
  CUSTOM: 'text-gray-600 dark:text-gray-400',
};

export function PermissionCheckbox({
  id,
  label,
  labelAr,
  checked,
  onCheckedChange,
  disabled = false,
  indeterminate = false,
  level = 'action',
  actionType,
}: PermissionCheckboxProps) {
  const levelStyles = {
    module: 'font-semibold text-base',
    screen: 'font-medium text-sm',
    action: 'font-normal text-sm',
  };

  const actionColor = actionType ? actionTypeColors[actionType] || actionTypeColors.CUSTOM : '';

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(indeterminate && 'data-[state=checked]:bg-gray-400')}
      />
      <Label
        htmlFor={id}
        className={cn(
          levelStyles[level],
          actionColor,
          'cursor-pointer select-none',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {label}
        {labelAr && (
          <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
            ({labelAr})
          </span>
        )}
      </Label>
    </div>
  );
}
