/**
 * Default Chart of Accounts Template
 *
 * Seeded to every new tenant on creation.
 * SAP B1 style 4-digit coding with veterinary-adapted categories.
 * All accounts bilingual (English + Arabic).
 *
 * Structure:
 *   1000-1999  Assets
 *   2000-2999  Liabilities
 *   3000-3999  Equity
 *   4000-4999  Revenue
 *   5000-5999  Expenses
 */

export interface DefaultAccountTemplate {
  code: string;
  name: string;
  nameAr: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  isPostable: boolean;
  parentCode: string | null;
  isCashAccount?: boolean;
  isBankAccount?: boolean;
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountTemplate[] = [
  // ═══════════════════════════════════════════════════════
  // ASSETS (1000-1999)
  // ═══════════════════════════════════════════════════════
  { code: '1000', name: 'Assets', nameAr: 'الأصول', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: false, parentCode: null },

  // Current Assets
  { code: '1100', name: 'Current Assets', nameAr: 'الأصول المتداولة', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: false, parentCode: '1000' },
  { code: '1110', name: 'Cash on Hand', nameAr: 'النقدية في الصندوق', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1100', isCashAccount: true },
  { code: '1120', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: false, parentCode: '1100' },
  { code: '1121', name: 'Main Bank Account', nameAr: 'الحساب البنكي الرئيسي', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1120', isBankAccount: true },
  { code: '1130', name: 'Accounts Receivable', nameAr: 'الذمم المدينة', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1100' },
  { code: '1140', name: 'Inventory', nameAr: 'المخزون', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: false, parentCode: '1100' },
  { code: '1141', name: 'Medication Inventory', nameAr: 'مخزون الأدوية', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1140' },
  { code: '1142', name: 'Supplies Inventory', nameAr: 'مخزون المستلزمات', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1140' },
  { code: '1143', name: 'Equipment Inventory', nameAr: 'مخزون الأجهزة', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1140' },
  { code: '1150', name: 'Prepaid Expenses', nameAr: 'المصروفات المدفوعة مقدماً', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1100' },
  { code: '1160', name: 'VAT Receivable', nameAr: 'ض.ق.م مدفوعة مقدماً', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1100' },

  // Non-Current Assets
  { code: '1200', name: 'Non-Current Assets', nameAr: 'الأصول غير المتداولة', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: false, parentCode: '1000' },
  { code: '1210', name: 'Medical Equipment', nameAr: 'المعدات الطبية', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1200' },
  { code: '1220', name: 'Furniture & Fixtures', nameAr: 'الأثاث والتجهيزات', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1200' },
  { code: '1230', name: 'Vehicles', nameAr: 'المركبات', accountType: 'ASSET', normalBalance: 'DEBIT', isPostable: true, parentCode: '1200' },
  { code: '1290', name: 'Accumulated Depreciation', nameAr: 'الاستهلاك المتراكم', accountType: 'ASSET', normalBalance: 'CREDIT', isPostable: true, parentCode: '1200' },

  // ═══════════════════════════════════════════════════════
  // LIABILITIES (2000-2999)
  // ═══════════════════════════════════════════════════════
  { code: '2000', name: 'Liabilities', nameAr: 'الالتزامات', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: false, parentCode: null },

  // Current Liabilities
  { code: '2100', name: 'Current Liabilities', nameAr: 'الالتزامات المتداولة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: false, parentCode: '2000' },
  { code: '2110', name: 'Accounts Payable', nameAr: 'الذمم الدائنة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2100' },
  { code: '2120', name: 'Accrued Expenses', nameAr: 'المصروفات المستحقة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2100' },
  { code: '2130', name: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة المستحقة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2100' },
  { code: '2140', name: 'Salaries Payable', nameAr: 'الرواتب المستحقة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2100' },
  { code: '2150', name: 'Unearned Revenue', nameAr: 'الإيرادات غير المكتسبة', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2100' },

  // Non-Current Liabilities
  { code: '2200', name: 'Non-Current Liabilities', nameAr: 'الالتزامات طويلة الأجل', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: false, parentCode: '2000' },
  { code: '2210', name: 'Long-term Loans', nameAr: 'القروض طويلة الأجل', accountType: 'LIABILITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '2200' },

  // ═══════════════════════════════════════════════════════
  // EQUITY (3000-3999)
  // ═══════════════════════════════════════════════════════
  { code: '3000', name: 'Equity', nameAr: 'حقوق الملكية', accountType: 'EQUITY', normalBalance: 'CREDIT', isPostable: false, parentCode: null },
  { code: '3100', name: "Owner's Capital", nameAr: 'رأس مال المالك', accountType: 'EQUITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '3000' },
  { code: '3200', name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', accountType: 'EQUITY', normalBalance: 'CREDIT', isPostable: true, parentCode: '3000' },
  { code: '3300', name: "Owner's Drawings", nameAr: 'المسحوبات الشخصية', accountType: 'EQUITY', normalBalance: 'DEBIT', isPostable: true, parentCode: '3000' },

  // ═══════════════════════════════════════════════════════
  // REVENUE (4000-4999)
  // ═══════════════════════════════════════════════════════
  { code: '4000', name: 'Revenue', nameAr: 'الإيرادات', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: false, parentCode: null },

  // Clinical Revenue
  { code: '4100', name: 'Clinical Revenue', nameAr: 'إيرادات العيادة', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: false, parentCode: '4000' },
  { code: '4110', name: 'Consultation Fees', nameAr: 'رسوم الاستشارة', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },
  { code: '4120', name: 'Surgery Revenue', nameAr: 'إيرادات الجراحة', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },
  { code: '4130', name: 'Vaccination Revenue', nameAr: 'إيرادات التطعيم', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },
  { code: '4140', name: 'Laboratory Revenue', nameAr: 'إيرادات المختبر', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },
  { code: '4150', name: 'Grooming Revenue', nameAr: 'إيرادات العناية', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },
  { code: '4160', name: 'Boarding Revenue', nameAr: 'إيرادات الإيواء', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4100' },

  // Product Sales
  { code: '4200', name: 'Product Sales', nameAr: 'مبيعات المنتجات', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: false, parentCode: '4000' },
  { code: '4210', name: 'Medication Sales', nameAr: 'مبيعات الأدوية', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4200' },
  { code: '4220', name: 'Pet Supplies Sales', nameAr: 'مبيعات مستلزمات الحيوانات', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4200' },
  { code: '4230', name: 'Equipment Sales', nameAr: 'مبيعات الأجهزة', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4200' },

  // Other Revenue
  { code: '4300', name: 'Insurance Revenue', nameAr: 'إيرادات التأمين', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4000' },
  { code: '4900', name: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, parentCode: '4000' },

  // ═══════════════════════════════════════════════════════
  // EXPENSES (5000-5999)
  // ═══════════════════════════════════════════════════════
  { code: '5000', name: 'Expenses', nameAr: 'المصروفات', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: false, parentCode: null },

  // Cost of Goods Sold
  { code: '5100', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: false, parentCode: '5000' },
  { code: '5110', name: 'Medication Cost', nameAr: 'تكلفة الأدوية', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5100' },
  { code: '5120', name: 'Supplies Cost', nameAr: 'تكلفة المستلزمات', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5100' },
  { code: '5130', name: 'Equipment Cost', nameAr: 'تكلفة الأجهزة', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5100' },
  { code: '5140', name: 'Service Direct Cost', nameAr: 'تكلفة الخدمات المباشرة', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5100' },

  // Purchases (IAS 2.10 — purchase cost, separate from COGS for proper inventory costing)
  { code: '5150', name: 'Purchases', nameAr: 'المشتريات', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: false, parentCode: '5000' },
  { code: '5151', name: 'Medication Purchases', nameAr: 'مشتريات الأدوية', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5150' },
  { code: '5152', name: 'Supplies Purchases', nameAr: 'مشتريات المستلزمات', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5150' },
  { code: '5153', name: 'Equipment Purchases', nameAr: 'مشتريات الأجهزة', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5150' },

  // Staff Expenses
  { code: '5200', name: 'Staff Expenses', nameAr: 'مصروفات الموظفين', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: false, parentCode: '5000' },
  { code: '5210', name: 'Salaries & Wages', nameAr: 'الرواتب والأجور', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5200' },
  { code: '5220', name: 'Employee Benefits', nameAr: 'مزايا الموظفين', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5200' },

  // Operating Expenses
  { code: '5300', name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: false, parentCode: '5000' },
  { code: '5310', name: 'Rent', nameAr: 'الإيجار', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5320', name: 'Utilities', nameAr: 'المرافق', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5330', name: 'Insurance Expense', nameAr: 'مصروف التأمين', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5340', name: 'Depreciation', nameAr: 'الاستهلاك', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5350', name: 'Marketing & Advertising', nameAr: 'التسويق والإعلان', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5360', name: 'Professional Fees', nameAr: 'أتعاب مهنية', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },
  { code: '5370', name: 'IT & Software', nameAr: 'تكنولوجيا المعلومات والبرمجيات', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5300' },

  // Other Expenses
  { code: '5900', name: 'Other Expenses', nameAr: 'مصروفات أخرى', accountType: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, parentCode: '5000' },
];
