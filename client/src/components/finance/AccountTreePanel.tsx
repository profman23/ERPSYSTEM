/**
 * AccountTreePanel — Tree rendering area for the COA master panel
 *
 * Handles: tree filtering, flattening, expand/collapse visibility,
 * loading/error/empty states, and virtualized row rendering (react-window).
 */

import { useMemo, useCallback, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { ListTree, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { AccountTreeRow, type FlatRow } from './AccountTreeRow';
import type { ChartOfAccount, AccountTreeNode } from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TREE HELPERS (accumulator pattern — no intermediate arrays)
// ═══════════════════════════════════════════════════════════════

export function flattenTree(nodes: AccountTreeNode[], depth = 0, result: FlatRow[] = []): FlatRow[] {
  for (const node of nodes) {
    result.push({ account: node.account, depth, hasChildren: node.children.length > 0 });
    flattenTree(node.children, depth + 1, result);
  }
  return result;
}

export function filterTreeBySearch(nodes: AccountTreeNode[], query: string): AccountTreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();
  const result: AccountTreeNode[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTreeBySearch(node.children, query);
    const selfMatches =
      node.account.code.toLowerCase().includes(q) ||
      node.account.name.toLowerCase().includes(q) ||
      (node.account.nameAr && node.account.nameAr.includes(q));
    if (selfMatches || filteredChildren.length > 0) {
      result.push({
        account: node.account,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }
  }
  return result;
}

export function collectAllIds(nodes: AccountTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    ids.add(node.account.id);
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ROW_HEIGHT = 40;
const VIRTUALIZE_THRESHOLD = 50;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AccountTreePanelProps {
  tree: AccountTreeNode[] | undefined;
  isLoading: boolean;
  error: Error | null;
  expanded: Set<string>;
  debouncedSearch: string;
  postableFilter: string;
  activeDrawer: string;
  selectedAccountId: string | null;
  canModify: boolean;
  isRTL: boolean;
  isMobile?: boolean;
  onToggle: (id: string) => void;
  onSelectRow: (account: ChartOfAccount) => void;
  onAddAccount: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountTreePanel({
  tree,
  isLoading,
  error,
  expanded,
  debouncedSearch,
  postableFilter,
  activeDrawer,
  selectedAccountId,
  canModify,
  isRTL,
  isMobile,
  onToggle,
  onSelectRow,
  onAddAccount,
}: AccountTreePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = isMobile ? 48 : ROW_HEIGHT;

  // Filter tree by search + postable
  const filteredTree = useMemo(() => {
    if (!tree) return [];
    let filtered = filterTreeBySearch(tree, debouncedSearch);
    if (postableFilter) {
      const onlyPostable = postableFilter === 'true';
      const filterPostable = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
        const result: AccountTreeNode[] = [];
        for (const node of nodes) {
          const filteredChildren = filterPostable(node.children);
          if (node.account.isPostable === onlyPostable || filteredChildren.length > 0) {
            result.push({ account: node.account, children: filteredChildren.length > 0 ? filteredChildren : node.children });
          }
        }
        return result;
      };
      filtered = filterPostable(filtered);
    }
    return filtered;
  }, [tree, debouncedSearch, postableFilter]);

  // Flatten for rendering (respect expand state)
  const visibleRows = useMemo(() => {
    const allFlat = flattenTree(filteredTree);
    if (debouncedSearch.trim() || activeDrawer) return allFlat;

    const result: FlatRow[] = [];
    const collapsedPaths = new Set<string>();
    for (const row of allFlat) {
      let isHidden = false;
      for (const path of collapsedPaths) {
        if (row.account.path.startsWith(path + '.')) { isHidden = true; break; }
      }
      if (isHidden) continue;
      result.push(row);
      if (row.hasChildren && !expanded.has(row.account.id)) collapsedPaths.add(row.account.path);
    }
    return result;
  }, [filteredTree, expanded, debouncedSearch, activeDrawer]);

  // Virtualized row renderer
  const renderRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const row = visibleRows[index];
    return (
      <div style={style}>
        <AccountTreeRow
          row={row}
          isExpanded={debouncedSearch.trim() !== '' || activeDrawer !== '' || expanded.has(row.account.id)}
          isSelected={selectedAccountId === row.account.id}
          onToggle={() => onToggle(row.account.id)}
          onSelect={() => onSelectRow(row.account)}
          isRTL={isRTL}
          compact={isMobile}
        />
      </div>
    );
  }, [visibleRows, debouncedSearch, activeDrawer, expanded, selectedAccountId, onToggle, onSelectRow, isRTL, isMobile]);

  const useVirtualized = visibleRows.length > VIRTUALIZE_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn(
        'min-w-0 flex flex-col',
        isMobile ? 'flex-1' : 'flex-[5] border-e',
      )}
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3"><TableSkeleton rows={10} columns={3} showHeader={false} /></div>
        ) : error ? (
          <div className="p-3">
            <ErrorState
              title={isRTL ? 'فشل التحميل' : 'Failed to load'}
              message={(error as Error)?.message || ''}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ListTree}
              title={debouncedSearch
                ? (isRTL ? 'لا توجد نتائج' : 'No matching accounts')
                : (isRTL ? 'لا توجد حسابات' : 'No accounts yet')}
              description={debouncedSearch
                ? (isRTL ? 'جرب تعديل البحث' : 'Try adjusting your search')
                : (isRTL ? 'أنشئ أول حساب' : 'Create your first account')}
              action={!debouncedSearch && canModify ? {
                label: isRTL ? 'إضافة حساب' : 'Add Account',
                onClick: onAddAccount,
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : useVirtualized ? (
          <FixedSizeList
            height={containerRef.current?.clientHeight ?? 600}
            width="100%"
            itemCount={visibleRows.length}
            itemSize={rowHeight}
            overscanCount={10}
          >
            {renderRow}
          </FixedSizeList>
        ) : (
          visibleRows.map((row) => (
            <AccountTreeRow
              key={row.account.id}
              row={row}
              isExpanded={debouncedSearch.trim() !== '' || activeDrawer !== '' || expanded.has(row.account.id)}
              isSelected={selectedAccountId === row.account.id}
              onToggle={() => onToggle(row.account.id)}
              onSelect={() => onSelectRow(row.account)}
              isRTL={isRTL}
              compact={isMobile}
            />
          ))
        )}
      </div>
    </div>
  );
}

export { type FlatRow } from './AccountTreeRow';
