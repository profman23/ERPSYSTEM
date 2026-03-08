/**
 * Entity Metadata Registry — Extensible Field Definitions for AI Form Fill
 *
 * When a new domain entity is built (patients, appointments, invoices, etc.),
 * add ONE entry here = Zaki automatically knows how to create/update it.
 *
 * This registry is used by:
 * - AGI Engine: to build dynamic system prompts with field info
 * - ActionExecutor: to validate required fields before service calls
 * - Frontend: to show progress badges during form fill
 */

export interface EntityFieldDef {
  name: string;
  label: string;
  labelAr: string;
  type: 'string' | 'email' | 'password' | 'uuid' | 'boolean' | 'number';
  validation?: string; // Hint for Claude: "must be valid email"
  options?: { value: string; label: string; labelAr: string }[]; // Predefined choices
}

export interface EntityMeta {
  displayName: { en: string; ar: string };
  screenCode: string;           // For DPF permission check
  requiredFields: EntityFieldDef[];
  optionalFields: EntityFieldDef[];
  serviceName: string;          // Which service to call
  serviceMethod: string;        // Which method
  readDescription?: { en: string; ar: string }; // What READ returns
}

/**
 * Extensible entity registry.
 * Add entries as new domain features are built.
 */
export const ENTITY_REGISTRY: Record<string, EntityMeta> = {
  users: {
    displayName: { en: 'User', ar: 'مستخدم' },
    screenCode: 'USERS',
    readDescription: { en: 'List users with name, email, role, and branch', ar: 'عرض المستخدمين مع الاسم والبريد والدور والفرع' },
    requiredFields: [
      { name: 'firstName', label: 'First Name', labelAr: 'الاسم الأول', type: 'string' },
      { name: 'lastName', label: 'Last Name', labelAr: 'اسم العائلة', type: 'string' },
      { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', validation: 'valid email address' },
      { name: 'password', label: 'Password', labelAr: 'كلمة المرور', type: 'password', validation: 'minimum 8 characters' },
      { name: 'role', label: 'Role', labelAr: 'الدور', type: 'string', validation: 'must be one of the predefined roles', options: [
        { value: 'admin', label: 'Admin', labelAr: 'مدير' },
        { value: 'doctor', label: 'Doctor', labelAr: 'طبيب' },
        { value: 'receptionist', label: 'Receptionist', labelAr: 'موظف استقبال' },
        { value: 'technician', label: 'Technician', labelAr: 'فني' },
        { value: 'accountant', label: 'Accountant', labelAr: 'محاسب' },
      ] },
      { name: 'branchId', label: 'Branch', labelAr: 'الفرع', type: 'uuid', validation: 'valid branch UUID' },
    ],
    optionalFields: [
      { name: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'string' },
      { name: 'accessScope', label: 'Access Scope', labelAr: 'نطاق الوصول', type: 'string' },
    ],
    serviceName: 'HierarchyService',
    serviceMethod: 'createUser',
  },
  branches: {
    displayName: { en: 'Branch', ar: 'فرع' },
    screenCode: 'BRANCHES',
    readDescription: { en: 'List branches with city, business line, and user count', ar: 'عرض الفروع مع المدينة وخط العمل وعدد المستخدمين' },
    requiredFields: [
      { name: 'name', label: 'Branch Name', labelAr: 'اسم الفرع', type: 'string' },
      { name: 'businessLineId', label: 'Business Line', labelAr: 'خط العمل', type: 'uuid', validation: 'valid business line UUID' },
      { name: 'country', label: 'Country', labelAr: 'الدولة', type: 'string' },
      { name: 'city', label: 'City', labelAr: 'المدينة', type: 'string' },
      { name: 'address', label: 'Street', labelAr: 'الشارع', type: 'string' },
      { name: 'buildingNumber', label: 'Building No.', labelAr: 'رقم المبنى', type: 'string' },
      { name: 'vatRegistrationNumber', label: 'VAT Number', labelAr: 'الرقم الضريبي', type: 'string' },
      { name: 'commercialRegistrationNumber', label: 'CR Number', labelAr: 'السجل التجاري', type: 'string' },
    ],
    optionalFields: [
      { name: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'string' },
      { name: 'email', label: 'Email', labelAr: 'البريد', type: 'email' },
      { name: 'district', label: 'District', labelAr: 'الحي', type: 'string' },
      { name: 'postalCode', label: 'Zip Code', labelAr: 'الرمز البريدي', type: 'string' },
      { name: 'timezone', label: 'Timezone', labelAr: 'المنطقة الزمنية', type: 'string' },
    ],
    serviceName: 'HierarchyService',
    serviceMethod: 'createBranch',
  },
  'business-lines': {
    displayName: { en: 'Business Line', ar: 'خط عمل' },
    screenCode: 'BUSINESS_LINES',
    readDescription: { en: 'List business lines with branch count and user count', ar: 'عرض خطوط الأعمال مع عدد الفروع والمستخدمين' },
    requiredFields: [
      { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'string' },
      { name: 'tenantId', label: 'Tenant', labelAr: 'المؤسسة', type: 'uuid', validation: 'valid tenant UUID' },
    ],
    optionalFields: [
      { name: 'businessLineType', label: 'Type', labelAr: 'النوع', type: 'string' },
      { name: 'description', label: 'Description', labelAr: 'الوصف', type: 'string' },
      { name: 'contactEmail', label: 'Email', labelAr: 'البريد', type: 'email' },
      { name: 'contactPhone', label: 'Phone', labelAr: 'الهاتف', type: 'string' },
    ],
    serviceName: 'HierarchyService',
    serviceMethod: 'createBusinessLine',
  },
  species: {
    displayName: { en: 'Species', ar: 'فصيلة' },
    screenCode: 'SPECIES',
    readDescription: { en: 'List animal species', ar: 'عرض فصائل الحيوانات' },
    requiredFields: [
      { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'string' },
      { name: 'nameAr', label: 'Arabic Name', labelAr: 'الاسم بالعربي', type: 'string' },
    ],
    optionalFields: [
      { name: 'description', label: 'Description', labelAr: 'الوصف', type: 'string' },
    ],
    serviceName: 'SpeciesService',
    serviceMethod: 'create',
  },
  // Future entities — add here when built:
  // patients: { ... },
  // appointments: { ... },
  // invoices: { ... },
};

/**
 * Get entity metadata by name
 */
export function getEntityMeta(entityName: string): EntityMeta | undefined {
  return ENTITY_REGISTRY[entityName];
}

/**
 * Build a prompt section describing available entities and their fields
 * Used by AGI Engine to inform Claude about what can be created
 */
export function buildEntityPromptSection(language: 'en' | 'ar'): string {
  const lines: string[] = [];

  if (language === 'ar') {
    lines.push('الكيانات التي يمكن إنشاؤها:');
  } else {
    lines.push('Entities that can be created:');
  }

  for (const [key, meta] of Object.entries(ENTITY_REGISTRY)) {
    const name = language === 'ar' ? meta.displayName.ar : meta.displayName.en;
    const required = meta.requiredFields.map(f =>
      language === 'ar' ? f.labelAr : f.label
    ).join(', ');
    const optional = meta.optionalFields.map(f =>
      language === 'ar' ? f.labelAr : f.label
    ).join(', ');

    lines.push(`- ${name} (${key})`);
    lines.push(`  ${language === 'ar' ? 'إلزامي' : 'Required'}: ${required}`);
    if (optional) {
      lines.push(`  ${language === 'ar' ? 'اختياري' : 'Optional'}: ${optional}`);
    }

    // Show predefined options for fields that have them
    const fieldsWithOptions = [...meta.requiredFields, ...meta.optionalFields].filter(f => f.options && f.options.length > 0);
    for (const field of fieldsWithOptions) {
      const fieldLabel = language === 'ar' ? field.labelAr : field.label;
      const optionsList = field.options!.map((o, i) =>
        `${i + 1}. ${language === 'ar' ? o.labelAr : o.label} (${o.value})`
      ).join(', ');
      lines.push(`  ${language === 'ar' ? 'اختيارات' : 'Choices for'} ${fieldLabel}: ${optionsList}`);
      lines.push(`  ${language === 'ar' ? '⚠️ عند سؤال المستخدم عن هذا الحقل، اعرض الاختيارات كقائمة مرقمة ليختار منها' : '⚠️ When asking for this field, show choices as a numbered list for user to pick from'}`);
    }
  }

  // Add queryable entities section
  lines.push('');
  if (language === 'ar') {
    lines.push('البيانات التي يمكن الاستعلام عنها:');
  } else {
    lines.push('Data that can be queried:');
  }

  for (const [key, meta] of Object.entries(ENTITY_REGISTRY)) {
    if (meta.readDescription) {
      const name = language === 'ar' ? meta.displayName.ar : meta.displayName.en;
      const desc = language === 'ar' ? meta.readDescription.ar : meta.readDescription.en;
      lines.push(`- ${name} (${key}): ${desc}`);
    }
  }

  return lines.join('\n');
}
