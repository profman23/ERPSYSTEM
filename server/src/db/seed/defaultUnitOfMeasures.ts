/**
 * Default Unit of Measure Templates
 *
 * Seeded to every new tenant on creation.
 * 15 veterinary-specific UoMs covering weight, volume, pharmaceutical, and packaging.
 *
 * UoMs are a simple dictionary (code + name + symbol).
 * Conversion factors belong at Item level (SAP B1 pattern).
 */

export interface DefaultUnitOfMeasureTemplate {
  code: string;
  name: string;
  nameAr: string;
  symbol: string | null;
  description: string | null;
  descriptionAr: string | null;
}

export const DEFAULT_UNIT_OF_MEASURES: DefaultUnitOfMeasureTemplate[] = [
  // ── Weight ──
  {
    code: 'KG',
    name: 'Kilogram',
    nameAr: 'كيلوجرام',
    symbol: 'kg',
    description: 'Weight unit — kilogram',
    descriptionAr: 'وحدة وزن — كيلوجرام',
  },
  {
    code: 'G',
    name: 'Gram',
    nameAr: 'جرام',
    symbol: 'g',
    description: 'Weight unit — gram',
    descriptionAr: 'وحدة وزن — جرام',
  },
  {
    code: 'MG',
    name: 'Milligram',
    nameAr: 'ملليجرام',
    symbol: 'mg',
    description: 'Weight unit — milligram',
    descriptionAr: 'وحدة وزن — ملليجرام',
  },

  // ── Volume ──
  {
    code: 'L',
    name: 'Liter',
    nameAr: 'لتر',
    symbol: 'L',
    description: 'Volume unit — liter',
    descriptionAr: 'وحدة حجم — لتر',
  },
  {
    code: 'ML',
    name: 'Milliliter',
    nameAr: 'ملليلتر',
    symbol: 'ml',
    description: 'Volume unit — milliliter',
    descriptionAr: 'وحدة حجم — ملليلتر',
  },

  // ── Pharmaceutical ──
  {
    code: 'TABLET',
    name: 'Tablet',
    nameAr: 'قرص',
    symbol: 'tab',
    description: 'Single tablet or pill',
    descriptionAr: 'قرص واحد',
  },
  {
    code: 'CAPSULE',
    name: 'Capsule',
    nameAr: 'كبسولة',
    symbol: 'cap',
    description: 'Single capsule',
    descriptionAr: 'كبسولة واحدة',
  },
  {
    code: 'VIAL',
    name: 'Vial',
    nameAr: 'قارورة',
    symbol: 'vial',
    description: 'Single vial for injection',
    descriptionAr: 'قارورة حقن واحدة',
  },
  {
    code: 'AMPOULE',
    name: 'Ampoule',
    nameAr: 'أمبولة',
    symbol: 'amp',
    description: 'Single sealed ampoule',
    descriptionAr: 'أمبولة مغلقة واحدة',
  },
  {
    code: 'SYRINGE',
    name: 'Syringe',
    nameAr: 'حقنة',
    symbol: 'syr',
    description: 'Single pre-filled syringe',
    descriptionAr: 'حقنة معبأة مسبقاً',
  },
  {
    code: 'DOSE',
    name: 'Dose',
    nameAr: 'جرعة',
    symbol: 'dose',
    description: 'Single dose unit',
    descriptionAr: 'جرعة واحدة',
  },

  // ── Packaging ──
  {
    code: 'TUBE',
    name: 'Tube',
    nameAr: 'أنبوب',
    symbol: 'tube',
    description: 'Single tube (cream, ointment)',
    descriptionAr: 'أنبوب واحد (كريم، مرهم)',
  },
  {
    code: 'BOX',
    name: 'Box',
    nameAr: 'علبة',
    symbol: 'box',
    description: 'Single box or carton',
    descriptionAr: 'علبة واحدة',
  },
  {
    code: 'PACK',
    name: 'Pack',
    nameAr: 'عبوة',
    symbol: 'pack',
    description: 'Single pack or package',
    descriptionAr: 'عبوة واحدة',
  },
  {
    code: 'PIECE',
    name: 'Piece',
    nameAr: 'قطعة',
    symbol: 'pc',
    description: 'Single piece or unit',
    descriptionAr: 'قطعة واحدة',
  },
];
