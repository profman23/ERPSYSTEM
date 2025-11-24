/**
 * DPF Static Structure Definition
 * Central source of truth for all modules, screens, and actions
 * Based on GLOBAL_MODULE_MAP.md architecture
 * 
 * This structure is automatically synced to the database on server startup
 * All tenants inherit this structure via DPF sync script
 */

export interface DPFActionDefinition {
  actionCode: string;
  actionName: string;
  actionNameAr: string;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'CUSTOM';
  description?: string;
  descriptionAr?: string;
}

export interface DPFScreenDefinition {
  screenCode: string;
  screenName: string;
  screenNameAr: string;
  route?: string;
  description?: string;
  descriptionAr?: string;
  actions: DPFActionDefinition[];
}

export interface DPFModuleDefinition {
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string;
  category: string;
  icon?: string;
  description?: string;
  descriptionAr?: string;
  sortOrder: string;
  screens: DPFScreenDefinition[];
}

/**
 * Complete DPF Structure - 14 Top-Level Modules
 * Aligned with GLOBAL_MODULE_MAP.md
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
        route: '/admin/tenants',
        description: 'Manage tenants and multi-tenant configuration',
        descriptionAr: 'إدارة المستأجرين والتكوين متعدد المستأجرين',
        actions: [
          { actionCode: 'tenants.create', actionName: 'Create Tenant', actionNameAr: 'إنشاء مستأجر', actionType: 'CREATE' },
          { actionCode: 'tenants.view', actionName: 'View Tenants', actionNameAr: 'عرض المستأجرين', actionType: 'READ' },
          { actionCode: 'tenants.update', actionName: 'Update Tenant', actionNameAr: 'تحديث مستأجر', actionType: 'UPDATE' },
          { actionCode: 'tenants.delete', actionName: 'Delete Tenant', actionNameAr: 'حذف مستأجر', actionType: 'DELETE' },
        ],
      },
      {
        screenCode: 'BUSINESS_LINES',
        screenName: 'Business Lines',
        screenNameAr: 'خطوط الأعمال',
        route: '/admin/business-lines',
        description: 'Manage business lines and branding',
        descriptionAr: 'إدارة خطوط الأعمال والعلامة التجارية',
        actions: [
          { actionCode: 'business-lines.create', actionName: 'Create Business Line', actionNameAr: 'إنشاء خط أعمال', actionType: 'CREATE' },
          { actionCode: 'business-lines.view', actionName: 'View Business Lines', actionNameAr: 'عرض خطوط الأعمال', actionType: 'READ' },
          { actionCode: 'business-lines.update', actionName: 'Update Business Line', actionNameAr: 'تحديث خط أعمال', actionType: 'UPDATE' },
          { actionCode: 'business-lines.delete', actionName: 'Delete Business Line', actionNameAr: 'حذف خط أعمال', actionType: 'DELETE' },
        ],
      },
      {
        screenCode: 'BRANCHES',
        screenName: 'Branch Management',
        screenNameAr: 'إدارة الفروع',
        route: '/admin/branches',
        description: 'Manage clinic branches and locations',
        descriptionAr: 'إدارة فروع العيادة والمواقع',
        actions: [
          { actionCode: 'branches.create', actionName: 'Create Branch', actionNameAr: 'إنشاء فرع', actionType: 'CREATE' },
          { actionCode: 'branches.view', actionName: 'View Branches', actionNameAr: 'عرض الفروع', actionType: 'READ' },
          { actionCode: 'branches.update', actionName: 'Update Branch', actionNameAr: 'تحديث فرع', actionType: 'UPDATE' },
          { actionCode: 'branches.delete', actionName: 'Delete Branch', actionNameAr: 'حذف فرع', actionType: 'DELETE' },
        ],
      },
      {
        screenCode: 'USERS',
        screenName: 'User Management',
        screenNameAr: 'إدارة المستخدمين',
        route: '/admin/users',
        description: 'Manage users and access control',
        descriptionAr: 'إدارة المستخدمين والتحكم في الوصول',
        actions: [
          { actionCode: 'users.create', actionName: 'Create User', actionNameAr: 'إنشاء مستخدم', actionType: 'CREATE' },
          { actionCode: 'users.view', actionName: 'View Users', actionNameAr: 'عرض المستخدمين', actionType: 'READ' },
          { actionCode: 'users.update', actionName: 'Update User', actionNameAr: 'تحديث مستخدم', actionType: 'UPDATE' },
          { actionCode: 'users.delete', actionName: 'Delete User', actionNameAr: 'حذف مستخدم', actionType: 'DELETE' },
          { actionCode: 'users.assign_role', actionName: 'Assign Role', actionNameAr: 'تعيين دور', actionType: 'CUSTOM' },
        ],
      },
      {
        screenCode: 'ROLES',
        screenName: 'Roles & Permissions',
        screenNameAr: 'الأدوار والصلاحيات',
        route: '/admin/roles',
        description: 'Manage roles and permission matrix',
        descriptionAr: 'إدارة الأدوار ومصفوفة الصلاحيات',
        actions: [
          { actionCode: 'roles.create', actionName: 'Create Role', actionNameAr: 'إنشاء دور', actionType: 'CREATE' },
          { actionCode: 'roles.view', actionName: 'View Roles', actionNameAr: 'عرض الأدوار', actionType: 'READ' },
          { actionCode: 'roles.update', actionName: 'Update Role', actionNameAr: 'تحديث دور', actionType: 'UPDATE' },
          { actionCode: 'roles.delete', actionName: 'Delete Role', actionNameAr: 'حذف دور', actionType: 'DELETE' },
          { actionCode: 'permissions.view', actionName: 'View Permissions', actionNameAr: 'عرض الصلاحيات', actionType: 'READ' },
          { actionCode: 'permissions.assign', actionName: 'Assign Permissions', actionNameAr: 'تعيين صلاحيات', actionType: 'CUSTOM' },
        ],
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
        actions: [
          { actionCode: 'patients.create', actionName: 'Register Patient', actionNameAr: 'تسجيل مريض', actionType: 'CREATE' },
          { actionCode: 'patients.view', actionName: 'View Patients', actionNameAr: 'عرض المرضى', actionType: 'READ' },
          { actionCode: 'patients.update', actionName: 'Update Patient', actionNameAr: 'تحديث مريض', actionType: 'UPDATE' },
          { actionCode: 'patients.delete', actionName: 'Delete Patient', actionNameAr: 'حذف مريض', actionType: 'DELETE' },
          { actionCode: 'patients.export', actionName: 'Export Patients', actionNameAr: 'تصدير المرضى', actionType: 'EXPORT' },
        ],
      },
      {
        screenCode: 'PATIENT_DETAILS',
        screenName: 'Patient Details',
        screenNameAr: 'تفاصيل المريض',
        route: '/patients/:id',
        actions: [
          { actionCode: 'patient-details.view', actionName: 'View Details', actionNameAr: 'عرض التفاصيل', actionType: 'READ' },
          { actionCode: 'patient-details.edit', actionName: 'Edit Details', actionNameAr: 'تحرير التفاصيل', actionType: 'UPDATE' },
        ],
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
        actions: [
          { actionCode: 'clients.create', actionName: 'Register Client', actionNameAr: 'تسجيل عميل', actionType: 'CREATE' },
          { actionCode: 'clients.view', actionName: 'View Clients', actionNameAr: 'عرض العملاء', actionType: 'READ' },
          { actionCode: 'clients.update', actionName: 'Update Client', actionNameAr: 'تحديث عميل', actionType: 'UPDATE' },
          { actionCode: 'clients.delete', actionName: 'Delete Client', actionNameAr: 'حذف عميل', actionType: 'DELETE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. APPOINTMENTS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'APPOINTMENTS',
    moduleName: 'Appointments',
    moduleNameAr: 'المواعيد',
    category: 'CLINICAL',
    icon: 'calendar',
    description: 'Appointment scheduling and management',
    descriptionAr: 'جدولة وإدارة المواعيد',
    sortOrder: '004',
    screens: [
      {
        screenCode: 'APPOINTMENT_CALENDAR',
        screenName: 'Appointment Calendar',
        screenNameAr: 'تقويم المواعيد',
        route: '/appointments',
        actions: [
          { actionCode: 'appointments.create', actionName: 'Create Appointment', actionNameAr: 'إنشاء موعد', actionType: 'CREATE' },
          { actionCode: 'appointments.view', actionName: 'View Appointments', actionNameAr: 'عرض المواعيد', actionType: 'READ' },
          { actionCode: 'appointments.update', actionName: 'Update Appointment', actionNameAr: 'تحديث موعد', actionType: 'UPDATE' },
          { actionCode: 'appointments.cancel', actionName: 'Cancel Appointment', actionNameAr: 'إلغاء موعد', actionType: 'DELETE' },
          { actionCode: 'appointments.confirm', actionName: 'Confirm Appointment', actionNameAr: 'تأكيد موعد', actionType: 'APPROVE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. CLINICAL MODULE (EMR)
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'CLINICAL',
    moduleName: 'Clinical Records',
    moduleNameAr: 'السجلات السريرية',
    category: 'CLINICAL',
    icon: 'file-text',
    description: 'Electronic medical records and clinical documentation',
    descriptionAr: 'السجلات الطبية الإلكترونية والتوثيق السريري',
    sortOrder: '005',
    screens: [
      {
        screenCode: 'EMR',
        screenName: 'Medical Records',
        screenNameAr: 'السجلات الطبية',
        route: '/clinical/emr',
        actions: [
          { actionCode: 'emr.create', actionName: 'Create Record', actionNameAr: 'إنشاء سجل', actionType: 'CREATE' },
          { actionCode: 'emr.view', actionName: 'View Records', actionNameAr: 'عرض السجلات', actionType: 'READ' },
          { actionCode: 'emr.update', actionName: 'Update Record', actionNameAr: 'تحديث سجل', actionType: 'UPDATE' },
          { actionCode: 'emr.delete', actionName: 'Delete Record', actionNameAr: 'حذف سجل', actionType: 'DELETE' },
        ],
      },
      {
        screenCode: 'PRESCRIPTIONS',
        screenName: 'Prescriptions',
        screenNameAr: 'الوصفات الطبية',
        route: '/clinical/prescriptions',
        actions: [
          { actionCode: 'prescriptions.create', actionName: 'Create Prescription', actionNameAr: 'إنشاء وصفة', actionType: 'CREATE' },
          { actionCode: 'prescriptions.view', actionName: 'View Prescriptions', actionNameAr: 'عرض الوصفات', actionType: 'READ' },
          { actionCode: 'prescriptions.approve', actionName: 'Approve Prescription', actionNameAr: 'الموافقة على الوصفة', actionType: 'APPROVE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. PHARMACY MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'PHARMACY',
    moduleName: 'Pharmacy',
    moduleNameAr: 'الصيدلية',
    category: 'CLINICAL',
    icon: 'pill',
    description: 'Pharmacy management and medication tracking',
    descriptionAr: 'إدارة الصيدلية وتتبع الأدوية',
    sortOrder: '006',
    screens: [
      {
        screenCode: 'MEDICATIONS',
        screenName: 'Medication Inventory',
        screenNameAr: 'مخزون الأدوية',
        route: '/pharmacy/medications',
        actions: [
          { actionCode: 'medications.create', actionName: 'Add Medication', actionNameAr: 'إضافة دواء', actionType: 'CREATE' },
          { actionCode: 'medications.view', actionName: 'View Medications', actionNameAr: 'عرض الأدوية', actionType: 'READ' },
          { actionCode: 'medications.update', actionName: 'Update Medication', actionNameAr: 'تحديث دواء', actionType: 'UPDATE' },
          { actionCode: 'medications.delete', actionName: 'Delete Medication', actionNameAr: 'حذف دواء', actionType: 'DELETE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. LABORATORY MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'LABORATORY',
    moduleName: 'Laboratory',
    moduleNameAr: 'المختبر',
    category: 'CLINICAL',
    icon: 'flask',
    description: 'Laboratory tests and results management',
    descriptionAr: 'إدارة الفحوصات المخبرية والنتائج',
    sortOrder: '007',
    screens: [
      {
        screenCode: 'LAB_TESTS',
        screenName: 'Lab Tests',
        screenNameAr: 'الفحوصات المخبرية',
        route: '/laboratory/tests',
        actions: [
          { actionCode: 'lab-tests.create', actionName: 'Order Test', actionNameAr: 'طلب فحص', actionType: 'CREATE' },
          { actionCode: 'lab-tests.view', actionName: 'View Tests', actionNameAr: 'عرض الفحوصات', actionType: 'READ' },
          { actionCode: 'lab-tests.update', actionName: 'Update Results', actionNameAr: 'تحديث النتائج', actionType: 'UPDATE' },
          { actionCode: 'lab-tests.approve', actionName: 'Approve Results', actionNameAr: 'الموافقة على النتائج', actionType: 'APPROVE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. FINANCE MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'FINANCE',
    moduleName: 'Finance',
    moduleNameAr: 'المالية',
    category: 'FINANCE',
    icon: 'dollar-sign',
    description: 'Financial management and accounting',
    descriptionAr: 'الإدارة المالية والمحاسبة',
    sortOrder: '008',
    screens: [
      {
        screenCode: 'INVOICES',
        screenName: 'Invoices',
        screenNameAr: 'الفواتير',
        route: '/finance/invoices',
        actions: [
          { actionCode: 'invoices.create', actionName: 'Create Invoice', actionNameAr: 'إنشاء فاتورة', actionType: 'CREATE' },
          { actionCode: 'invoices.view', actionName: 'View Invoices', actionNameAr: 'عرض الفواتير', actionType: 'READ' },
          { actionCode: 'invoices.update', actionName: 'Update Invoice', actionNameAr: 'تحديث فاتورة', actionType: 'UPDATE' },
          { actionCode: 'invoices.delete', actionName: 'Delete Invoice', actionNameAr: 'حذف فاتورة', actionType: 'DELETE' },
          { actionCode: 'invoices.export', actionName: 'Export Invoices', actionNameAr: 'تصدير الفواتير', actionType: 'EXPORT' },
        ],
      },
      {
        screenCode: 'PAYMENTS',
        screenName: 'Payments',
        screenNameAr: 'المدفوعات',
        route: '/finance/payments',
        actions: [
          { actionCode: 'payments.create', actionName: 'Record Payment', actionNameAr: 'تسجيل دفعة', actionType: 'CREATE' },
          { actionCode: 'payments.view', actionName: 'View Payments', actionNameAr: 'عرض المدفوعات', actionType: 'READ' },
          { actionCode: 'payments.refund', actionName: 'Process Refund', actionNameAr: 'معالجة استرداد', actionType: 'CUSTOM' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. INVENTORY MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'INVENTORY',
    moduleName: 'Inventory',
    moduleNameAr: 'المخزون',
    category: 'OPERATIONS',
    icon: 'package',
    description: 'Inventory and stock management',
    descriptionAr: 'إدارة المخزون والمخزون',
    sortOrder: '009',
    screens: [
      {
        screenCode: 'STOCK',
        screenName: 'Stock Management',
        screenNameAr: 'إدارة المخزون',
        route: '/inventory/stock',
        actions: [
          { actionCode: 'stock.create', actionName: 'Add Stock Item', actionNameAr: 'إضافة عنصر مخزون', actionType: 'CREATE' },
          { actionCode: 'stock.view', actionName: 'View Stock', actionNameAr: 'عرض المخزون', actionType: 'READ' },
          { actionCode: 'stock.update', actionName: 'Update Stock', actionNameAr: 'تحديث المخزون', actionType: 'UPDATE' },
          { actionCode: 'stock.delete', actionName: 'Delete Stock Item', actionNameAr: 'حذف عنصر مخزون', actionType: 'DELETE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. HR MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'HR',
    moduleName: 'Human Resources',
    moduleNameAr: 'الموارد البشرية',
    category: 'OPERATIONS',
    icon: 'users',
    description: 'Staff management and HR operations',
    descriptionAr: 'إدارة الموظفين وعمليات الموارد البشرية',
    sortOrder: '010',
    screens: [
      {
        screenCode: 'STAFF',
        screenName: 'Staff Management',
        screenNameAr: 'إدارة الموظفين',
        route: '/hr/staff',
        actions: [
          { actionCode: 'staff.create', actionName: 'Add Staff', actionNameAr: 'إضافة موظف', actionType: 'CREATE' },
          { actionCode: 'staff.view', actionName: 'View Staff', actionNameAr: 'عرض الموظفين', actionType: 'READ' },
          { actionCode: 'staff.update', actionName: 'Update Staff', actionNameAr: 'تحديث موظف', actionType: 'UPDATE' },
          { actionCode: 'staff.delete', actionName: 'Delete Staff', actionNameAr: 'حذف موظف', actionType: 'DELETE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. POS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'POS',
    moduleName: 'Point of Sale',
    moduleNameAr: 'نقطة البيع',
    category: 'SALES',
    icon: 'shopping-cart',
    description: 'Point of sale and retail operations',
    descriptionAr: 'نقطة البيع وعمليات البيع بالتجزئة',
    sortOrder: '011',
    screens: [
      {
        screenCode: 'POS_TERMINAL',
        screenName: 'POS Terminal',
        screenNameAr: 'محطة نقطة البيع',
        route: '/pos',
        actions: [
          { actionCode: 'pos.create_sale', actionName: 'Create Sale', actionNameAr: 'إنشاء بيع', actionType: 'CREATE' },
          { actionCode: 'pos.view_sales', actionName: 'View Sales', actionNameAr: 'عرض المبيعات', actionType: 'READ' },
          { actionCode: 'pos.process_payment', actionName: 'Process Payment', actionNameAr: 'معالجة دفع', actionType: 'CUSTOM' },
          { actionCode: 'pos.refund', actionName: 'Process Refund', actionNameAr: 'معالجة استرداد', actionType: 'CUSTOM' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 12. INSURANCE MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'INSURANCE',
    moduleName: 'Insurance',
    moduleNameAr: 'التأمين',
    category: 'FINANCE',
    icon: 'shield',
    description: 'Insurance claims and provider management',
    descriptionAr: 'مطالبات التأمين وإدارة مقدمي الخدمات',
    sortOrder: '012',
    screens: [
      {
        screenCode: 'CLAIMS',
        screenName: 'Insurance Claims',
        screenNameAr: 'مطالبات التأمين',
        route: '/insurance/claims',
        actions: [
          { actionCode: 'claims.create', actionName: 'Create Claim', actionNameAr: 'إنشاء مطالبة', actionType: 'CREATE' },
          { actionCode: 'claims.view', actionName: 'View Claims', actionNameAr: 'عرض المطالبات', actionType: 'READ' },
          { actionCode: 'claims.update', actionName: 'Update Claim', actionNameAr: 'تحديث مطالبة', actionType: 'UPDATE' },
          { actionCode: 'claims.submit', actionName: 'Submit Claim', actionNameAr: 'تقديم مطالبة', actionType: 'APPROVE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 13. ANALYTICS MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'ANALYTICS',
    moduleName: 'Analytics & Reports',
    moduleNameAr: 'التحليلات والتقارير',
    category: 'ANALYTICS',
    icon: 'bar-chart',
    description: 'Business intelligence and reporting',
    descriptionAr: 'ذكاء الأعمال وإعداد التقارير',
    sortOrder: '013',
    screens: [
      {
        screenCode: 'REPORTS',
        screenName: 'Reports',
        screenNameAr: 'التقارير',
        route: '/analytics/reports',
        actions: [
          { actionCode: 'reports.view', actionName: 'View Reports', actionNameAr: 'عرض التقارير', actionType: 'READ' },
          { actionCode: 'reports.generate', actionName: 'Generate Report', actionNameAr: 'توليد تقرير', actionType: 'CUSTOM' },
          { actionCode: 'reports.export', actionName: 'Export Report', actionNameAr: 'تصدير تقرير', actionType: 'EXPORT' },
        ],
      },
      {
        screenCode: 'DASHBOARDS',
        screenName: 'Dashboards',
        screenNameAr: 'لوحات المعلومات',
        route: '/analytics/dashboards',
        actions: [
          { actionCode: 'dashboards.view', actionName: 'View Dashboards', actionNameAr: 'عرض لوحات المعلومات', actionType: 'READ' },
          { actionCode: 'dashboards.create', actionName: 'Create Dashboard', actionNameAr: 'إنشاء لوحة معلومات', actionType: 'CREATE' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. AI/AGI MODULE
  // ═══════════════════════════════════════════════════════════════
  {
    moduleCode: 'AI_AGI',
    moduleName: 'AI & Automation',
    moduleNameAr: 'الذكاء الاصطناعي والأتمتة',
    category: 'AI',
    icon: 'cpu',
    description: 'AI-powered features and automation',
    descriptionAr: 'ميزات الذكاء الاصطناعي والأتمتة',
    sortOrder: '014',
    screens: [
      {
        screenCode: 'AGI_SETTINGS',
        screenName: 'AGI Configuration',
        screenNameAr: 'تكوين AGI',
        route: '/ai/settings',
        actions: [
          { actionCode: 'agi.view', actionName: 'View AGI Settings', actionNameAr: 'عرض إعدادات AGI', actionType: 'READ' },
          { actionCode: 'agi.configure', actionName: 'Configure AGI', actionNameAr: 'تكوين AGI', actionType: 'UPDATE' },
        ],
      },
    ],
  },
];

/**
 * Get total counts for validation
 */
export function getDPFStatistics() {
  let totalScreens = 0;
  let totalActions = 0;

  DPF_STRUCTURE.forEach(module => {
    totalScreens += module.screens.length;
    module.screens.forEach(screen => {
      totalActions += screen.actions.length;
    });
  });

  return {
    totalModules: DPF_STRUCTURE.length,
    totalScreens,
    totalActions,
  };
}
