/**
 * ImageUpload — Reusable drag-and-drop image upload component
 *
 * Features: drag-and-drop zone, click to browse, preview with remove button,
 * file size validation, loading state during upload.
 *
 * Usage:
 *   <ImageUpload
 *     value={imageUrl}
 *     onUpload={async (file) => { ... return url; }}
 *     onRemove={async () => { ... }}
 *   />
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';

export interface ImageUploadProps {
  /** Current image URL (relative or absolute) */
  value: string | null | undefined;
  /** Called with the selected File — should upload and return the URL */
  onUpload: (file: File) => Promise<string>;
  /** Called to remove the current image */
  onRemove: () => Promise<void>;
  /** Maximum file size in MB (default 5) */
  maxSizeMB?: number;
  /** Accepted MIME types (default: image/jpeg,image/png,image/webp) */
  accept?: string;
  /** Disable interactions */
  disabled?: boolean;
  /** Label shown above the dropzone */
  label?: string;
}

export function ImageUpload({
  value,
  onUpload,
  onRemove,
  maxSizeMB = 5,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  label,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${allowedTypes.map((t) => t.replace('image/', '')).join(', ')}`;
    }
    if (file.size > maxBytes) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }
    return null;
  }, [accept, maxBytes, maxSizeMB]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onUpload]);

  const handleRemove = useCallback(async () => {
    setError(null);
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      setError('Remove failed. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, isUploading, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) setIsDragOver(true);
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so re-selecting same file works
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const busy = isUploading || isRemoving;

  // Build the full image URL for preview
  const imageUrl = value
    ? (value.startsWith('http') ? value : `${window.location.origin}${value}`)
    : null;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
          <ImageIcon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
          {label}
        </label>
      )}

      {imageUrl ? (
        /* Preview mode */
        <div className="relative group w-full">
          <div
            className="w-full aspect-square rounded-lg border overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              borderColor: 'var(--color-border)',
              maxWidth: 200,
              maxHeight: 200,
            }}
          >
            <img
              src={imageUrl}
              alt="Item"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Remove button overlay */}
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-danger)',
                color: '#fff',
              }}
              title="Remove image"
            >
              {isRemoving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      ) : (
        /* Dropzone mode */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 px-4 transition-colors cursor-pointer"
          style={{
            borderColor: isDragOver ? 'var(--color-accent)' : 'var(--color-border)',
            backgroundColor: isDragOver ? 'var(--color-accent-light)' : 'var(--color-surface-hover)',
            opacity: disabled ? 0.5 : 1,
            maxWidth: 200,
            minHeight: 140,
          }}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
          ) : (
            <StyledIcon icon={Upload} emoji="" className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
          )}
          <div className="text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isUploading ? 'Uploading...' : 'Drop image here'}
            </p>
            {!isUploading && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                or click to browse
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || busy}
      />

      {/* Error message */}
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{error}</p>
      )}
    </div>
  );
}
