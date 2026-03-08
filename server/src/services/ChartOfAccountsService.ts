/**
 * Chart of Accounts Service
 *
 * Business logic for the tree-structured Chart of Accounts.
 * Extends BaseService for automatic tenant isolation.
 *
 * Key features:
 *   - Tree operations (getTree, move, cycle detection)
 *   - Materialized path maintenance
 *   - Account type inheritance from parent
 *   - Normal balance auto-derivation
 */

import { eq, and, like, asc, sql } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { db } from '../db';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '../core/errors';
import { chartOfAccounts } from '../db/schemas/chartOfAccounts';
import type { ChartOfAccount } from '../db/schemas/chartOfAccounts';
import type {
  CreateChartOfAccountInput,
  UpdateChartOfAccountInput,
  ListChartOfAccountsParams,
  AccountType,
  NormalBalance,
} from '../validations/chartOfAccountsValidation';

// ─── Tree Node Type ─────────────────────────────────────────────────────

interface AccountTreeNode {
  account: ChartOfAccount;
  children: AccountTreeNode[];
}

export class ChartOfAccountsService extends BaseService {
  private static readonly TABLE = chartOfAccounts;
  private static readonly ENTITY_NAME = 'Account';

  // ─── LIST (flat, paginated) ──────────────────────────────────────────

  static async list(tenantId: string, params: ListChartOfAccountsParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(chartOfAccounts.isActive, params.isActive === 'true'));
    }
    if (params.accountType) {
      filters.push(eq(chartOfAccounts.accountType, params.accountType));
    }
    if (params.isPostable !== undefined) {
      filters.push(eq(chartOfAccounts.isPostable, params.isPostable === 'true'));
    }
    if (params.parentId) {
      filters.push(eq(chartOfAccounts.parentId, params.parentId));
    }

    const { items, total } = await this.findMany<ChartOfAccount>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [chartOfAccounts.name, chartOfAccounts.nameAr, chartOfAccounts.code],
      sortBy: chartOfAccounts.path,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  // ─── GET TREE ────────────────────────────────────────────────────────

  static async getTree(tenantId: string, params?: { accountType?: string; isActive?: string }) {
    const conditions = [
      eq(chartOfAccounts.tenantId, tenantId),
    ];

    if (params?.isActive !== undefined) {
      conditions.push(eq(chartOfAccounts.isActive, params.isActive === 'true'));
    } else {
      conditions.push(eq(chartOfAccounts.isActive, true));
    }

    if (params?.accountType) {
      conditions.push(eq(chartOfAccounts.accountType, params.accountType));
    }

    const accounts = await this.db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(asc(chartOfAccounts.path));

    const tree = this.buildTree(accounts as ChartOfAccount[]);
    return { tree, flatCount: accounts.length };
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────

  static async getById(tenantId: string, id: string) {
    return this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  // ─── GET ANCESTORS ───────────────────────────────────────────────────

  static async getAncestors(tenantId: string, id: string): Promise<ChartOfAccount[]> {
    const account = await this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);
    const pathSegments = account.path.split('.');

    if (pathSegments.length <= 1) return [];

    // Build all ancestor paths: ["1000", "1000.1100", ...]
    const ancestorCodes = pathSegments.slice(0, -1);

    const ancestors = await this.db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.isActive, true),
          sql`${chartOfAccounts.code} = ANY(${ancestorCodes})`,
        ),
      )
      .orderBy(asc(chartOfAccounts.level));

    return ancestors as ChartOfAccount[];
  }

  // ─── GET POSTABLE ACCOUNTS ───────────────────────────────────────────

  static async getPostableAccounts(tenantId: string, accountType?: string): Promise<ChartOfAccount[]> {
    const conditions = [
      eq(chartOfAccounts.tenantId, tenantId),
      eq(chartOfAccounts.isPostable, true),
      eq(chartOfAccounts.isActive, true),
    ];

    if (accountType) {
      conditions.push(eq(chartOfAccounts.accountType, accountType));
    }

    const accounts = await this.db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(asc(chartOfAccounts.path));

    return accounts as ChartOfAccount[];
  }

  // ─── CREATE ──────────────────────────────────────────────────────────

  static async create(tenantId: string, input: CreateChartOfAccountInput) {
    // 1. Check code uniqueness
    const codeExists = await this.exists(
      tenantId,
      this.TABLE,
      eq(chartOfAccounts.code, input.code),
    );
    if (codeExists) {
      throw new ConflictError(`Account with code '${input.code}' already exists`);
    }

    // 2. Resolve parent and compute tree fields
    let level = 0;
    let path = input.code;
    let parentId: string | null = null;

    if (input.parentId) {
      const parent = await this.findById<ChartOfAccount>(
        tenantId, this.TABLE, input.parentId, 'Parent account',
      );

      // Parent must not be postable (cannot add children to leaf account)
      if (parent.isPostable) {
        throw new ValidationError('Cannot add child to a postable account. Change parent to non-postable first.');
      }

      // Children must inherit parent's accountType
      if (parent.accountType !== input.accountType) {
        throw new ValidationError(
          `Child account must have the same type as parent. Parent type: ${parent.accountType}`,
        );
      }

      parentId = parent.id;
      level = parent.level + 1;
      path = `${parent.path}.${input.code}`;
    }

    // 3. Auto-derive normalBalance if not provided
    const normalBalance = input.normalBalance || this.deriveNormalBalance(input.accountType);

    // 4. Insert
    const data = {
      ...input,
      parentId,
      level,
      path,
      normalBalance,
    };

    try {
      return await this.insertOne<ChartOfAccount>(tenantId, this.TABLE, data);
    } catch (err: unknown) {
      // Catch PostgreSQL unique violation (concurrent insert with same code)
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        throw new ConflictError(`Account with code '${input.code}' already exists`);
      }
      throw err;
    }
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────

  static async update(tenantId: string, id: string, input: UpdateChartOfAccountInput) {
    const existing = await this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // If updating code, check uniqueness and cascade path changes
    if (input.code && input.code !== existing.code) {
      const codeExists = await this.exists(
        tenantId,
        this.TABLE,
        eq(chartOfAccounts.code, input.code),
      );
      if (codeExists) {
        throw new ConflictError(`Account with code '${input.code}' already exists`);
      }

      // Cascade path update to all descendants
      await this.cascadePathUpdate(tenantId, existing, input.code);
    }

    // If updating isPostable to true, verify no children exist
    if (input.isPostable === true && !existing.isPostable) {
      const hasChildren = await this.hasActiveChildren(tenantId, id);
      if (hasChildren) {
        throw new ValidationError('Cannot make account postable while it has children.');
      }
    }

    // Optimistic locking: if version is provided, check it matches
    const { version, ...updateData } = input as UpdateChartOfAccountInput & { version?: number };
    if (version !== undefined) {
      const results = await db
        .update(chartOfAccounts)
        .set({ ...updateData, version: existing.version + 1, updatedAt: new Date() })
        .where(
          and(
            eq(chartOfAccounts.tenantId, tenantId),
            eq(chartOfAccounts.id, id),
            eq(chartOfAccounts.version, version),
          ),
        )
        .returning();

      if (results.length === 0) {
        throw new ConflictError('Record was modified by another user. Please refresh and try again.');
      }
      return results[0] as ChartOfAccount;
    }

    return this.updateById<ChartOfAccount>(tenantId, this.TABLE, id, updateData, this.ENTITY_NAME);
  }

  // ─── MOVE (re-parent) ───────────────────────────────────────────────

  static async move(tenantId: string, id: string, newParentId: string | null) {
    const account = await this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Calculate new tree fields
    let newLevel = 0;
    let newPath = account.code;

    if (newParentId) {
      // Cannot move to self
      if (newParentId === id) {
        throw new ValidationError('Cannot move account under itself.');
      }

      const newParent = await this.findById<ChartOfAccount>(
        tenantId, this.TABLE, newParentId, 'New parent account',
      );

      // Cycle detection: new parent must not be a descendant
      if (newParent.path.startsWith(`${account.path}.`)) {
        throw new ValidationError('Cannot move account under its own descendant (cycle detected).');
      }

      // Same account type
      if (newParent.accountType !== account.accountType) {
        throw new ValidationError(
          `Cannot move to a parent with different account type. Account: ${account.accountType}, Parent: ${newParent.accountType}`,
        );
      }

      // New parent must not be postable
      if (newParent.isPostable) {
        throw new ValidationError('Cannot move under a postable account. Change parent to non-postable first.');
      }

      newLevel = newParent.level + 1;
      newPath = `${newParent.path}.${account.code}`;
    }

    const oldPath = account.path;
    const oldLevel = account.level;

    // Update account and all descendants in transaction
    await this.transaction(async (tx) => {
      // Update the moved account
      await tx
        .update(chartOfAccounts)
        .set({
          parentId: newParentId,
          level: newLevel,
          path: newPath,
          updatedAt: new Date(),
        })
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.id, id),
        ));

      // Update all descendants
      const descendants = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          like(chartOfAccounts.path, `${oldPath}.%`),
        ));

      const levelDiff = newLevel - oldLevel;

      for (const desc of descendants) {
        const updatedPath = newPath + desc.path.substring(oldPath.length);
        const updatedLevel = desc.level + levelDiff;

        await tx
          .update(chartOfAccounts)
          .set({
            path: updatedPath,
            level: updatedLevel,
            updatedAt: new Date(),
          })
          .where(eq(chartOfAccounts.id, desc.id));
      }
    });

    return this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  // ─── SOFT DELETE ─────────────────────────────────────────────────────

  static async remove(tenantId: string, id: string) {
    const account = await this.findById<ChartOfAccount>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Cannot delete account with active children
    const hasChildren = await this.hasActiveChildren(tenantId, id);
    if (hasChildren) {
      throw new ValidationError('Cannot delete account with active children. Move or delete children first.');
    }

    // Cannot delete system template accounts
    if (account.isSystemAccount) {
      throw new ForbiddenError('Cannot delete system template account. Deactivate instead.');
    }

    // TODO: When journal entries exist, check if account has posted entries
    // const hasEntries = await JournalEntryService.hasEntriesForAccount(tenantId, id);
    // if (hasEntries) throw new ValidationError('Cannot delete account with posted journal entries.');

    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────

  private static deriveNormalBalance(accountType: string): NormalBalance {
    switch (accountType) {
      case 'ASSET':
      case 'EXPENSE':
        return 'DEBIT';
      case 'LIABILITY':
      case 'EQUITY':
      case 'REVENUE':
        return 'CREDIT';
      default:
        return 'DEBIT';
    }
  }

  private static async hasActiveChildren(tenantId: string, accountId: string): Promise<boolean> {
    const children = await this.db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.parentId, accountId),
        eq(chartOfAccounts.isActive, true),
      ))
      .limit(1);

    return children.length > 0;
  }

  private static async cascadePathUpdate(
    tenantId: string,
    existing: ChartOfAccount,
    newCode: string,
  ) {
    const oldPath = existing.path;
    // Replace last segment of path with new code
    const pathParts = oldPath.split('.');
    pathParts[pathParts.length - 1] = newCode;
    const newPath = pathParts.join('.');

    await this.transaction(async (tx) => {
      // Update own path
      await tx
        .update(chartOfAccounts)
        .set({ path: newPath, updatedAt: new Date() })
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.id, existing.id),
        ));

      // Update all descendants' paths
      const descendants = await tx
        .select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          like(chartOfAccounts.path, `${oldPath}.%`),
        ));

      for (const desc of descendants) {
        const updatedDescPath = newPath + desc.path.substring(oldPath.length);
        await tx
          .update(chartOfAccounts)
          .set({ path: updatedDescPath, updatedAt: new Date() })
          .where(eq(chartOfAccounts.id, desc.id));
      }
    });
  }

  private static buildTree(accounts: ChartOfAccount[]): AccountTreeNode[] {
    const map = new Map<string, AccountTreeNode>();
    const roots: AccountTreeNode[] = [];

    // First pass: create all nodes
    for (const account of accounts) {
      map.set(account.id, { account, children: [] });
    }

    // Second pass: link children to parents
    for (const account of accounts) {
      const node = map.get(account.id)!;
      if (account.parentId && map.has(account.parentId)) {
        map.get(account.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
