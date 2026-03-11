/**
 * Tax Code Service
 *
 * Follows SpeciesService.ts pattern (extends BaseService).
 * Extra logic:
 *   - Validates linked GL accounts (exist, active, postable, same tenant)
 *   - EXEMPT tax codes must have rate = 0
 *   - Optimistic locking via `version` column on updates
 *   - `getActiveTaxCodes` for dropdown use (no pagination)
 */

import { eq, and, asc } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, ValidationError, NotFoundError } from '../core/errors';
import { taxCodes } from '../db/schemas/taxCodes';
import { chartOfAccounts } from '../db/schemas/chartOfAccounts';
import type { TaxCode } from '../db/schemas/taxCodes';
import type {
  CreateTaxCodeInput,
  UpdateTaxCodeInput,
  ListTaxCodesParams,
} from '../validations/taxCodeValidation';

export class TaxCodeService extends BaseService {
  private static readonly TABLE = taxCodes;
  private static readonly ENTITY_NAME = 'TaxCode';

  /**
   * Validate that a GL account exists, belongs to tenant, is active, and is postable.
   */
  private static async validateTaxAccount(
    tenantId: string,
    accountId: string,
    label: string,
  ): Promise<void> {
    const results = await this.db
      .select({
        id: chartOfAccounts.id,
        isActive: chartOfAccounts.isActive,
        isPostable: chartOfAccounts.isPostable,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.id, accountId),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new ValidationError(`${label} not found`);
    }

    const account = results[0];
    if (!account.isActive) {
      throw new ValidationError(`${label} is inactive`);
    }
    if (!account.isPostable) {
      throw new ValidationError(`${label} is not a postable account`);
    }
  }

  static async list(tenantId: string, params: ListTaxCodesParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(taxCodes.isActive, params.isActive === 'true'));
    }

    if (params.taxType) {
      filters.push(eq(taxCodes.taxType, params.taxType));
    }

    const { items, total } = await this.findMany<TaxCode>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [taxCodes.name, taxCodes.nameAr, taxCodes.code],
      sortBy: taxCodes.code,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<TaxCode>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateTaxCodeInput) {
    // Code uniqueness per tenant
    const codeExists = await this.exists(
      tenantId,
      this.TABLE,
      eq(taxCodes.code, input.code),
    );
    if (codeExists) {
      throw new ConflictError(`Tax code '${input.code}' already exists`);
    }

    // Validate linked accounts
    if (input.salesTaxAccountId) {
      await this.validateTaxAccount(tenantId, input.salesTaxAccountId, 'Sales tax account');
    }
    if (input.purchaseTaxAccountId) {
      await this.validateTaxAccount(tenantId, input.purchaseTaxAccountId, 'Purchase tax account');
    }

    // Convert rate to string for numeric column
    const dbInput = {
      ...input,
      rate: String(input.rate),
    };

    return this.auditableInsertOne<TaxCode>(tenantId, this.TABLE, dbInput, 'tax_code');
  }

  static async update(tenantId: string, id: string, input: UpdateTaxCodeInput) {
    // Fetch existing record for version check
    const existing = await this.findById<TaxCode>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Optimistic locking
    if (existing.version !== input.version) {
      throw new ConflictError('Record was modified by another user. Please refresh and try again.');
    }

    // If updating code, check uniqueness
    if (input.code && input.code !== existing.code) {
      const codeExists = await this.exists(
        tenantId,
        this.TABLE,
        eq(taxCodes.code, input.code),
      );
      if (codeExists) {
        throw new ConflictError(`Tax code '${input.code}' already exists`);
      }
    }

    // EXEMPT check: if existing is EXEMPT, rate must stay 0
    if (existing.taxType === 'EXEMPT' && input.rate !== undefined && input.rate !== 0) {
      throw new ValidationError('Exempt tax codes must have a rate of 0');
    }

    // Validate linked accounts if changed
    if (input.salesTaxAccountId) {
      await this.validateTaxAccount(tenantId, input.salesTaxAccountId, 'Sales tax account');
    }
    if (input.purchaseTaxAccountId) {
      await this.validateTaxAccount(tenantId, input.purchaseTaxAccountId, 'Purchase tax account');
    }

    // Build update data
    const { version, ...updateFields } = input;
    const dbInput: Record<string, unknown> = { ...updateFields };

    if (updateFields.rate !== undefined) {
      dbInput.rate = String(updateFields.rate);
    }

    // Increment version
    dbInput.version = existing.version + 1;

    return this.auditableUpdateById<TaxCode>(tenantId, this.TABLE, id, dbInput, 'tax_code', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'tax_code', this.ENTITY_NAME);
  }

  /**
   * Get all active tax codes for dropdowns (no pagination).
   * Optionally filter by taxType.
   */
  static async getActiveTaxCodes(tenantId: string, taxType?: string) {
    const conditions = [
      eq(taxCodes.tenantId, tenantId),
      eq(taxCodes.isActive, true),
    ];

    if (taxType) {
      conditions.push(eq(taxCodes.taxType, taxType));
    }

    const items = await this.db
      .select()
      .from(taxCodes)
      .where(and(...conditions))
      .orderBy(asc(taxCodes.code))
      .limit(100);

    return items;
  }
}
