/**
 * Default Item Group Templates
 *
 * Seeded to every new tenant on creation (after COA + Tax Codes seeding).
 * SAP B1 inspired item groups for veterinary practice management.
 *
 * GL account codes resolved to UUIDs at seed time via the tenant's COA.
 * Tax codes resolved by code at seed time: VAT15-OUT (sales), VAT15-IN (purchases).
 *
 * Item group types:
 *   - MEDICINE: medications and pharmaceuticals (Inv: 1141, COGS: 5110, Purch: 5151)
 *   - SURGICAL_SUPPLY: surgical and medical supplies (Inv: 1142, COGS: 5120, Purch: 5152)
 *   - EQUIPMENT: medical and clinic equipment (Inv: 1143, COGS: 5130, Purch: 5153)
 *   - CONSUMABLE: general consumables (Inv: 1142, COGS: 5120, Purch: 5152)
 *   - SERVICE: non-inventory services (no inventory/purchase account)
 */

export interface DefaultItemGroupTemplate {
  code: string;
  name: string;
  nameAr: string;
  itemGroupType: 'MEDICINE' | 'SURGICAL_SUPPLY' | 'EQUIPMENT' | 'CONSUMABLE' | 'SERVICE';
  inventoryAccountCode: string | null;
  cogsAccountCode: string;
  purchaseAccountCode: string | null;
  revenueAccountCode: string;
  defaultSalesTaxCodeCode: string;
  defaultPurchaseTaxCodeCode: string;
}

export const DEFAULT_ITEM_GROUPS: DefaultItemGroupTemplate[] = [
  {
    code: 'MED',
    name: 'Medications',
    nameAr: 'الأدوية',
    itemGroupType: 'MEDICINE',
    inventoryAccountCode: '1141',
    cogsAccountCode: '5110',
    purchaseAccountCode: '5151',
    revenueAccountCode: '4210',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'SURG',
    name: 'Surgical Supplies',
    nameAr: 'المستلزمات الجراحية',
    itemGroupType: 'SURGICAL_SUPPLY',
    inventoryAccountCode: '1142',
    cogsAccountCode: '5120',
    purchaseAccountCode: '5152',
    revenueAccountCode: '4220',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'EQUIP',
    name: 'Equipment',
    nameAr: 'الأجهزة والمعدات',
    itemGroupType: 'EQUIPMENT',
    inventoryAccountCode: '1143',
    cogsAccountCode: '5130',
    purchaseAccountCode: '5153',
    revenueAccountCode: '4230',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'CONS',
    name: 'Consumables',
    nameAr: 'المواد الاستهلاكية',
    itemGroupType: 'CONSUMABLE',
    inventoryAccountCode: '1142',
    cogsAccountCode: '5120',
    purchaseAccountCode: '5152',
    revenueAccountCode: '4220',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'SVC',
    name: 'Services',
    nameAr: 'الخدمات',
    itemGroupType: 'SERVICE',
    inventoryAccountCode: null,
    cogsAccountCode: '5140',
    purchaseAccountCode: null,
    revenueAccountCode: '4110',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'FOOD',
    name: 'Pet Food & Nutrition',
    nameAr: 'أغذية الحيوانات',
    itemGroupType: 'CONSUMABLE',
    inventoryAccountCode: '1142',
    cogsAccountCode: '5120',
    purchaseAccountCode: '5152',
    revenueAccountCode: '4220',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'ACC',
    name: 'Accessories',
    nameAr: 'إكسسوارات',
    itemGroupType: 'CONSUMABLE',
    inventoryAccountCode: '1142',
    cogsAccountCode: '5120',
    purchaseAccountCode: '5152',
    revenueAccountCode: '4220',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
  {
    code: 'LAB',
    name: 'Laboratory Supplies',
    nameAr: 'مستلزمات المختبر',
    itemGroupType: 'SURGICAL_SUPPLY',
    inventoryAccountCode: '1142',
    cogsAccountCode: '5120',
    purchaseAccountCode: '5152',
    revenueAccountCode: '4220',
    defaultSalesTaxCodeCode: 'VAT15-OUT',
    defaultPurchaseTaxCodeCode: 'VAT15-IN',
  },
];
