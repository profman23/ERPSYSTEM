/**
 * Default Tax Code Templates
 *
 * Seeded to every new tenant on creation (after COA seeding).
 * SAP B1 inspired tax codes for Saudi Arabia / GCC.
 *
 * Tax types:
 *   - OUTPUT_TAX: collected on sales (VAT Payable → LIABILITY 2130)
 *   - INPUT_TAX:  paid on purchases (VAT Receivable → ASSET 1160)
 *   - EXEMPT:     no tax applied
 */

export interface DefaultTaxCodeTemplate {
  code: string;
  name: string;
  nameAr: string;
  taxType: 'OUTPUT_TAX' | 'INPUT_TAX' | 'EXEMPT';
  rate: string;
  calculationMethod: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TAX_INCLUDED';
  salesTaxAccountCode: string | null;
  purchaseTaxAccountCode: string | null;
  jurisdiction: string;
}

export const DEFAULT_TAX_CODES: DefaultTaxCodeTemplate[] = [
  {
    code: 'VAT15-OUT',
    name: 'VAT 15% Output',
    nameAr: 'ض.ق.م 15% مخرجات',
    taxType: 'OUTPUT_TAX',
    rate: '15',
    calculationMethod: 'PERCENTAGE',
    salesTaxAccountCode: '2130',
    purchaseTaxAccountCode: null,
    jurisdiction: 'SA',
  },
  {
    code: 'VAT15-IN',
    name: 'VAT 15% Input',
    nameAr: 'ض.ق.م 15% مدخلات',
    taxType: 'INPUT_TAX',
    rate: '15',
    calculationMethod: 'PERCENTAGE',
    salesTaxAccountCode: null,
    purchaseTaxAccountCode: '1160',
    jurisdiction: 'SA',
  },
  {
    code: 'EXEMPT',
    name: 'Tax Exempt',
    nameAr: 'معفى من الضريبة',
    taxType: 'EXEMPT',
    rate: '0',
    calculationMethod: 'PERCENTAGE',
    salesTaxAccountCode: null,
    purchaseTaxAccountCode: null,
    jurisdiction: 'SA',
  },
  {
    code: 'ZERO',
    name: 'Zero Rated',
    nameAr: 'نسبة صفرية',
    taxType: 'OUTPUT_TAX',
    rate: '0',
    calculationMethod: 'PERCENTAGE',
    salesTaxAccountCode: null,
    purchaseTaxAccountCode: null,
    jurisdiction: 'SA',
  },
];
