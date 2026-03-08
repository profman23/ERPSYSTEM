/**
 * DraggableColumnHeader Component
 * Column header that supports drag-and-drop reordering
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { ColumnResizeHandle } from './ColumnResizeHandle';
import { DraggableColumnHeaderProps } from './types';

export function DraggableColumnHeader({
  id,
  children,
  width,
  minWidth = 80,
  maxWidth = 500,
  enableResize = true,
  enableDrag = true,
  onResize,
  className,
}: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !enableDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
    minWidth,
    maxWidth,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  const handleResize = (delta: number) => {
    if (!onResize) return;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta));
    onResize(newWidth);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center px-3 h-full',
        'bg-[var(--color-surface)]',
        'border-e border-[var(--color-border)]',
        'select-none',
        enableDrag && 'cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg z-50 bg-[var(--color-surface-hover)]',
        className
      )}
      {...(enableDrag ? { ...attributes, ...listeners } : {})}
    >
      {/* Header content */}
      <div className="flex-1 truncate">{children}</div>

      {/* Resize handle */}
      {enableResize && onResize && (
        <ColumnResizeHandle
          onResize={handleResize}
        />
      )}
    </div>
  );
}
