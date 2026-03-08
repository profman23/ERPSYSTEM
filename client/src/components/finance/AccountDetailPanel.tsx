/**
 * AccountDetailPanel — Right side of the Master-Detail COA layout
 *
 * Thin mode-switching wrapper that delegates to:
 * - IdleState (no selection)
 * - AccountViewPanel (read-only summary)
 * - AccountFormPanel (create/edit form)
 */

import { useState, useCallback } from 'react';
import { ListTree } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { useDeleteChartOfAccount, type ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { AccountViewPanel } from './AccountViewPanel';
import { AccountFormPanel } from './AccountFormPanel';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type DetailPanelMode = 'idle' | 'view' | 'edit' | 'create';

export interface AccountDetailPanelProps {
  selectedAccount: ChartOfAccount | null;
  mode: DetailPanelMode;
  onModeChange: (mode: DetailPanelMode) => void;
  createDefaults?: { parentId?: string; accountType?: string };
  canModify: boolean;
  isRTL: boolean;
  onSuccess?: (accountId?: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// IDLE STATE
// ═══════════════════════════════════════════════════════════════

function IdleState({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6">
      <StyledIcon
        icon={ListTree}
        emoji="📊"
        className="w-12 h-12"
        style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}
      />
      <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
        {isRTL ? 'اختر حساباً من الشجرة لعرض تفاصيله' : 'Select an account from the tree to view its details'}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountDetailPanel({
  selectedAccount,
  mode,
  onModeChange,
  createDefaults,
  canModify,
  isRTL,
  onSuccess,
}: AccountDetailPanelProps) {
  const deleteMutation = useDeleteChartOfAccount();
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = useCallback(async () => {
    if (!selectedAccount) return;
    setIsDeactivating(true);
    try {
      await deleteMutation.mutateAsync(selectedAccount.id);
      onModeChange('idle');
      onSuccess?.();
    } catch {
      // error handled by mutation
    } finally {
      setIsDeactivating(false);
    }
  }, [selectedAccount, deleteMutation, onModeChange, onSuccess]);

  const handleFormSuccess = useCallback((accountId?: string) => {
    onSuccess?.(accountId);
    onModeChange('view');
  }, [onModeChange, onSuccess]);

  // Idle / no selection
  if (mode === 'idle' || (!selectedAccount && mode === 'view')) {
    return <IdleState isRTL={isRTL} />;
  }

  // View mode
  if (mode === 'view' && selectedAccount) {
    return (
      <AccountViewPanel
        account={selectedAccount}
        canModify={canModify}
        isRTL={isRTL}
        onEdit={() => onModeChange('edit')}
        onAddChild={() => onModeChange('create')}
        onDeactivate={handleDeactivate}
        isDeactivating={isDeactivating}
      />
    );
  }

  // Edit mode
  if (mode === 'edit' && selectedAccount) {
    return (
      <AccountFormPanel
        account={selectedAccount}
        isEdit
        isRTL={isRTL}
        onCancel={() => onModeChange('view')}
        onSuccess={handleFormSuccess}
      />
    );
  }

  // Create mode
  if (mode === 'create') {
    const defaults = selectedAccount
      ? { parentId: selectedAccount.id, accountType: selectedAccount.accountType }
      : createDefaults;

    return (
      <AccountFormPanel
        account={null}
        isEdit={false}
        isRTL={isRTL}
        createDefaults={defaults}
        onCancel={() => onModeChange(selectedAccount ? 'view' : 'idle')}
        onSuccess={handleFormSuccess}
      />
    );
  }

  return <IdleState isRTL={isRTL} />;
}

export default AccountDetailPanel;
