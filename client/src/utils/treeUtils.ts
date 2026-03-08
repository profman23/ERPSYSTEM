/**
 * Generic Tree Utilities
 *
 * Reusable functions for building and manipulating tree structures
 * from flat arrays. Used by Chart of Accounts and any future
 * hierarchical data (categories, organizational charts, etc.).
 *
 * All functions are O(n) — suitable for datasets up to 10,000 items.
 */

export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
}

/**
 * Build a tree from a flat array of items with parent references.
 * O(n) algorithm: single map creation pass + single linking pass.
 */
export function buildTree<T>(
  items: T[],
  getId: (item: T) => string,
  getParentId: (item: T) => string | null | undefined,
): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  // First pass: create all nodes
  for (const item of items) {
    map.set(getId(item), { data: item, children: [] });
  }

  // Second pass: link children to parents
  for (const item of items) {
    const node = map.get(getId(item))!;
    const parentId = getParentId(item);
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export interface FlatTreeItem<T> {
  data: T;
  depth: number;
  hasChildren: boolean;
  isLastChild: boolean;
}

/**
 * Flatten a tree back to a flat array in depth-first order.
 * Each item includes its depth for indentation rendering.
 */
export function flattenTree<T>(
  nodes: TreeNode<T>[],
  depth = 0,
): FlatTreeItem<T>[] {
  const result: FlatTreeItem<T>[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    result.push({
      data: node.data,
      depth,
      hasChildren: node.children.length > 0,
      isLastChild: i === nodes.length - 1,
    });
    result.push(...flattenTree(node.children, depth + 1));
  }

  return result;
}

/**
 * Find a node in the tree by predicate (depth-first search).
 */
export function findInTree<T>(
  nodes: TreeNode<T>[],
  predicate: (data: T) => boolean,
): TreeNode<T> | null {
  for (const node of nodes) {
    if (predicate(node.data)) return node;
    const found = findInTree(node.children, predicate);
    if (found) return found;
  }
  return null;
}

/**
 * Count all nodes in a tree (including nested children).
 */
export function countTreeNodes<T>(nodes: TreeNode<T>[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countTreeNodes(node.children);
  }
  return count;
}

/**
 * Filter tree nodes, keeping parents that have matching descendants.
 * Useful for search filtering while preserving tree structure.
 */
export function filterTree<T>(
  nodes: TreeNode<T>[],
  predicate: (data: T) => boolean,
): TreeNode<T>[] {
  const result: TreeNode<T>[] = [];

  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, predicate);

    if (predicate(node.data) || filteredChildren.length > 0) {
      result.push({
        data: node.data,
        children: filteredChildren,
      });
    }
  }

  return result;
}
