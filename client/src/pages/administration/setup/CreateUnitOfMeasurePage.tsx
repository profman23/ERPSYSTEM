/**
 * Create/Edit Unit of Measure Page
 *
 * Create: /app/administration/setup/units-of-measure/create
 * Edit:   /app/administration/setup/units-of-measure/:id/edit
 *
 * Follows CreateTaxCodePage Card-based form pattern per CLAUDE.md.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Hash, Type, Ruler, FileText,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import {
  useUnitOfMeasureDetail,
  useCreateUnitOfMeasure,
  useUpdateUnitOfMeasure,
} from '@/hooks/useUnitOfMeasures';

const SCREEN_CODE = 'UNITS_OF_MEASURE';

interface FormData {
  code: string;
  name: string;
  symbol: string;
  description: string;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  symbol: '',
  description: '',
};

export default function CreateUnitOfMeasurePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEdit = !!id;
  const listPath = getPath('administration/setup/units-of-measure');

  const { data: existingUnit, isLoading: loadingDetail } = useUnitOfMeasureDetail(id);
  const createMutation = useCreateUnitOfMeasure();
  const updateMutation = useUpdateUnitOfMeasure();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEdit && existingUnit) {
      setForm({
        code: existingUnit.code,
        name: existingUnit.name,
        symbol: existingUnit.symbol || '',
        description: existingUnit.description || '',
      });
    }
  }, [isEdit, existingUnit]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    const newErrors: Record<string, string> = {};
    if (!form.code.trim()) newErrors.code = t('common.required');
    if (!form.name.trim()) newErrors.name = t('common.required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        symbol: form.symbol || undefined,
        description: form.description || undefined,
      };

      if (isEdit && existingUnit) {
        await updateMutation.mutateAsync({
          id,
          ...payload,
          version: existingUnit.version,
        });
        showToast('success', t('inventory.uomUpdated', 'Unit of measure updated'));
      } else {
        await createMutation.mutateAsync(payload);
        showToast('success', t('inventory.uomCreated', 'Unit of measure created'));
      }

      navigate(listPath);
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
      showToast('error', apiError.message);
    }
  };

  if (permLoading || (isEdit && loadingDetail)) {
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
          <StyledIcon icon={Ruler} emoji="📏" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit ? t('inventory.editUnit', 'Edit Unit of Measure') : t('inventory.newUnit')}
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
        {/* Error banner */}
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

        {/* Fields */}
        <div className="px-5 py-5 space-y-4">
          {/* Row 1: Code + Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('common.code')}
              </Label>
              <Input
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder={isRTL ? 'مثال: KG' : 'e.g., KG'}
                disabled={isEdit}
                error={!!errors.code}
                className="h-9 font-mono"
              />
              {errors.code && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.code}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('common.name')}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={isRTL ? 'اسم الوحدة' : 'Unit name'}
                error={!!errors.name}
                className="h-9"
              />
              {errors.name && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
              )}
            </div>
          </div>

          {/* Row 2: Symbol + Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('inventory.symbol', 'Symbol')}
              </Label>
              <Input
                value={form.symbol}
                onChange={(e) => updateField('symbol', e.target.value)}
                placeholder={isRTL ? 'مثال: kg' : 'e.g., kg'}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('common.description', 'Description')}
              </Label>
              <Input
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={isRTL ? 'وصف اختياري' : 'Optional description'}
                className="h-9"
              />
            </div>
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
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
