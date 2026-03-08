/**
 * Permission Dependencies Utility
 * Handles auto-selection of dependent permissions
 *
 * Logic: When selecting an action, automatically select 'view' permission
 * for the same module/screen (since you can't create/update without viewing)
 *
 * NO DELETE POLICY:
 * - System does not support permanent deletion
 * - Full Control = View + Create + Update (NO Delete)
 */

/**
 * Action dependency map
 * Key = action that requires dependency
 * Value = actions that must also be enabled
 *
 * NO DELETE in this system - removed from dependencies
 */
export const ACTION_DEPENDENCIES: Record<string, string[]> = {
  // Create requires View
  create: ['view'],
  // Update requires View (not used anymore - replaced by full_control)
  update: ['view'],
  // Full Control requires View + Create
  full_control: ['view', 'create'],
  // Export requires View
  export: ['view'],
  // Import requires View
  import: ['view'],
  // Approve requires View
  approve: ['view'],
  // Suspend requires View
  suspend: ['view'],
  // Activate requires View
  activate: ['view'],
  // Cancel requires View
  cancel: ['view'],
  // Refund requires View
  refund: ['view'],
  // Assign role requires View
  assign_role: ['view'],
  // Configure requires View
  configure: ['view'],
};

/**
 * Extract action type from permission/action code
 * e.g., 'system.tenants.create' → 'create'
 * e.g., 'tenants.view' → 'view'
 */
export function extractActionType(code: string): string {
  const parts = code.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Extract module/screen prefix from permission code
 * e.g., 'system.tenants.create' → 'system.tenants'
 * e.g., 'tenants.view' → 'tenants'
 */
export function extractPrefix(code: string): string {
  const parts = code.split('.');
  return parts.slice(0, -1).join('.');
}

/**
 * Get dependent permission codes for a given permission
 * @param permissionCode - The permission code being enabled
 * @returns Array of permission codes that must also be enabled
 */
export function getDependentPermissions(permissionCode: string): string[] {
  const actionType = extractActionType(permissionCode);
  const prefix = extractPrefix(permissionCode);

  const dependencies = ACTION_DEPENDENCIES[actionType] || [];

  return dependencies.map(dep => `${prefix}.${dep}`);
}

/**
 * Get all permissions that should be auto-enabled when selecting a permission
 * Includes recursive dependencies
 */
export function getAllDependencies(
  permissionCode: string,
  availableCodes: Set<string>
): string[] {
  const result: string[] = [];
  const directDeps = getDependentPermissions(permissionCode);

  for (const dep of directDeps) {
    if (availableCodes.has(dep) && !result.includes(dep)) {
      result.push(dep);
      // Recursive dependencies
      const subDeps = getAllDependencies(dep, availableCodes);
      for (const subDep of subDeps) {
        if (!result.includes(subDep)) {
          result.push(subDep);
        }
      }
    }
  }

  return result;
}

/**
 * Apply permission dependencies when toggling a permission
 * @param currentSelection - Current set of selected permission codes
 * @param toggledCode - The permission code being toggled
 * @param isEnabling - Whether the permission is being enabled or disabled
 * @param availableCodes - Set of all available permission codes
 * @returns New set of selected permission codes
 */
export function applyPermissionDependencies(
  currentSelection: Set<string>,
  toggledCode: string,
  isEnabling: boolean,
  availableCodes: Set<string>
): Set<string> {
  const newSelection = new Set(currentSelection);

  if (isEnabling) {
    // Add the permission
    newSelection.add(toggledCode);

    // Add all dependencies
    const dependencies = getAllDependencies(toggledCode, availableCodes);
    for (const dep of dependencies) {
      newSelection.add(dep);
    }
  } else {
    // When disabling 'view', also disable all actions that depend on it
    const actionType = extractActionType(toggledCode);
    const prefix = extractPrefix(toggledCode);

    if (actionType === 'view') {
      // Find all permissions in the same prefix that depend on view
      for (const code of currentSelection) {
        if (extractPrefix(code) === prefix) {
          const codeActionType = extractActionType(code);
          if (ACTION_DEPENDENCIES[codeActionType]?.includes('view')) {
            newSelection.delete(code);
          }
        }
      }
    }

    // Remove the permission
    newSelection.delete(toggledCode);
  }

  return newSelection;
}

/**
 * Check if a permission cannot be disabled because others depend on it
 * @param permissionCode - The permission code to check
 * @param currentSelection - Current set of selected permission codes
 * @returns true if permission is required by other selected permissions
 */
export function isPermissionRequired(
  permissionCode: string,
  currentSelection: Set<string>
): boolean {
  const actionType = extractActionType(permissionCode);
  const prefix = extractPrefix(permissionCode);

  // 'view' is required if any action that depends on it is selected
  if (actionType === 'view') {
    for (const code of currentSelection) {
      if (code === permissionCode) continue;
      if (extractPrefix(code) === prefix) {
        const codeActionType = extractActionType(code);
        if (ACTION_DEPENDENCIES[codeActionType]?.includes('view')) {
          return true;
        }
      }
    }
  }

  // 'create' is required if 'full_control' is selected for the same prefix
  if (actionType === 'create') {
    const fullControlCode = `${prefix}.full_control`;
    if (currentSelection.has(fullControlCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Get human-readable explanation of why a permission is auto-selected
 */
export function getDependencyExplanation(permissionCode: string, dependentOn: string): string {
  const actionType = extractActionType(permissionCode);
  const dependentActionType = extractActionType(dependentOn);

  if (dependentActionType === 'full_control') {
    return `"full_control" requires "${actionType}" permission`;
  }

  return `"${actionType}" requires "view" permission`;
}
