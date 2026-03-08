/**
 * AccountViewPanel — Read-only summary view for a selected COA account
 *
 * Shows: code, type badge, name, properties table, description, action buttons
 */

import {
  Hash,
  Layers,
  DollarSign,
  FileText,
  GitBranch,
  Shield,
  Pencil,
  Plus,
  Ban,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/useResponsive';
import { DetailRow } from './AccountFormRow';
import { ACCOUNT_TYPE_BADGE } from './coaConstants';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AccountViewPanelProps {
  account: ChartOfAccount;
  canModify: boolean;
  isRTL: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onDeactivate: () => void;
  isDeactivating: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountViewPanel({ account, canModify, isRTL, onEdit, onAddChild, onDeactivate, isDeactivating }: AccountViewPanelProps) {
  const isMobile = useIsMobile();
  const badge = ACCOUNT_TYPE_BADGE[account.accountType];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>
              {account.code}
            </span>
            {badge && (
              <Badge variant={badge.variant} size="sm">
                {isRTL ? badge.labelAr : badge.label}
              </Badge>
            )}
          </div>
          <h3 className="text-xl font-semibold mt-1" style={{ color: 'var(--color-text)' }}>
            {isRTL && account.nameAr ? account.nameAr : account.name}
          </h3>
          {account.nameAr && !isRTL && (
            <p className="text-sm mt-0.5" dir="rtl" style={{ color: 'var(--color-text-secondary)' }}>
              {account.nameAr}
            </p>
          )}
          {account.name && isRTL && account.nameAr && (
            <p className="text-sm mt-0.5" dir="ltr" style={{ color: 'var(--color-text-secondary)' }}>
              {account.name}
            </p>
          )}
        </div>

        {/* Properties */}
        <div
          className="rounded-lg border divide-y"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-text) 5%)' }}
        >
          <DetailRow
            icon={Layers}
            label={isRTL ? 'النوع' : 'Type'}
            value={badge ? (isRTL ? badge.labelAr : badge.label) : account.accountType}
          />
          <DetailRow
            icon={DollarSign}
            label={isRTL ? 'الرصيد' : 'Balance'}
            value={
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                0.00
              </span>
            }
          />
          <DetailRow
            icon={FileText}
            label={isRTL ? 'قابل للترحيل' : 'Postable'}
            value={
              account.isPostable
                ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{isRTL ? 'نعم' : 'Yes'}</span>
                : <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-gray-400" />{isRTL ? 'لا (مجموعة)' : 'No (Group)'}</span>
            }
          />
          {account.currency && (
            <DetailRow
              icon={DollarSign}
              label={isRTL ? 'العملة' : 'Currency'}
              value={account.currency}
            />
          )}
          <DetailRow
            icon={GitBranch}
            label={isRTL ? 'المستوى' : 'Level'}
            value={String(account.level)}
          />
          <DetailRow
            icon={Hash}
            label={isRTL ? 'المسار' : 'Path'}
            value={<span className="font-mono text-xs">{account.path}</span>}
          />
          {account.isSystemAccount && (
            <DetailRow
              icon={Shield}
              label={isRTL ? 'حساب نظام' : 'System Account'}
              value={<span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />{isRTL ? 'نعم' : 'Yes'}</span>}
            />
          )}
        </div>

        {/* Description */}
        {(account.description || account.descriptionAr) && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {isRTL ? 'الوصف' : 'Description'}
            </p>
            {account.description && (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {account.description}
              </p>
            )}
            {account.descriptionAr && (
              <p className="text-sm" dir="rtl" style={{ color: 'var(--color-text-secondary)' }}>
                {account.descriptionAr}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canModify && (
        <div
          className={cn(
            'px-4 py-3 border-t shrink-0',
            isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2',
          )}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button size={isMobile ? 'default' : 'sm'} variant="outline" onClick={onEdit} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            {isRTL ? 'تعديل' : 'Edit'}
          </Button>
          {!account.isPostable && (
            <Button size={isMobile ? 'default' : 'sm'} variant="outline" onClick={onAddChild} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {isRTL ? 'إضافة فرعي' : 'Add Child'}
            </Button>
          )}
          <Button
            size={isMobile ? 'default' : 'sm'}
            variant="outline"
            onClick={onDeactivate}
            disabled={isDeactivating || account.isSystemAccount}
            className={cn('gap-1.5', !isMobile && 'ms-auto')}
            style={{ color: 'var(--color-text-danger)', borderColor: 'var(--color-text-danger)' }}
          >
            {isDeactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
            {isRTL ? 'تعطيل' : 'Deactivate'}
          </Button>
        </div>
      )}
    </div>
  );
}
