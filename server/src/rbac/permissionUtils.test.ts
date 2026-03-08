import { describe, it, expect } from 'vitest';
import {
  parsePermissionHierarchy,
  matchWildcard,
  hasPermissionWithInheritance,
  checkFullControlInheritance,
  isValidPermissionCode,
  getPermissionLevel,
  sortPermissionsBySpecificity,
  expandPermissionsWithInheritance,
} from './permissionUtils';

describe('parsePermissionHierarchy', () => {
  it('parses 3-part code', () => {
    expect(parsePermissionHierarchy('FINANCE:ACCOUNTS:CREATE')).toEqual({
      module: 'FINANCE',
      screen: 'ACCOUNTS',
      action: 'CREATE',
    });
  });

  it('parses 2-part code', () => {
    expect(parsePermissionHierarchy('FINANCE:ACCOUNTS')).toEqual({
      module: 'FINANCE',
      screen: 'ACCOUNTS',
      action: null,
    });
  });

  it('parses 1-part code', () => {
    expect(parsePermissionHierarchy('FINANCE')).toEqual({
      module: 'FINANCE',
      screen: null,
      action: null,
    });
  });
});

describe('matchWildcard', () => {
  it('matches exact string when no wildcard', () => {
    expect(matchWildcard('FINANCE:ACCOUNTS:CREATE', 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
    expect(matchWildcard('FINANCE:ACCOUNTS:CREATE', 'FINANCE:ACCOUNTS:VIEW')).toBe(false);
  });

  it('matches MODULE:*', () => {
    expect(matchWildcard('FINANCE:*', 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
    expect(matchWildcard('FINANCE:*', 'FINANCE:INVOICES:VIEW')).toBe(true);
    expect(matchWildcard('FINANCE:*', 'INVENTORY:ITEMS:VIEW')).toBe(false);
  });

  it('matches MODULE:SCREEN:*', () => {
    expect(matchWildcard('FINANCE:ACCOUNTS:*', 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
    expect(matchWildcard('FINANCE:ACCOUNTS:*', 'FINANCE:ACCOUNTS:UPDATE')).toBe(true);
    expect(matchWildcard('FINANCE:ACCOUNTS:*', 'FINANCE:INVOICES:CREATE')).toBe(false);
  });

  it('matches *.ACTION', () => {
    expect(matchWildcard('*.VIEW', 'FINANCE:ACCOUNTS:VIEW')).toBe(true);
    expect(matchWildcard('*.VIEW', 'INVENTORY:ITEMS:VIEW')).toBe(true);
    expect(matchWildcard('*.VIEW', 'FINANCE:ACCOUNTS:CREATE')).toBe(false);
  });

  it('matches *:*:ACTION', () => {
    expect(matchWildcard('*:*:CREATE', 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
    expect(matchWildcard('*:*:CREATE', 'INVENTORY:ITEMS:CREATE')).toBe(true);
    expect(matchWildcard('*:*:CREATE', 'FINANCE:ACCOUNTS:VIEW')).toBe(false);
  });
});

describe('hasPermissionWithInheritance', () => {
  it('grants on exact match', () => {
    const perms = ['FINANCE:ACCOUNTS:CREATE', 'FINANCE:ACCOUNTS:VIEW'];
    expect(hasPermissionWithInheritance(perms, 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
  });

  it('denies when no match', () => {
    const perms = ['FINANCE:ACCOUNTS:VIEW'];
    expect(hasPermissionWithInheritance(perms, 'FINANCE:ACCOUNTS:CREATE')).toBe(false);
  });

  it('grants through wildcard', () => {
    const perms = ['FINANCE:*'];
    expect(hasPermissionWithInheritance(perms, 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
  });

  it('grants through module inheritance', () => {
    const perms = ['FINANCE'];
    expect(hasPermissionWithInheritance(perms, 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
  });

  it('grants through screen inheritance', () => {
    const perms = ['FINANCE:ACCOUNTS'];
    expect(hasPermissionWithInheritance(perms, 'FINANCE:ACCOUNTS:CREATE')).toBe(true);
  });

  it('does not grant cross-module', () => {
    const perms = ['FINANCE'];
    expect(hasPermissionWithInheritance(perms, 'INVENTORY:ITEMS:VIEW')).toBe(false);
  });

  it('grants through full_control', () => {
    const perms = ['tenants.full_control'];
    expect(hasPermissionWithInheritance(perms, 'tenants.view')).toBe(true);
    expect(hasPermissionWithInheritance(perms, 'tenants.create')).toBe(true);
    expect(hasPermissionWithInheritance(perms, 'tenants.update')).toBe(true);
  });
});

describe('checkFullControlInheritance', () => {
  it('grants view, create, update from full_control', () => {
    const perms = ['tenants.full_control'];
    expect(checkFullControlInheritance(perms, 'tenants.view')).toBe(true);
    expect(checkFullControlInheritance(perms, 'tenants.create')).toBe(true);
    expect(checkFullControlInheritance(perms, 'tenants.update')).toBe(true);
  });

  it('does not grant unrecognized actions', () => {
    const perms = ['tenants.full_control'];
    expect(checkFullControlInheritance(perms, 'tenants.delete')).toBe(false);
    expect(checkFullControlInheritance(perms, 'tenants.export')).toBe(false);
  });

  it('handles nested resource full_control', () => {
    const perms = ['system.tenants.full_control'];
    expect(checkFullControlInheritance(perms, 'system.tenants.view')).toBe(true);
    expect(checkFullControlInheritance(perms, 'system.tenants.update')).toBe(true);
  });

  it('returns false for single-part codes', () => {
    const perms = ['tenants.full_control'];
    expect(checkFullControlInheritance(perms, 'tenants')).toBe(false);
  });
});

describe('isValidPermissionCode', () => {
  it('accepts valid codes', () => {
    expect(isValidPermissionCode('FINANCE')).toBe(true);
    expect(isValidPermissionCode('FINANCE:ACCOUNTS')).toBe(true);
    expect(isValidPermissionCode('FINANCE:ACCOUNTS:CREATE')).toBe(true);
    expect(isValidPermissionCode('FINANCE:*')).toBe(true);
    expect(isValidPermissionCode('*:*:CREATE')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidPermissionCode('')).toBe(false);
    expect(isValidPermissionCode('  ')).toBe(false);
    expect(isValidPermissionCode('finance')).toBe(false);  // lowercase
    expect(isValidPermissionCode('A:B:C:D')).toBe(false);  // 4 parts
  });
});

describe('getPermissionLevel', () => {
  it('detects module level', () => {
    expect(getPermissionLevel('FINANCE')).toBe('module');
  });

  it('detects screen level', () => {
    expect(getPermissionLevel('FINANCE:ACCOUNTS')).toBe('screen');
  });

  it('detects action level', () => {
    expect(getPermissionLevel('FINANCE:ACCOUNTS:CREATE')).toBe('action');
  });
});

describe('sortPermissionsBySpecificity', () => {
  it('sorts most specific first', () => {
    const input = ['FINANCE:*', 'FINANCE:ACCOUNTS:CREATE', 'FINANCE:ACCOUNTS'];
    const sorted = sortPermissionsBySpecificity(input);

    expect(sorted[0]).toBe('FINANCE:ACCOUNTS:CREATE');  // action (most specific)
    expect(sorted[1]).toBe('FINANCE:ACCOUNTS');          // screen
    expect(sorted[2]).toBe('FINANCE:*');                 // wildcard (least specific)
  });

  it('puts wildcards last', () => {
    const input = ['*:*:CREATE', 'FINANCE:ACCOUNTS:CREATE'];
    const sorted = sortPermissionsBySpecificity(input);

    expect(sorted[0]).toBe('FINANCE:ACCOUNTS:CREATE');
    expect(sorted[1]).toBe('*:*:CREATE');
  });
});

describe('expandPermissionsWithInheritance', () => {
  it('expands wildcard permissions', () => {
    const userPerms = ['FINANCE:*'];
    const allPerms = [
      'FINANCE:ACCOUNTS:CREATE',
      'FINANCE:ACCOUNTS:VIEW',
      'INVENTORY:ITEMS:VIEW',
    ];

    const expanded = expandPermissionsWithInheritance(userPerms, allPerms);

    expect(expanded).toContain('FINANCE:*');
    expect(expanded).toContain('FINANCE:ACCOUNTS:CREATE');
    expect(expanded).toContain('FINANCE:ACCOUNTS:VIEW');
    expect(expanded).not.toContain('INVENTORY:ITEMS:VIEW');
  });
});
