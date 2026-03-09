/**
 * ReverseDocumentDialog — Shared reversal confirmation dialog for all financial documents.
 *
 * Inputs: reversal date + optional remarks.
 * Used on Detail pages for all 7 document types (Journal Entry, Sales Invoice, PO, etc.)
 * Uses the existing Dialog compound component from ui/dialog.tsx.
 */

import { useState } from 'react';
import { Calendar, FileText, RotateCcw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReverseDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reversalDate: string, remarks?: string) => void;
  isReversing: boolean;
  documentLabel?: string;
}

export function ReverseDocumentDialog({
  open,
  onClose,
  onConfirm,
  isReversing,
  documentLabel,
}: ReverseDocumentDialogProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10));
  const [reversalRemarks, setReversalRemarks] = useState('');

  const defaultLabel = isRTL ? 'المستند' : 'Document';
  const label = documentLabel || defaultLabel;

  const handleConfirm = () => {
    onConfirm(reversalDate, reversalRemarks || undefined);
  };

  const handleClose = () => {
    setReversalRemarks('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" style={{ color: 'var(--color-text-danger)' }} />
            {isRTL ? `عكس ${label}` : `Reverse ${label}`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL
            ? 'سيتم إنشاء قيد عكسي جديد بقيم معكوسة وسيتم تغيير حالة المستند الأصلي إلى "معكوس".'
            : 'A new reversal entry will be created with swapped values. The original document will be marked as Reversed.'}
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <Calendar className="w-3.5 h-3.5" />
              {isRTL ? 'تاريخ العكس' : 'Reversal Date'} *
            </label>
            <Input
              type="date"
              value={reversalDate}
              onChange={(e) => setReversalDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'ملاحظات' : 'Remarks'}
            </label>
            <Input
              type="text"
              value={reversalRemarks}
              onChange={(e) => setReversalRemarks(e.target.value)}
              placeholder={isRTL ? 'سبب العكس (اختياري)' : 'Reason for reversal (optional)'}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isReversing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isReversing || !reversalDate}
            style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
          >
            {isReversing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isRTL ? 'تأكيد العكس' : 'Confirm Reverse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
