/**
 * Edit Document Number Series Page
 *
 * Route: /app/administration/setup/document-number-series/:id/edit
 * Single-card form for adjusting prefix, separator, next number, padding.
 * Read-only: Document Type, Branch, Branch Sequence.
 * Follows CreateTaxCodePage pattern (single-card, max-w-2xl).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hash, Type, MapPin, Loader2, Minus, FileText } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useAllBranchesNoFilter } from '@/hooks/useHierarchy';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  useDocumentNumberSeriesDetail,
  useUpdateDocumentNumberSeries,
  documentNumberSeriesKeys,
  type DocumentNumberSeries,
} from '@/hooks/useDocumentNumberSeries';

const DOC_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  PURCHASE_ORDER:   { en: 'Purchase Order',    ar: 'طلب شراء' },
  GOODS_RECEIPT_PO: { en: 'Goods Receipt PO',  ar: 'استلام بضاعة' },
  SALES_INVOICE:    { en: 'Sales Invoice',      ar: 'فاتورة مبيعات' },
  CREDIT_NOTE:      { en: 'Credit Note',        ar: 'إشعار دائن' },
  DELIVERY_NOTE:    { en: 'Delivery Note',      ar: 'إذن تسليم' },
  PAYMENT_RECEIPT:  { en: 'Payment Receipt',    ar: 'إيصال دفع' },
  JOURNAL_ENTRY:    { en: 'Journal Entry',      ar: 'قيد يومية' },
};

interface FormData {
  prefix: string;
  separator: string;
  nextNumber: string;
  padding: string;
}

const initialFormData: FormData = {
  prefix: '',
  separator: '',
  nextNumber: '',
  padding: '8',
};

export default function EditDocumentNumberSeriesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { showToast } = useToast();

  const listPath = getPath('administration/setup/document-number-series');

  const { data: existing, isLoading: detailLoading } = useDocumentNumberSeriesDetail(id);
  const { data: branchesData } = useAllBranchesNoFilter();
  const updateMutation = useUpdateDocumentNumberSeries();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const isSaving = updateMutation.isPending;

  // Pre-fill form when data loads
  useEffect(() => {
    if (existing) {
      setForm({
        prefix: existing.prefix || '',
        separator: existing.separator || '',
        nextNumber: String(existing.nextNumber),
        padding: String(existing.padding),
      });
      setSelectedBranchId(existing.branchId);
    }
  }, [existing]);

  // Branch options for the selector
  const branchOptions = useMemo(() => {
    if (!branchesData) return [];
    return branchesData
      .filter((b) => b.isActive)
      .map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` }));
  }, [branchesData]);

  // When branch changes, look up the matching series for the same doc type
  const isSwitchingBranch = !!(selectedBranchId && existing && selectedBranchId !== existing.branchId);
  const switchParams = { branchId: selectedBranchId, documentType: existing?.documentType, limit: 1 };

  const { data: switchData } = useQuery({
    queryKey: documentNumberSeriesKeys.list(switchParams),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/document-number-series', { params: switchParams });
      return data.data as { data: DocumentNumberSeries[] };
    },
    enabled: isSwitchingBranch,
    staleTime: 30_000,
  });

  // Navigate to the matching series when we find it
  useEffect(() => {
    if (!isSwitchingBranch || !switchData?.data?.length) return;
    const match = switchData.data[0];
    if (match && match.id !== id) {
      navigate(getPath(`administration/setup/document-number-series/${match.id}/edit`), { replace: true });
    }
  }, [switchData, isSwitchingBranch, id, navigate, getPath]);

  const docTypeLabel = existing
    ? (DOC_TYPE_LABELS[existing.documentType]
      ? (isRTL ? DOC_TYPE_LABELS[existing.documentType].ar : DOC_TYPE_LABELS[existing.documentType].en)
      : existing.documentType)
    : '...';

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Preview formatted number
  const previewNumber = (() => {
    const num = parseInt(form.nextNumber, 10);
    const pad = parseInt(form.padding, 10);
    if (isNaN(num) || isNaN(pad)) return '—';
    const padded = String(num).padStart(pad, '0');
    if (form.prefix) {
      return `${form.prefix}${form.separator}${padded}`;
    }
    return padded;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    if (!existing) return;

    const newErrors: Record<string, string> = {};
    const nextNum = parseInt(form.nextNumber, 10);
    const padding = parseInt(form.padding, 10);

    if (isNaN(nextNum) || nextNum < 1) {
      newErrors.nextNumber = isRTL ? 'الرقم التالي يجب أن يكون 1 على الأقل' : 'Next number must be at least 1';
    }
    if (isNaN(padding) || padding < 1 || padding > 15) {
      newErrors.padding = isRTL ? 'الحشو يجب أن يكون بين 1 و 15' : 'Padding must be between 1 and 15';
    }
    if (form.prefix.length > 10) {
      newErrors.prefix = isRTL ? 'البادئة يجب أن تكون 10 أحرف أو أقل' : 'Prefix must be 10 characters or less';
    }
    if (form.separator.length > 5) {
      newErrors.separator = isRTL ? 'الفاصل يجب أن يكون 5 أحرف أو أقل' : 'Separator must be 5 characters or less';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: id!,
        prefix: form.prefix,
        separator: form.separator,
        nextNumber: nextNum,
        padding,
        version: existing.version,
      });
      showToast('success', isRTL ? 'تم تحديث السلسلة بنجاح' : 'Series updated successfully');
      navigate(listPath);
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
    }
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'تعديل سلسلة الأرقام' : 'Edit Number Series'}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border max-w-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {submitError && (
          <div
            className="px-5 py-3 text-sm border-b"
            style={{
              backgroundColor: 'var(--badge-danger-bg)',
              borderColor: 'var(--badge-danger-border)',
              color: 'var(--color-text-danger)',
            }}
          >
            {submitError}
          </div>
        )}

        <div className="px-5 py-5 space-y-4">
          {/* Read-only info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={FileText} emoji="📋" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'نوع المستند' : 'Document Type'}
              </Label>
              <Input value={docTypeLabel} disabled className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'الفرع' : 'Branch'}
              </Label>
              <SimpleSelect
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
                options={branchOptions}
                placeholder={isRTL ? 'اختر الفرع' : 'Select branch'}
                triggerClassName="h-9"
              />
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'البادئة' : 'Prefix'}
              </Label>
              <Input
                value={form.prefix}
                onChange={(e) => updateField('prefix', e.target.value)}
                placeholder={isRTL ? 'اختياري مثل: PO' : 'Optional, e.g. PO'}
                className="h-9 font-mono"
                error={!!errors.prefix}
              />
              {errors.prefix && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.prefix}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Minus} emoji="➖" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'الفاصل' : 'Separator'}
              </Label>
              <Input
                value={form.separator}
                onChange={(e) => updateField('separator', e.target.value)}
                placeholder={isRTL ? 'اختياري مثل: -' : 'Optional, e.g. -'}
                className="h-9 font-mono"
                error={!!errors.separator}
              />
              {errors.separator && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.separator}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Hash} emoji="🔢" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'الرقم التالي' : 'Next Number'} *
              </Label>
              <Input
                type="number"
                value={form.nextNumber}
                onChange={(e) => updateField('nextNumber', e.target.value)}
                className="h-9 font-mono"
                min={1}
                error={!!errors.nextNumber}
              />
              {errors.nextNumber && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.nextNumber}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'الحشو (عدد الأرقام)' : 'Padding (digits)'} *
              </Label>
              <Input
                type="number"
                value={form.padding}
                onChange={(e) => updateField('padding', e.target.value)}
                className="h-9 font-mono"
                min={1}
                max={15}
                error={!!errors.padding}
              />
              {errors.padding && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.padding}</p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-md px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--badge-info-bg)',
              borderColor: 'var(--badge-info-border)',
              color: 'var(--badge-info-text)',
              border: '1px solid',
            }}
          >
            <span className="font-medium">{isRTL ? 'معاينة:' : 'Preview:'}</span>{' '}
            <span className="font-mono">{previewNumber}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(listPath)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
