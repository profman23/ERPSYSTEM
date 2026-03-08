/**
 * Create/Edit Item Page — Item Master Data
 *
 * Create: /app/inventory/items/create
 * Edit:   /app/inventory/items/:id/edit
 *
 * Layout: Single top card (2-col: fields | image+checkboxes),
 * then UoM & Conversion, then Inventory & Pricing.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Hash, Type, PackageSearch, FileText, Ruler,
  DollarSign, Warehouse, Barcode, Layers, Package,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import {
  useItemDetail,
  useCreateItem,
  useUpdateItem,
  useUploadItemImage,
  useRemoveItemImage,
} from '@/hooks/useItems';
import { useItemGroupsList } from '@/hooks/useItemGroups';
import { useUnitOfMeasuresList } from '@/hooks/useUnitOfMeasures';
import { useWarehousesList } from '@/hooks/useWarehouses';

const SCREEN_CODE = 'ITEM_MASTER';

type ItemType = 'ITEM' | 'SERVICE';

interface FormData {
  name: string;
  itemType: ItemType | '';
  itemGroupId: string;
  isInventoryItem: boolean;
  isSalesItem: boolean;
  isPurchaseItem: boolean;
  isCounterSell: boolean;
  inventoryUomId: string;
  purchaseUomId: string;
  purchaseUomFactor: string;
  salesUomId: string;
  salesUomFactor: string;
  standardCost: string;
  lastPurchasePrice: string;
  defaultSellingPrice: string;
  barcode: string;
  minimumStock: string;
  maximumStock: string;
  defaultWarehouseId: string;
  preferredVendor: string;
}

const initialFormData: FormData = {
  name: '',
  itemType: '',
  itemGroupId: '',
  isInventoryItem: true,
  isSalesItem: true,
  isPurchaseItem: true,
  isCounterSell: false,
  inventoryUomId: '',
  purchaseUomId: '',
  purchaseUomFactor: '1',
  salesUomId: '',
  salesUomFactor: '1',
  standardCost: '',
  lastPurchasePrice: '',
  defaultSellingPrice: '',
  barcode: '',
  minimumStock: '',
  maximumStock: '',
  defaultWarehouseId: '',
  preferredVendor: '',
};

export default function CreateItemPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEdit = !!id;
  const listPath = getPath('inventory/items');

  // Queries
  const { data: existingItem, isLoading: loadingDetail } = useItemDetail(id);
  const { data: groupsData } = useItemGroupsList({ isActive: 'true', limit: 100 });
  const { data: uomData } = useUnitOfMeasuresList({ isActive: 'true', limit: 100 });
  const { data: warehouseData } = useWarehousesList({ isActive: 'true', limit: 100 });

  // Mutations
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const uploadImageMutation = useUploadItemImage();
  const removeImageMutation = useRemoveItemImage();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  // Pre-fill in edit mode
  useEffect(() => {
    if (isEdit && existingItem) {
      const data: FormData = {
        name: existingItem.name,
        itemType: existingItem.itemType,
        itemGroupId: existingItem.itemGroupId || '',
        isInventoryItem: existingItem.isInventoryItem,
        isSalesItem: existingItem.isSalesItem,
        isPurchaseItem: existingItem.isPurchaseItem,
        isCounterSell: existingItem.isCounterSell,
        inventoryUomId: existingItem.inventoryUomId || '',
        purchaseUomId: existingItem.purchaseUomId || '',
        purchaseUomFactor: existingItem.purchaseUomFactor || '1',
        salesUomId: existingItem.salesUomId || '',
        salesUomFactor: existingItem.salesUomFactor || '1',
        standardCost: existingItem.standardCost || '',
        lastPurchasePrice: existingItem.lastPurchasePrice || '',
        defaultSellingPrice: existingItem.defaultSellingPrice || '',
        barcode: existingItem.barcode || '',
        minimumStock: existingItem.minimumStock || '',
        maximumStock: existingItem.maximumStock || '',
        defaultWarehouseId: existingItem.defaultWarehouseId || '',
        preferredVendor: existingItem.preferredVendor || '',
      };
      // Two-step update for Radix Select value transition
      setForm({ ...data, itemType: '' });
      requestAnimationFrame(() => setForm(data));
    }
  }, [isEdit, existingItem]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isItemType = form.itemType === 'ITEM';

  // Dropdown options
  const typeOptions = useMemo(() => [
    { value: 'ITEM', label: isRTL ? 'صنف' : 'Item' },
    { value: 'SERVICE', label: isRTL ? 'خدمة' : 'Service' },
  ], [isRTL]);

  const groupOptions = useMemo(() => {
    const opts = [{ value: '', label: isRTL ? 'بدون مجموعة' : 'No group' }];
    if (groupsData?.data) {
      for (const g of groupsData.data) {
        opts.push({ value: g.id, label: `${g.code} - ${isRTL && g.nameAr ? g.nameAr : g.name}` });
      }
    }
    return opts;
  }, [groupsData, isRTL]);

  const uomOptions = useMemo(() => {
    const opts = [{ value: '', label: isRTL ? 'بدون وحدة' : 'No unit' }];
    if (uomData?.data) {
      for (const u of uomData.data) {
        opts.push({ value: u.id, label: `${u.code} - ${isRTL && u.nameAr ? u.nameAr : u.name}` });
      }
    }
    return opts;
  }, [uomData, isRTL]);

  const warehouseOptions = useMemo(() => {
    const opts = [{ value: '', label: isRTL ? 'بدون مستودع' : 'No warehouse' }];
    if (warehouseData?.data) {
      for (const w of warehouseData.data) {
        opts.push({ value: w.id, label: `${w.code} - ${w.name}` });
      }
    }
    return opts;
  }, [warehouseData, isRTL]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [errors]);

  // Image handlers
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!id) throw new Error('Save item first');
    const result = await uploadImageMutation.mutateAsync({ id, file });
    return result.imageUrl || '';
  }, [id, uploadImageMutation]);

  const handleImageRemove = useCallback(async () => {
    if (!id) return;
    await removeImageMutation.mutateAsync(id);
  }, [id, removeImageMutation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = isRTL ? 'اسم الصنف مطلوب' : 'Item name is required';
    if (!form.itemType) newErrors.itemType = isRTL ? 'نوع الصنف مطلوب' : 'Item type is required';
    if (form.itemType === 'ITEM' && !form.inventoryUomId) {
      newErrors.inventoryUomId = isRTL ? 'وحدة المخزون مطلوبة للأصناف' : 'Inventory UoM required for items';
    }
    if (form.minimumStock && form.maximumStock) {
      const min = parseFloat(form.minimumStock);
      const max = parseFloat(form.maximumStock);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        newErrors.minimumStock = isRTL ? 'الحد الأدنى يجب أن يكون أقل من الأقصى' : 'Minimum must be less than maximum';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        name: form.name,
        itemType: form.itemType as ItemType,
        itemGroupId: form.itemGroupId || null,
        isInventoryItem: form.isInventoryItem,
        isSalesItem: form.isSalesItem,
        isPurchaseItem: form.isPurchaseItem,
        isCounterSell: form.isCounterSell,
        inventoryUomId: form.inventoryUomId || null,
        purchaseUomId: form.purchaseUomId || null,
        purchaseUomFactor: form.purchaseUomId ? parseFloat(form.purchaseUomFactor) || 1 : 1,
        salesUomId: form.salesUomId || null,
        salesUomFactor: form.salesUomId ? parseFloat(form.salesUomFactor) || 1 : 1,
        standardCost: form.standardCost ? parseFloat(form.standardCost) : null,
        lastPurchasePrice: form.lastPurchasePrice ? parseFloat(form.lastPurchasePrice) : null,
        defaultSellingPrice: form.defaultSellingPrice ? parseFloat(form.defaultSellingPrice) : null,
        barcode: form.barcode || null,
        minimumStock: form.minimumStock ? parseFloat(form.minimumStock) : null,
        maximumStock: form.maximumStock ? parseFloat(form.maximumStock) : null,
        defaultWarehouseId: form.defaultWarehouseId || null,
        preferredVendor: form.preferredVendor || null,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({
          id,
          ...payload,
          version: existingItem!.version,
        });
        showToast('success', isRTL ? 'تم تحديث الصنف' : 'Item updated');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('success', isRTL ? 'تم إنشاء الصنف' : 'Item created');
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
          <StyledIcon icon={PackageSearch} emoji="📋" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit
              ? (isRTL ? 'تعديل صنف' : 'Edit Item')
              : (isRTL ? 'صنف جديد' : 'New Item')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {submitError && (
        <div
          className="px-5 py-3 text-sm rounded-lg border"
          style={{
            backgroundColor: 'var(--badge-danger-bg)',
            borderColor: 'var(--badge-danger-border)',
            color: 'var(--color-text-danger)',
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Card 1: General Information — 2-column layout */}
          <div
            className="rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <StyledIcon icon={FileText} emoji="📋" className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {isRTL ? 'المعلومات العامة' : 'General Information'}
              </span>
            </div>
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Form fields */}
                <div className="space-y-4">
                  {/* Code (read-only on edit) */}
                  {isEdit && existingItem && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {t('common.code', 'Code')}
                      </Label>
                      <Input
                        value={existingItem.code}
                        disabled
                        className="h-9 font-mono"
                      />
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {t('common.name', 'Name')} *
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder={isRTL ? 'اسم الصنف' : 'Item name'}
                      error={!!errors.name}
                      className="h-9"
                    />
                    {errors.name && (
                      <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
                    )}
                  </div>

                  {/* Item Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Package} emoji="📦" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'نوع الصنف' : 'Item Type'} *
                    </Label>
                    <SimpleSelect
                      options={typeOptions}
                      value={form.itemType}
                      onValueChange={(v: string) => updateField('itemType', v as ItemType)}
                      placeholder={isRTL ? 'اختر النوع' : 'Select type'}
                      error={!!errors.itemType}
                    />
                    {errors.itemType && (
                      <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.itemType}</p>
                    )}
                  </div>

                  {/* Item Group */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Layers} emoji="📚" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'مجموعة الأصناف' : 'Item Group'}
                    </Label>
                    <SimpleSelect
                      options={groupOptions}
                      value={form.itemGroupId}
                      onValueChange={(v: string) => updateField('itemGroupId', v)}
                      placeholder={isRTL ? 'اختر المجموعة' : 'Select group'}
                    />
                  </div>

                  {/* Barcode */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Barcode} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'الباركود' : 'Barcode'}
                    </Label>
                    <Input
                      value={form.barcode}
                      onChange={(e) => updateField('barcode', e.target.value)}
                      placeholder={isRTL ? 'رقم الباركود' : 'Barcode number'}
                      className="h-9 font-mono"
                      error={!!errors.barcode}
                    />
                    {errors.barcode && (
                      <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.barcode}</p>
                    )}
                  </div>
                </div>

                {/* RIGHT: Image on top, Checkboxes below — centered & aligned */}
                <div className="flex flex-col items-center space-y-5">
                  {/* Item Image */}
                  <div>
                    {isEdit ? (
                      <ImageUpload
                        value={existingItem?.imageUrl || null}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                        label={isRTL ? 'صورة الصنف' : 'Item Image'}
                      />
                    ) : (
                      <div>
                        <label className="text-xs flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--color-text)' }}>
                          <StyledIcon icon={PackageSearch} emoji="🖼️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                          {isRTL ? 'صورة الصنف' : 'Item Image'}
                        </label>
                        <div
                          className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 px-4"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: 'var(--color-surface-hover)',
                            width: 200,
                            minHeight: 140,
                          }}
                        >
                          <StyledIcon icon={PackageSearch} emoji="🖼️" className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
                          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                            {isRTL ? 'احفظ الصنف أولاً لرفع صورة' : 'Save item first to upload image'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checkboxes — same width as image, stacked vertically */}
                  <div style={{ width: 200 }}>
                    <label className="text-xs flex items-center gap-1.5 mb-3" style={{ color: 'var(--color-text)' }}>
                      <StyledIcon icon={FileText} emoji="📋" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'الخصائص' : 'Properties'}
                    </label>
                    <div className="space-y-2.5">
                      <CheckboxField
                        label={isRTL ? 'صنف مخزون' : 'Inventory Item'}
                        checked={form.isInventoryItem}
                        onChange={(v) => updateField('isInventoryItem', v)}
                        disabled={form.itemType === 'SERVICE'}
                      />
                      <CheckboxField
                        label={isRTL ? 'صنف مبيعات' : 'Sales Item'}
                        checked={form.isSalesItem}
                        onChange={(v) => updateField('isSalesItem', v)}
                      />
                      <CheckboxField
                        label={isRTL ? 'صنف مشتريات' : 'Purchase Item'}
                        checked={form.isPurchaseItem}
                        onChange={(v) => updateField('isPurchaseItem', v)}
                      />
                      <CheckboxField
                        label={isRTL ? 'بيع كاونتر' : 'Counter Sell'}
                        checked={form.isCounterSell}
                        onChange={(v) => updateField('isCounterSell', v)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Units of Measure & Conversion (hidden for SERVICE) */}
          {isItemType && (
            <div
              className="rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                <StyledIcon icon={Ruler} emoji="📏" className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {isRTL ? 'وحدات القياس والتحويل' : 'Units of Measure & Conversion'}
                </span>
              </div>
              <div className="px-5 py-5 space-y-4">
                {/* Inventory UoM */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={Ruler} emoji="📏" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {isRTL ? 'وحدة المخزون' : 'Inventory UoM'} *
                  </Label>
                  <SimpleSelect
                    options={uomOptions}
                    value={form.inventoryUomId}
                    onValueChange={(v: string) => updateField('inventoryUomId', v)}
                    placeholder={isRTL ? 'اختر الوحدة' : 'Select unit'}
                    error={!!errors.inventoryUomId}
                  />
                  {errors.inventoryUomId && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.inventoryUomId}</p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {isRTL ? 'أصغر وحدة قابلة للبيع (معيار IAS 2)' : 'Smallest sellable unit (IAS 2 standard)'}
                  </p>
                </div>

                {/* Purchase UoM + Factor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Ruler} emoji="📏" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'وحدة الشراء' : 'Purchase UoM'}
                    </Label>
                    <SimpleSelect
                      options={uomOptions}
                      value={form.purchaseUomId}
                      onValueChange={(v: string) => updateField('purchaseUomId', v)}
                      placeholder={isRTL ? 'اختر الوحدة' : 'Select unit'}
                    />
                  </div>
                  {form.purchaseUomId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {isRTL ? 'معامل التحويل' : 'Conversion Factor'}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.000001"
                        value={form.purchaseUomFactor}
                        onChange={(e) => updateField('purchaseUomFactor', e.target.value)}
                        placeholder="1"
                        className="h-9 font-mono"
                      />
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {isRTL ? '1 وحدة شراء = X وحدة مخزون' : '1 Purchase UoM = X Inventory UoMs'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sales UoM + Factor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Ruler} emoji="📏" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'وحدة المبيعات' : 'Sales UoM'}
                    </Label>
                    <SimpleSelect
                      options={uomOptions}
                      value={form.salesUomId}
                      onValueChange={(v: string) => updateField('salesUomId', v)}
                      placeholder={isRTL ? 'اختر الوحدة' : 'Select unit'}
                    />
                  </div>
                  {form.salesUomId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {isRTL ? 'معامل التحويل' : 'Conversion Factor'}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.000001"
                        value={form.salesUomFactor}
                        onChange={(e) => updateField('salesUomFactor', e.target.value)}
                        placeholder="1"
                        className="h-9 font-mono"
                      />
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {isRTL ? '1 وحدة مبيعات = X وحدة مخزون' : '1 Sales UoM = X Inventory UoMs'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Inventory & Pricing */}
          <div
            className="rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <StyledIcon icon={DollarSign} emoji="💰" className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {isRTL ? 'المخزون والتسعير' : 'Inventory & Pricing'}
              </span>
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Warehouse + Stock (hidden for SERVICE) */}
              {isItemType && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Warehouse} emoji="🏭" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {isRTL ? 'المستودع الافتراضي' : 'Default Warehouse'}
                    </Label>
                    <SimpleSelect
                      options={warehouseOptions}
                      value={form.defaultWarehouseId}
                      onValueChange={(v: string) => updateField('defaultWarehouseId', v)}
                      placeholder={isRTL ? 'اختر المستودع' : 'Select warehouse'}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {isRTL ? 'الحد الأدنى' : 'Minimum Stock'}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={form.minimumStock}
                        onChange={(e) => updateField('minimumStock', e.target.value)}
                        placeholder="0"
                        className="h-9 font-mono"
                        error={!!errors.minimumStock}
                      />
                      {errors.minimumStock && (
                        <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.minimumStock}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {isRTL ? 'الحد الأقصى' : 'Maximum Stock'}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={form.maximumStock}
                        onChange={(e) => updateField('maximumStock', e.target.value)}
                        placeholder="0"
                        className="h-9 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={DollarSign} emoji="💰" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {isRTL ? 'التكلفة المعيارية' : 'Standard Cost'}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={form.standardCost}
                    onChange={(e) => updateField('standardCost', e.target.value)}
                    placeholder="0.00"
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={DollarSign} emoji="💰" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {isRTL ? 'آخر سعر شراء' : 'Last Purchase Price'}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={form.lastPurchasePrice}
                    onChange={(e) => updateField('lastPurchasePrice', e.target.value)}
                    placeholder="0.00"
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={DollarSign} emoji="💰" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {isRTL ? 'سعر البيع' : 'Selling Price'}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={form.defaultSellingPrice}
                    onChange={(e) => updateField('defaultSellingPrice', e.target.value)}
                    placeholder="0.00"
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              {/* Preferred Vendor */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Type} emoji="🏪" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'المورد المفضل' : 'Preferred Vendor'}
                </Label>
                <Input
                  value={form.preferredVendor}
                  onChange={(e) => updateField('preferredVendor', e.target.value)}
                  placeholder={isRTL ? 'اسم المورد (اختياري)' : 'Vendor name (optional)'}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="rounded-lg border px-5 py-3 flex items-center justify-end gap-3"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(listPath)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isEdit ? t('common.save', 'Save') : t('common.create', 'Create')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Simple themed checkbox for the flags grid */
function CheckboxField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 text-sm cursor-pointer select-none"
      style={{ color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border"
        style={{ accentColor: 'var(--color-accent)' }}
      />
      {label}
    </label>
  );
}
