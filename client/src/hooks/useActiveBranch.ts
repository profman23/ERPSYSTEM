/**
 * useActiveBranch — Session-scoped active branch management
 *
 * Stores the user's selected active branch in sessionStorage.
 * Survives page refresh but clears on tab/browser close.
 * Cleared on logout via AuthContext.
 *
 * Keys:
 * - vet_erp_active_branch: JSON { branchId, branchName }
 * - vet_erp_branch_selected: "true" flag to prevent re-prompt on refresh
 */

const ACTIVE_BRANCH_KEY = 'vet_erp_active_branch';
const BRANCH_SELECTED_KEY = 'vet_erp_branch_selected';

interface ActiveBranch {
  branchId: string;
  branchName: string;
}

interface User {
  branchId: string | null;
  allowedBranchIds: string[];
}

/** Get the currently active branch from sessionStorage */
export function getActiveBranch(): ActiveBranch | null {
  try {
    const stored = sessionStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ActiveBranch;
  } catch {
    return null;
  }
}

/** Set the active branch in sessionStorage */
export function setActiveBranch(branchId: string, branchName: string): void {
  sessionStorage.setItem(ACTIVE_BRANCH_KEY, JSON.stringify({ branchId, branchName }));
  sessionStorage.setItem(BRANCH_SELECTED_KEY, 'true');
}

/** Check if a branch has been selected this session */
export function isBranchSelected(): boolean {
  return sessionStorage.getItem(BRANCH_SELECTED_KEY) === 'true';
}

/**
 * Check if the user needs to select a branch.
 * Returns true if:
 * 1. User has 2+ branches (default + allowed)
 * 2. No branch has been selected this session
 */
export function needsBranchSelection(user: User): boolean {
  const totalBranches = getTotalBranchCount(user);
  return totalBranches >= 2 && !isBranchSelected();
}

/** Get total branch count (default + allowed) */
export function getTotalBranchCount(user: User): number {
  const defaultBranch = user.branchId ? 1 : 0;
  const extraBranches = user.allowedBranchIds?.length || 0;
  return defaultBranch + extraBranches;
}

/** Get all branch IDs for this user (default + allowed, deduplicated) */
export function getAllUserBranchIds(user: User): string[] {
  const ids = new Set<string>();
  if (user.branchId) ids.add(user.branchId);
  if (user.allowedBranchIds) {
    user.allowedBranchIds.forEach(id => ids.add(id));
  }
  return Array.from(ids);
}

/** Clear active branch data from sessionStorage */
export function clearActiveBranch(): void {
  sessionStorage.removeItem(ACTIVE_BRANCH_KEY);
  sessionStorage.removeItem(BRANCH_SELECTED_KEY);
}
