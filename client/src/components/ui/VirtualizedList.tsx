/**
 * Virtualized List Component
 * Phase 7: Frontend High-Throughput Optimization
 * 
 * Implements react-window for efficient rendering of large lists.
 * Supports variable item sizes, infinite scrolling, and custom renderers.
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList, VariableSizeList, ListChildComponentProps } from 'react-window';

export interface VirtualizedListItem {
  id: string;
  [key: string]: unknown;
}

export interface VirtualizedListProps<T extends VirtualizedListItem> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  overscanCount?: number;
}

interface RowProps<T extends VirtualizedListItem> {
  data: {
    items: T[];
    renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  };
  index: number;
  style: React.CSSProperties;
}

const MemoizedRow = memo(function Row<T extends VirtualizedListItem>({
  data,
  index,
  style,
}: RowProps<T>) {
  const { items, renderItem } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style} className="flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{renderItem(item, index, style)}</>;
}) as <T extends VirtualizedListItem>(props: RowProps<T>) => JSX.Element;

export function VirtualizedList<T extends VirtualizedListItem>({
  items,
  height,
  itemHeight,
  renderItem,
  onLoadMore,
  loadMoreThreshold = 10,
  isLoading = false,
  emptyMessage = 'No items to display',
  className = '',
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const listRef = useRef<FixedSizeList | VariableSizeList>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (
        onLoadMore &&
        !isLoading &&
        items.length > 0 &&
        visibleStopIndex >= items.length - loadMoreThreshold
      ) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoading, items.length, loadMoreThreshold]
  );

  const itemData = { items, renderItem };

  // Wrapper to bridge React 19 built-in types with @types/react from react-window
  const RowComponent = useCallback(
    (props: ListChildComponentProps) => <MemoizedRow {...props} />,
    []
  );

  if (items.length === 0 && !isLoading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center h-[${height}px] ${className}`}
        style={{ height }}
      >
        <p className="text-[var(--sys-text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  const isVariableSize = typeof itemHeight === 'function';

  return (
    <div ref={containerRef} className={className}>
      {isVariableSize ? (
        <VariableSizeList
          ref={listRef as React.RefObject<VariableSizeList>}
          height={height}
          width={containerWidth || '100%'}
          itemCount={items.length}
          itemSize={itemHeight as (index: number) => number}
          itemData={itemData}
          onItemsRendered={handleItemsRendered}
          overscanCount={overscanCount}
        >
          {RowComponent}
        </VariableSizeList>
      ) : (
        <FixedSizeList
          ref={listRef as React.RefObject<FixedSizeList>}
          height={height}
          width={containerWidth || '100%'}
          itemCount={items.length}
          itemSize={itemHeight as number}
          itemData={itemData}
          onItemsRendered={handleItemsRendered}
          overscanCount={overscanCount}
        >
          {RowComponent}
        </FixedSizeList>
      )}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default VirtualizedList;
