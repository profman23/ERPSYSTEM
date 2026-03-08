/**
 * Posting Period Sub-Periods Page
 *
 * Route: /app/administration/setup/posting-periods/:id/sub-periods
 * Shows fiscal year header + table of 12 monthly sub-periods.
 * Toggle active/inactive per sub-period to control posting.
 * Status badges: OPEN (green), CLOSED (yellow), LOCKED (red).
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Calendar, Ban, CheckCircle2, Loader2, Lock, Unlock,
  Activity, Settings,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import {
  usePostingPeriodDetail,
  usePostingPeriodSubPeriods,
  useUpdatePostingSubPeriod,
  type PostingSubPeriod,
} from '@/hooks/usePostingPeriods';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'OPEN':
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
    case 'CLOSED':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    case 'LOCKED':
      return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
    default:
      return { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
  }
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  OPEN: { en: 'Open', ar: 'مفتوح' },
  CLOSED: { en: 'Closed', ar: 'مغلق' },
  LOCKED: { en: 'Locked', ar: 'مقفل' },
};

export default function PostingPeriodSubPeriodsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { showToast } = useToast();

  const { data: period, isLoading: periodLoading } = usePostingPeriodDetail(id);
  const { data: subData, isLoading: subLoading } = usePostingPeriodSubPeriods(id);
  const updateMutation = useUpdatePostingSubPeriod();

  const subPeriods = subData?.data || [];
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = useCallback(async (sub: PostingSubPeriod) => {
    if (sub.status === 'LOCKED') {
      showToast('error', isRTL ? 'لا يمكن تعديل فترة مقفلة' : 'Cannot modify a locked period');
      return;
    }
    setTogglingId(sub.id);
    try {
      await updateMutation.mutateAsync({
        subId: sub.id,
        isActive: !sub.isActive,
        version: sub.version,
      });
      showToast('success', isRTL ? 'تم تحديث الفترة بنجاح' : 'Period updated successfully');
    } catch {
      showToast('error', isRTL ? 'فشل تحديث الفترة' : 'Failed to update period');
    } finally {
      setTogglingId(null);
    }
  }, [updateMutation, showToast, isRTL]);

  const handleStatusChange = useCallback(async (sub: PostingSubPeriod, newStatus: 'OPEN' | 'CLOSED' | 'LOCKED') => {
    if (sub.status === 'LOCKED') {
      showToast('error', isRTL ? 'لا يمكن تعديل فترة مقفلة' : 'Cannot modify a locked period');
      return;
    }
    setTogglingId(sub.id);
    try {
      await updateMutation.mutateAsync({
        subId: sub.id,
        status: newStatus,
        version: sub.version,
      });
      showToast('success', isRTL ? 'تم تحديث حالة الفترة' : 'Period status updated');
    } catch {
      showToast('error', isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }, [updateMutation, showToast, isRTL]);

  const columns = useMemo<ColumnDef<PostingSubPeriod, unknown>[]>(() => [
    {
      id: 'periodNumber',
      accessorKey: 'periodNumber',
      header: () => <span>#</span>,
      size: 60,
      minSize: 50,
      maxSize: 80,
      cell: ({ row }) => (
        <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {row.original.periodNumber}
        </span>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: () => <span>{isRTL ? 'الرمز' : 'Code'}</span>,
      size: 130,
      minSize: 100,
      maxSize: 170,
      cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: () => <span>{isRTL ? 'الشهر' : 'Month'}</span>,
      size: 160,
      minSize: 120,
      maxSize: 220,
      cell: ({ row }) => (
        <span>{isRTL && row.original.nameAr ? row.original.nameAr : row.original.name}</span>
      ),
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: () => <span>{isRTL ? 'من' : 'From'}</span>,
      size: 120,
      minSize: 100,
      maxSize: 160,
      cell: ({ row }) => (
        <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {row.original.startDate}
        </span>
      ),
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: () => <span>{isRTL ? 'إلى' : 'To'}</span>,
      size: 120,
      minSize: 100,
      maxSize: 160,
      cell: ({ row }) => (
        <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {row.original.endDate}
        </span>
      ),
    },
    {
      id: 'status',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
      cell: ({ row }) => {
        const label = STATUS_LABELS[row.original.status];
        return (
          <Badge className="border" style={getStatusStyle(row.original.status)}>
            {label ? (isRTL ? label.ar : label.en) : row.original.status}
          </Badge>
        );
      },
    },
    {
      id: 'active',
      header: () => <span>{isRTL ? 'مفعل' : 'Enabled'}</span>,
      size: 90,
      minSize: 70,
      maxSize: 120,
      cell: ({ row }) => (
        <Badge
          className="border"
          style={row.original.isActive
            ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
            : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }
          }
        >
          {row.original.isActive ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          {t('common.actions')}
        </span>
      ),
      size: 140,
      minSize: 120,
      maxSize: 180,
      enableResizing: false,
      cell: ({ row }) => {
        const sub = row.original;
        const isToggling = togglingId === sub.id;
        const isLocked = sub.status === 'LOCKED';

        return (
          <div className="flex items-center gap-1">
            {/* Toggle enable/disable */}
            <button
              type="button"
              disabled={isToggling || isLocked}
              onClick={(e) => { e.stopPropagation(); handleToggleActive(sub); }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ color: sub.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
              onMouseEnter={(e) => { if (!isToggling && !isLocked) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title={sub.isActive ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
            >
              {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sub.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close period */}
            {sub.status === 'OPEN' && (
              <button
                type="button"
                disabled={isToggling}
                onClick={(e) => { e.stopPropagation(); handleStatusChange(sub, 'CLOSED'); }}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-warning)' }}
                onMouseEnter={(e) => { if (!isToggling) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title={isRTL ? 'إغلاق الفترة' : 'Close Period'}
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Re-open period */}
            {sub.status === 'CLOSED' && (
              <button
                type="button"
                disabled={isToggling}
                onClick={(e) => { e.stopPropagation(); handleStatusChange(sub, 'OPEN'); }}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-success)' }}
                onMouseEnter={(e) => { if (!isToggling) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title={isRTL ? 'فتح الفترة' : 'Re-open Period'}
              >
                <Unlock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ], [t, isRTL, togglingId, handleToggleActive, handleStatusChange]);

  const isLoading = periodLoading || subLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-6">
        <ErrorState
          title={isRTL ? 'فترة الترحيل غير موجودة' : 'Posting period not found'}
          message={isRTL ? 'الفترة المطلوبة غير موجودة' : 'The requested posting period was not found'}
          retryAction={() => navigate(getPath('administration/setup/posting-periods'))}
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Calendar} emoji="📅" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL && period.nameAr ? period.nameAr : period.name}
            </h1>
            <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {period.code} &middot; {period.startDate} → {period.endDate}
            </p>
          </div>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Sub-Periods Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {subLoading ? (
          <div className="p-6">
            <TableSkeleton rows={12} columns={7} showHeader />
          </div>
        ) : (
          <AdvancedDataTable<PostingSubPeriod>
            tableId="posting-sub-periods-table"
            data={subPeriods}
            columns={columns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={false}
            emptyMessage={isRTL ? 'لا توجد فترات فرعية' : 'No sub-periods found'}
          />
        )}
      </div>

      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate(getPath('administration/setup/posting-periods'))}
        >
          {isRTL ? 'العودة للقائمة' : 'Back to List'}
        </Button>
      </div>
    </div>
  );
}
