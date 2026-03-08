/**
 * ColumnResizeHandle Component
 * Draggable handle for resizing table columns
 */

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ColumnResizeHandleProps } from './types';

export function ColumnResizeHandle({
  onResize,
  onResizeEnd,
  className,
}: ColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      startXRef.current = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        onResize(delta);
        startXRef.current = moveEvent.clientX;
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResizeEnd?.();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [onResize, onResizeEnd]
  );

  // Touch support for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();

      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      setIsResizing(true);

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const touch = moveEvent.touches[0];
        const delta = touch.clientX - startXRef.current;
        onResize(delta);
        startXRef.current = touch.clientX;
      };

      const handleTouchEnd = () => {
        setIsResizing(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        onResizeEnd?.();
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
    },
    [onResize, onResizeEnd]
  );

  return (
    <div
      className={cn(
        // Base styles
        'absolute top-0 right-0 h-full w-2 cursor-col-resize',
        'flex items-center justify-center',
        'z-10',
        // RTL support
        'rtl:right-auto rtl:left-0',
        // Hover state
        'group',
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard support: arrow keys for accessibility
        if (e.key === 'ArrowLeft') {
          onResize(-10);
        } else if (e.key === 'ArrowRight') {
          onResize(10);
        }
      }}
    >
      {/* Visual indicator line */}
      <div
        className={cn(
          'h-4 w-0.5 rounded-full transition-all duration-150',
          // Default state
          'bg-transparent group-hover:bg-[var(--color-border-strong)]',
          // Active state
          isResizing && 'bg-[var(--color-accent)] h-full w-1'
        )}
      />
    </div>
  );
}
