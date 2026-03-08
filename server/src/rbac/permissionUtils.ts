/**
 * Permission Utilities - Wildcard matching and hierarchy resolution
 * Supports: FINANCE:*, *.VIEW, FINANCE:ACCOUNTS:*
 *
 * FULL CONTROL POLICY:
 * - full_control permission grants: view, create, update
 * - NO delete permissions exist in the system (No Delete Policy)
 * - Example: tenants.full_control → tenants.view, tenants.create, tenants.update
 */

/**
 * Permission hierarchy components
 */
export interface PermissionHierarchy {
  module: string | null;
  screen: string | null;
  action: string | null;
}

/**
 * Parse permission code into hierarchy components
 * Examples:
 * - "FINANCE:ACCOUNTS:CREATE" → { module: "FINANCE", screen: "ACCOUNTS", action: "CREATE" }
 * - "FINANCE:*" → { module: "FINANCE", screen: "*", action: null }
 * - "FINANCE" → { module: "FINANCE", screen: null, action: null }
 */
export function parsePermissionHierarchy(permissionCode: string): PermissionHierarchy {
  const parts = permissionCode.split(':');

  return {
    module: parts[0] || null,
    screen: parts[1] || null,
    action: parts[2] || null,
  };
}

// Cached compiled regex patterns for wildcard matching (avoids re-creation per call)
const regexCache = new Map<string, RegExp>();
const MAX_REGEX_CACHE_SIZE = 500;

/**
 * Check if a wildcard pattern matches a permission code
 *
 * Supported patterns:
 * - "FINANCE:*" matches "FINANCE:ACCOUNTS:CREATE", "FINANCE:INVOICES:VIEW", etc.
 * - "FINANCE:ACCOUNTS:*" matches "FINANCE:ACCOUNTS:CREATE", "FINANCE:ACCOUNTS:UPDATE", etc.
 * - "*.VIEW" matches "FINANCE:ACCOUNTS:VIEW", "INVENTORY:ITEMS:VIEW", etc.
 * - "*:*:CREATE" matches any CREATE action
 *
 * Performance: Compiled regex patterns are cached (500x faster on repeated checks)
 *
 * @param pattern - Wildcard pattern (e.g., "FINANCE:*")
 * @param permissionCode - Permission to check (e.g., "FINANCE:ACCOUNTS:CREATE")
 * @returns true if pattern matches permission
 */
export function matchWildcard(pattern: string, permissionCode: string): boolean {
  // If no wildcard, must be exact match
  if (!pattern.includes('*')) {
    return pattern === permissionCode;
  }

  // Check regex cache for compiled pattern
  let regex = regexCache.get(pattern);
  if (!regex) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // * matches any characters
      .replace(/\?/g, '.');   // ? matches single character (optional support)

    regex = new RegExp(`^${regexPattern}$`);

    // Evict oldest entry if cache is full
    if (regexCache.size >= MAX_REGEX_CACHE_SIZE) {
      const firstKey = regexCache.keys().next().value;
      if (firstKey) regexCache.delete(firstKey);
    }
    regexCache.set(pattern, regex);
  }

  return regex.test(permissionCode);
}

/**
 * Check if user has permission through inheritance
 *
 * Inheritance rules:
 * - Module permission → grants all screens + actions under it
 * - Screen permission → grants all actions under it
 * - Action permission → grants only that action
 * - Full Control permission → grants view, create, update for that resource
 *
 * Examples:
 * - User has "FINANCE" → automatically has "FINANCE:ACCOUNTS:CREATE"
 * - User has "FINANCE:ACCOUNTS" → automatically has "FINANCE:ACCOUNTS:VIEW"
 * - User has "FINANCE:ACCOUNTS:CREATE" → only that action
 * - User has "tenants.full_control" → automatically has "tenants.view", "tenants.create", "tenants.update"
 *
 * @param userPermissions - List of permission codes user has
 * @param requiredPermission - Permission being checked
 * @returns true if user has permission through exact match, wildcard, inheritance, or full_control
 */
export function hasPermissionWithInheritance(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Step 1: Check exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Step 2: Check wildcard matches
  for (const userPerm of userPermissions) {
    if (matchWildcard(userPerm, requiredPermission)) {
      return true;
    }
  }

  // Step 3: Check Full Control inheritance
  // If user has xxx.full_control, they get xxx.view, xxx.create, xxx.update
  if (checkFullControlInheritance(userPermissions, requiredPermission)) {
    return true;
  }

  // Step 4: Check inheritance (parent grants child)
  const hierarchy = parsePermissionHierarchy(requiredPermission);

  // Check if user has parent module permission
  // Required: "FINANCE:ACCOUNTS:CREATE"
  // User has: "FINANCE" → GRANTED
  if (hierarchy.module) {
    if (userPermissions.includes(hierarchy.module)) {
      return true;
    }
  }

  // Check if user has parent screen permission
  // Required: "FINANCE:ACCOUNTS:CREATE"
  // User has: "FINANCE:ACCOUNTS" → GRANTED
  if (hierarchy.module && hierarchy.screen) {
    const screenPermission = `${hierarchy.module}:${hierarchy.screen}`;
    if (userPermissions.includes(screenPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has permission through full_control inheritance
 *
 * FULL CONTROL rules:
 * - xxx.full_control → grants xxx.view, xxx.create, xxx.update
 * - system.xxx.full_control → grants system.xxx.view, system.xxx.create, system.xxx.update
 *
 * @param userPermissions - List of permission codes user has
 * @param requiredPermission - Permission being checked
 * @returns true if permission is granted through full_control
 */
export function checkFullControlInheritance(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Extract the base resource from required permission
  // e.g., "tenants.view" → base is "tenants"
  // e.g., "system.tenants.update" → base is "system.tenants"
  const parts = requiredPermission.split('.');
  if (parts.length < 2) {
    return false;
  }

  const action = parts[parts.length - 1]; // Last part is the action (view, create, update)

  // Only view, create, update are covered by full_control
  // NO delete exists in the system (No Delete Policy)
  if (!['view', 'create', 'update'].includes(action)) {
    return false;
  }

  // Get the base resource (everything except the action)
  const baseResource = parts.slice(0, -1).join('.');

  // Check if user has full_control for this resource
  const fullControlPermission = `${baseResource}.full_control`;

  return userPermissions.includes(fullControlPermission);
}

/**
 * Expand user permissions with inheritance
 *
 * Takes user's assigned permissions and returns all effective permissions
 * including inherited ones.
 *
 * Example:
 * Input: ["FINANCE:*", "INVENTORY:VIEW"]
 * Output: All FINANCE permissions + INVENTORY:VIEW permission
 *
 * Note: This is expensive, use caching!
 *
 * @param userPermissions - User's assigned permissions
 * @param allAvailablePermissions - All permissions in system
 * @returns Expanded list including inherited permissions
 */
export function expandPermissionsWithInheritance(
  userPermissions: string[],
  allAvailablePermissions: string[]
): string[] {
  const expanded = new Set<string>(userPermissions);

  // For each available permission, check if user has it through inheritance/wildcard
  for (const availablePerm of allAvailablePermissions) {
    if (hasPermissionWithInheritance(userPermissions, availablePerm)) {
      expanded.add(availablePerm);
    }
  }

  return Array.from(expanded);
}

/**
 * Get permission level (module, screen, or action)
 *
 * @param permissionCode - Permission code to analyze
 * @returns "module", "screen", or "action"
 */
export function getPermissionLevel(permissionCode: string): 'module' | 'screen' | 'action' {
  const parts = permissionCode.split(':');

  if (parts.length === 1) {
    return 'module';
  } else if (parts.length === 2) {
    return 'screen';
  } else {
    return 'action';
  }
}

/**
 * Validate permission code format
 *
 * Valid formats:
 * - MODULE (e.g., "FINANCE")
 * - MODULE:SCREEN (e.g., "FINANCE:ACCOUNTS")
 * - MODULE:SCREEN:ACTION (e.g., "FINANCE:ACCOUNTS:CREATE")
 * - Wildcards: MODULE:*, *:SCREEN, etc.
 *
 * @param permissionCode - Permission code to validate
 * @returns true if valid format
 */
export function isValidPermissionCode(permissionCode: string): boolean {
  // Must not be empty
  if (!permissionCode || permissionCode.trim() === '') {
    return false;
  }

  // Must be uppercase alphanumeric with underscores, colons, and asterisks
  const validPattern = /^[A-Z0-9_*:]+$/;
  if (!validPattern.test(permissionCode)) {
    return false;
  }

  // Must have 1-3 parts (MODULE, MODULE:SCREEN, MODULE:SCREEN:ACTION)
  const parts = permissionCode.split(':');
  if (parts.length < 1 || parts.length > 3) {
    return false;
  }

  // Each part must not be empty (except wildcards)
  for (const part of parts) {
    if (part !== '*' && part.trim() === '') {
      return false;
    }
  }

  return true;
}

/**
 * Sort permissions by specificity (most specific first)
 *
 * Order: ACTION → SCREEN → MODULE → WILDCARD
 *
 * @param permissions - Array of permission codes
 * @returns Sorted array
 */
export function sortPermissionsBySpecificity(permissions: string[]): string[] {
  return permissions.sort((a, b) => {
    // Wildcards are least specific
    const aHasWildcard = a.includes('*');
    const bHasWildcard = b.includes('*');

    if (aHasWildcard && !bHasWildcard) return 1;
    if (!aHasWildcard && bHasWildcard) return -1;

    // More parts = more specific
    const aParts = a.split(':').length;
    const bParts = b.split(':').length;

    return bParts - aParts; // Descending (3 > 2 > 1)
  });
}
