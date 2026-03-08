/**
 * DPF Static Structure Definition (SAP B1 Style)
 * Central source of truth for all modules and screens
 * Based on GLOBAL_MODULE_MAP.md architecture
 *
 * Authorization Levels (per screen):
 * - 0: No Authorization (screen hidden, route blocked)
 * - 1: Read Only (view only, no create/update)
 * - 2: Full Authorization (all operations allowed)
 *
 * This structure is automatically synced to the database on server startup
 * All tenants inherit this structure via DPF sync script
 */

/**
 * Screen Definition (SAP B1 Style - no actions, just screens)
 */
export interface DPFScreenDefinition {
  screenCode: string;
  screenName: string;
  screenNameAr: string;
  route?: string;
  description?: string;
  descriptionAr?: string;
}

/**
 * Module Definition
 */
export interface DPFModuleDefinition {
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string;
  category: string;
  icon?: string;
  description?: string;
  descriptionAr?: string;
  sortOrder: string;
  isSystemModule?: boolean; // true = SYSTEM-level module (platform-wide)
  screens: DPFScreenDefinition[];
}

/**
 * Complete DPF Structure — Only DEVELOPED modules/screens
 * Tenant: 5 modules (16 screens) | System: 8 modules (11 screens)
 * Add new modules/screens here ONLY when the feature is fully built.
 */
export const DPF_STRUCTURE: DPFModuleDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. ADMINISTRATION MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'ADMIN',
    moduleName: 'Administration',
    moduleNameAr: 'الإدارة',
    category: 'ADMIN',
    icon: 'settings',
    description: 'System administration and configuration',
    descriptionAr: 'إدارة النظام والتكوين',
    sortOrder: '001',
    screens: [
      {
        screenCode: 'TENANTS',
        screenName: 'Tenant Management',
        screenNameAr: 'إدارة المستأجرين',
        route: '/app/administration/tenants',
        description: 'Manage tenants and multi-tenant configuration',
        descriptionAr: 'إدارة المستأجرين والتكوين متعدد المستأجرين',
        sortOrder: '001',
      },
      {
        screenCode: 'BUSINESS_LINES',
        screenName: 'Business Lines',
        screenNameAr: 'خطوط الأعمال',
        route: '/app/administration/business-lines',
        description: 'Manage business lines and branding',
        descriptionAr: 'إدارة خطوط الأعمال والعلامة التجارية',
        sortOrder: '002',
      },
      {
        screenCode: 'BRANCHES',
        screenName: 'Branch Management',
        screenNameAr: 'إدارة الفروع',
        route: '/app/administration/branches',
        description: 'Manage clinic branches and locations',
        descriptionAr: 'إدارة فروع العيادة والمواقع',
        sortOrder: '003',
      },
      {
        screenCode: 'USERS',
        screenName: 'User Management',
        screenNameAr: 'إدارة المستخدمين',
        route: '/app/administration/users',
        description: 'Manage users and access control',
        descriptionAr: 'إدارة المستخدمين والتحكم في الوصول',
        sortOrder: '004',
      },
      {
        screenCode: 'ROLES',
        screenName: 'Roles & Permissions',
        screenNameAr: 'الأدوار والصلاحيات',
        route: '/app/administration/roles',
        description: 'Manage roles and permission matrix',
        descriptionAr: 'إدارة الأدوار ومصفوفة الصلاحيات',
        sortOrder: '005',
      },
      {
        screenCode: 'POSTING_PERIODS',
        screenName: 'Posting Periods',
        screenNameAr: 'فترات الترحيل',
        route: '/app/administration/setup/posting-periods',
        description: 'Manage fiscal years and posting periods',
        descriptionAr: 'إدارة السنوات المالية وفترات الترحيل',
        sortOrder: '006',
      },
      {
        screenCode: 'TAX_CODES',
        screenName: 'Tax Codes',
        screenNameAr: 'رموز الضريبة',
        route: '/app/administration/setup/tax-codes',
        description: 'Manage tax codes and VAT configuration',
        descriptionAr: 'إدارة رموز الضريبة وتكوين ضريبة القيمة المضافة',
        sortOrder: '007',
      },
      {
        screenCode: 'DOCUMENT_NUMBER_SERIES',
        screenName: 'Document Number Series',
        screenNameAr: 'سلسلة أرقام المستندات',
        route: '/app/administration/setup/document-number-series',
        description: 'Manage document numbering series per branch',
        descriptionAr: 'إدارة سلسلة ترقيم المستندات لكل فرع',
        sortOrder: '008',
      },
      {
        screenCode: 'WAREHOUSES',
        screenName: 'Warehouse Management',
        screenNameAr: 'إدارة المستودعات',
        route: '/app/administration/setup/warehouses',
        description: 'Manage warehouses and storage locations',
        descriptionAr: 'إدارة المستودعات ومواقع التخزين',
        sortOrder: '009',
      },
      {
        screenCode: 'ITEM_GROUPS',
        screenName: 'Item Groups',
        screenNameAr: 'مجموعات الأصناف',
        route: '/app/administration/setup/item-groups',
        description: 'Manage item groups and categories',
        descriptionAr: 'إدارة مجموعات وفئات الأصناف',
        sortOrder: '010',
      },
      {
        screenCode: 'UNITS_OF_MEASURE',
        screenName: 'Units of Measure',
        screenNameAr: 'وحدات القياس',
        route: '/app/administration/setup/units-of-measure',
        description: 'Manage units of measurement for inventory and pharmacy',
        descriptionAr: 'إدارة وحدات القياس للمخزون والصيدلية',
        sortOrder: '011',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. PATIENT MANAGEMENT MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'PATIENT_MGMT',
    moduleName: 'Patient Management',
    moduleNameAr: 'إدارة المرضى',
    category: 'CLINICAL',
    icon: 'users',
    description: 'Patient registration, demographics, and medical records',
    descriptionAr: 'تسجيل المرضى والديموغرافيا والسجلات الطبية',
    sortOrder: '002',
    screens: [
      {
        screenCode: 'PATIENT_LIST',
        screenName: 'Patient Registry',
        screenNameAr: 'سجل المرضى',
        route: '/patients',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. CLIENT MANAGEMENT MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'CLIENT_MGMT',
    moduleName: 'Client Management',
    moduleNameAr: 'إدارة العملاء',
    category: 'CLINICAL',
    icon: 'user-circle',
    description: 'Pet owner registration and client portal',
    descriptionAr: 'تسجيل مالك الحيوان الأليف وبوابة العميل',
    sortOrder: '003',
    screens: [
      {
        screenCode: 'CLIENT_LIST',
        screenName: 'Client Registry',
        screenNameAr: 'سجل العملاء',
        route: '/clients',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. FINANCE MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'FINANCE',
    moduleName: 'Finance',
    moduleNameAr: 'المالية',
    category: 'FINANCE',
    icon: 'dollar-sign',
    description: 'Financial management and accounting',
    descriptionAr: 'الإدارة المالية والمحاسبة',
    sortOrder: '004',
    screens: [
      {
        screenCode: 'CHART_OF_ACCOUNTS',
        screenName: 'Chart of Accounts',
        screenNameAr: 'دليل الحسابات',
        route: '/app/finance/chart-of-accounts',
        description: 'Manage chart of accounts and account hierarchy',
        descriptionAr: 'إدارة دليل الحسابات وهيكل الحسابات',
        sortOrder: '001',
      },
      {
        screenCode: 'JOURNAL_ENTRIES',
        screenName: 'Journal Entries',
        screenNameAr: 'قيود اليومية',
        route: '/app/finance/journal-entries',
        description: 'Double-entry bookkeeping — create and reverse journal entries',
        descriptionAr: 'القيد المزدوج — إنشاء وعكس قيود اليومية',
        sortOrder: '002',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. INVENTORY MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'INVENTORY',
    moduleName: 'Inventory',
    moduleNameAr: 'المخزون',
    category: 'OPERATIONS',
    icon: 'package',
    description: 'Inventory and stock management',
    descriptionAr: 'إدارة المخزون والمخزون',
    sortOrder: '005',
    screens: [
      {
        screenCode: 'ITEM_MASTER',
        screenName: 'Item Master Data',
        screenNameAr: 'بيانات الأصناف',
        route: '/app/inventory/items',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM MODULES (Platform-wide, SYSTEM users only)
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // S1. SYSTEM TENANTS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_TENANTS',
    moduleName: 'Tenant Management',
    moduleNameAr: 'إدارة المستأجرين',
    category: 'SYSTEM',
    icon: 'building',
    description: 'Platform-wide tenant management and configuration',
    descriptionAr: 'إدارة المستأجرين على مستوى المنصة',
    sortOrder: '101',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_TENANT_LIST',
        screenName: 'All Tenants',
        screenNameAr: 'جميع المستأجرين',
        route: '/system/tenants',
        description: 'View and manage all platform tenants',
        descriptionAr: 'عرض وإدارة جميع مستأجري المنصة',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S2. SYSTEM USERS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_USERS',
    moduleName: 'Platform Users',
    moduleNameAr: 'مستخدمي المنصة',
    category: 'SYSTEM',
    icon: 'users-cog',
    description: 'Manage platform-level system users',
    descriptionAr: 'إدارة مستخدمي النظام على مستوى المنصة',
    sortOrder: '102',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_USER_LIST',
        screenName: 'System Users',
        screenNameAr: 'مستخدمي النظام',
        route: '/system/administration/users',
        description: 'View and manage system-level users',
        descriptionAr: 'عرض وإدارة مستخدمي النظام',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S3. SYSTEM ROLES MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_ROLES',
    moduleName: 'System Roles',
    moduleNameAr: 'أدوار النظام',
    category: 'SYSTEM',
    icon: 'shield',
    description: 'Manage system-level roles and permissions',
    descriptionAr: 'إدارة أدوار وصلاحيات النظام',
    sortOrder: '103',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_ROLE_LIST',
        screenName: 'System Roles',
        screenNameAr: 'أدوار النظام',
        route: '/system/administration/roles',
        description: 'View and manage system roles',
        descriptionAr: 'عرض وإدارة أدوار النظام',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S4. SYSTEM SUBSCRIPTIONS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_SUBSCRIPTIONS',
    moduleName: 'Subscriptions',
    moduleNameAr: 'الاشتراكات',
    category: 'SYSTEM',
    icon: 'credit-card',
    description: 'Manage tenant subscriptions and billing',
    descriptionAr: 'إدارة اشتراكات وفواتير المستأجرين',
    sortOrder: '104',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_SUBSCRIPTION_LIST',
        screenName: 'All Subscriptions',
        screenNameAr: 'جميع الاشتراكات',
        route: '/system/subscriptions',
        description: 'View and manage all tenant subscriptions',
        descriptionAr: 'عرض وإدارة جميع اشتراكات المستأجرين',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S5. SYSTEM SETTINGS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_SETTINGS',
    moduleName: 'System Settings',
    moduleNameAr: 'إعدادات النظام',
    category: 'SYSTEM',
    icon: 'sliders',
    description: 'Platform-wide configuration and settings',
    descriptionAr: 'التكوين والإعدادات على مستوى المنصة',
    sortOrder: '105',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_CONFIG',
        screenName: 'Platform Configuration',
        screenNameAr: 'تكوين المنصة',
        route: '/system/settings',
        description: 'Configure platform-wide settings',
        descriptionAr: 'تكوين إعدادات المنصة',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S6. SYSTEM MONITORING MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_MONITORING',
    moduleName: 'Monitoring',
    moduleNameAr: 'المراقبة',
    category: 'SYSTEM',
    icon: 'activity',
    description: 'Platform health monitoring and diagnostics',
    descriptionAr: 'مراقبة صحة المنصة والتشخيصات',
    sortOrder: '106',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_METRICS',
        screenName: 'Platform Metrics',
        screenNameAr: 'مقاييس المنصة',
        route: '/system/monitoring',
        description: 'View platform performance metrics',
        descriptionAr: 'عرض مقاييس أداء المنصة',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S7. SYSTEM DPF MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_DPF',
    moduleName: 'DPF Management',
    moduleNameAr: 'إدارة DPF',
    category: 'SYSTEM',
    icon: 'database',
    description: 'Dynamic Permission Fabric structure management',
    descriptionAr: 'إدارة هيكل الصلاحيات الديناميكي',
    sortOrder: '107',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYSTEM_DPF_MANAGER',
        screenName: 'DPF Manager',
        screenNameAr: 'مدير DPF',
        route: '/system/dpf',
        description: 'Manage DPF modules, screens, and structure',
        descriptionAr: 'إدارة وحدات وشاشات وهيكل DPF',
        sortOrder: '001',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // S8. SYSTEM AI MODULE (Platform-wide AI Management)
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'SYSTEM_AI',
    moduleName: 'AI Management',
    moduleNameAr: 'إدارة الذكاء الاصطناعي',
    category: 'SYSTEM',
    icon: 'cpu',
    description: 'Platform-wide AI configuration and monitoring',
    descriptionAr: 'تكوين ومراقبة الذكاء الاصطناعي على مستوى المنصة',
    sortOrder: '108',
    isSystemModule: true,
    screens: [
      {
        screenCode: 'SYS_AI_CONFIG',
        screenName: 'AI Configuration',
        screenNameAr: 'تكوين الذكاء الاصطناعي',
        route: '/system/ai/config',
        description: 'Configure platform-wide AI settings',
        descriptionAr: 'تكوين إعدادات الذكاء الاصطناعي على مستوى المنصة',
        sortOrder: '001',
      },
      {
        screenCode: 'SYS_AI_MONITORING',
        screenName: 'AI Monitoring',
        screenNameAr: 'مراقبة الذكاء الاصطناعي',
        route: '/system/ai/monitoring',
        description: 'Monitor AI usage and performance across tenants',
        descriptionAr: 'مراقبة استخدام وأداء الذكاء الاصطناعي عبر المستأجرين',
        sortOrder: '002',
      },
      {
        screenCode: 'SYS_AI_LOGS',
        screenName: 'AI System Logs',
        screenNameAr: 'سجلات نظام الذكاء الاصطناعي',
        route: '/system/ai/logs',
        description: 'View platform-wide AI audit logs',
        descriptionAr: 'عرض سجلات تدقيق الذكاء الاصطناعي على مستوى المنصة',
        sortOrder: '003',
      },
    ],
  },
];

/**
 * Get total counts for validation
 */
export function getDPFStatistics() {
  let totalScreens = 0;

  DPF_STRUCTURE.forEach(module => {
    totalScreens += module.screens.length;
  });

  return {
    totalModules: DPF_STRUCTURE.length,
    totalScreens,
  };
}

/**
 * Get SYSTEM modules only (platform-wide)
 * Used for SYSTEM role management
 */
export function getSystemModules(): DPFModuleDefinition[] {
  return DPF_STRUCTURE.filter(module => module.isSystemModule === true);
}

/**
 * Get TENANT modules only (non-system)
 * Used for tenant role management
 */
export function getTenantModules(): DPFModuleDefinition[] {
  return DPF_STRUCTURE.filter(module => module.isSystemModule !== true);
}

/**
 * Get statistics for SYSTEM modules
 */
export function getSystemModuleStatistics() {
  const systemModules = getSystemModules();
  let totalScreens = 0;

  systemModules.forEach(module => {
    totalScreens += module.screens.length;
  });

  return {
    totalModules: systemModules.length,
    totalScreens,
  };
}

/**
 * Get all screen codes (flat list)
 */
export function getAllScreenCodes(): string[] {
  const codes: string[] = [];
  DPF_STRUCTURE.forEach(module => {
    module.screens.forEach(screen => {
      codes.push(screen.screenCode);
    });
  });
  return codes;
}

/**
 * Get screen by code
 */
export function getScreenByCode(screenCode: string): { module: DPFModuleDefinition; screen: DPFScreenDefinition } | null {
  for (const module of DPF_STRUCTURE) {
    for (const screen of module.screens) {
      if (screen.screenCode === screenCode) {
        return { module, screen };
      }
    }
  }
  return null;
}
