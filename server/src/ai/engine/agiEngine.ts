/**
 * AGI Engine - Core AI processing with Claude integration
 * Enterprise-grade with pattern matching fallback and streaming
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgiSettingsService } from '../../services/AgiSettingsService';
import { AgiUsageService } from '../../services/AgiUsageService';
import { AgiLogsService } from '../../services/AgiLogsService';
import { AgiApprovalsService } from '../../services/AgiApprovalsService';
import { checkScreenAccess } from '../../rbac/permissionMiddleware';
import { actionExecutor } from './actionExecutor';
import { buildEntityPromptSection } from './entityMetadata';
import type {
  AgiChatRequest,
  AgiChatResponse,
  AgiMessage,
  AgiAction,
  ParsedCommand,
  AgiStreamChunk,
  AgiFormFillState,
} from '../../../../types/agi';

// Base system prompt for the AI assistant "Zaki" (ذكي)
const BASE_SYSTEM_PROMPT = `أنت "ذكي" (Zaki)، المساعد الذكي لنظام إدارة العيادات البيطرية.
You are "Zaki" (ذكي), the intelligent assistant for the Veterinary ERP system.
عرّف نفسك دائماً بـ "ذكي" وكن ودوداً ومهنياً.
Always introduce yourself as "Zaki" and be friendly and professional.

المهام المتاحة / Available tasks:
- إدارة المستخدمين والصلاحيات / User and permission management
- إدارة الـ Tenants والفروع / Tenant and branch management
- التنقل بين الصفحات / Navigation between pages
- الإجابة على الاستفسارات / Answering questions
- إنشاء سجلات جديدة عبر محادثة تفاعلية / Creating new records via interactive conversation

قواعد / Rules:
1. احترم صلاحيات المستخدم - لا تنفذ ما ليس له صلاحية عليه
   Respect user permissions - don't execute what they don't have permission for
2. اطلب التأكيد قبل العمليات الحساسة (حذف، تعديل جماعي)
   Ask for confirmation before destructive operations
3. رد بنفس لغة المستخدم (عربي/إنجليزي)
   Respond in the user's language (Arabic/English)
4. كن موجزاً ومفيداً / Be concise and helpful
5. إذا طلب إنشاء كيان وحقول ناقصة → اسأل عن كل حقل مطلوب واحد تلو الآخر
   If creating an entity with missing fields → ask for each required field one by one
6. لما كل الحقول الإلزامية جاهزة → اطلب التأكيد قبل التنفيذ
   When all required fields are ready → ask for confirmation before executing

عندما يطلب المستخدم إجراء عملية، أجب بتنسيق JSON:
When the user requests an action, respond with JSON format:
{
  "type": "ACTION",
  "action": {
    "type": "NAVIGATE|CREATE|UPDATE|DELETE|READ",
    "target": "entity_name",
    "params": {},
    "description": "وصف العملية",
    "descriptionAr": "وصف بالعربي",
    "isDestructive": false,
    "requiresApproval": false,
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
  }
}

عند جمع بيانات لإنشاء كيان جديد (form fill)، أجب بتنسيق:
When collecting data for creating a new entity (form fill), respond with:
{
  "type": "FORM_FILL",
  "formFillState": {
    "entity": "users|branches|...",
    "action": "CREATE",
    "collectedFields": { "fieldName": "value" },
    "missingRequired": ["field1", "field2"],
    "isComplete": false,
    "confirmedByUser": false
  }
}

للردود العادية، أجب بنص عادي.
For regular responses, reply with plain text.`;

// Panel-aware navigation routes
const PANEL_ROUTES: Record<string, Record<string, { ar: string[]; en: string[] }>> = {
  SYSTEM: {
    '/system/dashboard': { ar: ['داشبورد', 'رئيسية', 'لوحة تحكم'], en: ['dashboard', 'home'] },
    '/system/tenants': { ar: ['عيادات', 'تينانت'], en: ['tenants', 'clinics'] },
    '/system/administration/users': { ar: ['مستخدمين', 'يوزرز'], en: ['users', 'people'] },
    '/system/administration/roles': { ar: ['ادوار', 'صلاحيات'], en: ['roles', 'permissions'] },
    '/system/settings': { ar: ['اعدادات', 'إعدادات'], en: ['settings'] },
    '/system/dpf': { ar: ['دي بي اف', 'هيكل'], en: ['dpf', 'structure'] },
    '/system/metrics': { ar: ['مقاييس', 'احصائيات'], en: ['metrics', 'statistics'] },
    '/system/ai': { ar: ['ذكاء', 'اصطناعي'], en: ['ai', 'artificial'] },
  },
  APP: {
    '/app/dashboard': { ar: ['داشبورد', 'رئيسية', 'لوحة تحكم'], en: ['dashboard', 'home'] },
    '/app/administration/business-lines': { ar: ['خطوط عمل', 'خطوط أعمال', 'بزنس لاين'], en: ['business lines'] },
    '/app/administration/branches': { ar: ['فروع', 'فرع', 'الفروع'], en: ['branches', 'branch'] },
    '/app/administration/users': { ar: ['مستخدمين', 'يوزرز', 'المستخدمين'], en: ['users', 'people'] },
    '/app/administration/roles': { ar: ['ادوار', 'صلاحيات', 'رولز'], en: ['roles', 'permissions'] },
    '/app/administration/settings': { ar: ['اعدادات', 'إعدادات'], en: ['settings'] },
    '/app/patients': { ar: ['مرضى', 'حيوانات'], en: ['patients', 'animals'] },
    '/app/appointments': { ar: ['مواعيد'], en: ['appointments'] },
    '/app/tasks': { ar: ['مهام'], en: ['tasks'] },
    '/app/reports': { ar: ['تقارير'], en: ['reports'] },
    '/app/my-profile': { ar: ['ملفي', 'بروفايل', 'حسابي'], en: ['profile', 'my profile'] },
  },
};

// Action-to-Screen mapping for DPF permission checks
const ACTION_SCREEN_MAP: Record<string, string> = {
  'users': 'USERS',
  'roles': 'ROLES',
  'branches': 'BRANCHES',
  'business-lines': 'BUSINESS_LINES',
  'species': 'SPECIES',
  // Future: 'patients': 'PATIENTS', 'appointments': 'APPOINTMENTS', etc.
};

// Pattern matching for simple commands (fallback without Claude)
const COMMAND_PATTERNS: {
  pattern: RegExp;
  action: Omit<AgiAction, 'description' | 'descriptionAr'>;
  descriptionEn: string;
  descriptionAr: string;
}[] = [
  // Navigation patterns
  {
    pattern: /(?:افتح|روح|اذهب|اذهب الى|رايح|خذني|وديني|open|go to|go|navigate|show|display)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:dashboard|لوحة التحكم|لوحه التحكم|الرئيسية|الرئيسيه|داشبورد|الداشبورد|الصفحة الرئيسية)/i,
    action: { type: 'NAVIGATE', target: '/system/dashboard', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to dashboard',
    descriptionAr: 'الانتقال للوحة التحكم',
  },
  {
    pattern: /(?:افتح|روح|اذهب|اذهب الى|رايح|خذني|وديني|open|go to|go|navigate|show|display)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:tenants|العيادات|العملاء|المستأجرين|تينانت|التينانت|عيادات)/i,
    action: { type: 'NAVIGATE', target: '/system/tenants', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to tenants',
    descriptionAr: 'الانتقال لصفحة العيادات',
  },
  {
    pattern: /(?:افتح|روح|اذهب|اذهب الى|رايح|خذني|وديني|open|go to|go|navigate|show|display)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:users|المستخدمين|مستخدمين|platform users|مستخدمي النظام|مستخدمى النظام|يوزرز|اليوزرز)/i,
    action: { type: 'NAVIGATE', target: '/system/administration/users', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to Platform Users',
    descriptionAr: 'الانتقال لصفحة مستخدمي النظام',
  },
  {
    pattern: /(?:افتح|روح|اذهب|اذهب الى|رايح|خذني|وديني|open|go to|go|navigate|show|display)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:roles|الأدوار|الادوار|الصلاحيات|صلاحيات|permissions|أدوار|ادوار|رولز|الرولز)/i,
    action: { type: 'NAVIGATE', target: '/system/administration/roles', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to Roles & Permissions',
    descriptionAr: 'الانتقال لصفحة الأدوار والصلاحيات',
  },
  {
    pattern: /(?:افتح|روح|اذهب|اذهب الى|رايح|خذني|وديني|open|go to|go|navigate|show|display)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:settings|الإعدادات|الاعدادات|اعدادات|سيتينجز|السيتينجز|ضبط|اعداد)/i,
    action: { type: 'NAVIGATE', target: '/system/settings', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to settings',
    descriptionAr: 'الانتقال للإعدادات',
  },
  // Create patterns
  {
    pattern: /(?:أضف|أنشئ|إنشاء|create|add|new)\s*(?:مستخدم|user)/i,
    action: { type: 'NAVIGATE', target: '/system/administration/users/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create user',
    descriptionAr: 'الانتقال لإنشاء مستخدم',
  },
  {
    pattern: /(?:أضف|أنشئ|إنشاء|create|add|new)\s*(?:عيادة|tenant)/i,
    action: { type: 'NAVIGATE', target: '/system/tenants/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create tenant',
    descriptionAr: 'الانتقال لإنشاء عيادة',
  },
  {
    pattern: /(?:أضف|أنشئ|إنشاء|create|add|new)\s*(?:دور|role)/i,
    action: { type: 'NAVIGATE', target: '/system/administration/roles', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create role',
    descriptionAr: 'الانتقال لإنشاء دور',
  },
];

// APP panel command patterns (Layer 1 for APP panel)
const APP_COMMAND_PATTERNS: {
  pattern: RegExp;
  action: Omit<AgiAction, 'description' | 'descriptionAr'>;
  descriptionEn: string;
  descriptionAr: string;
}[] = [
  // Navigation — Dashboard
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:dashboard|لوحة التحكم|لوحه التحكم|الرئيسية|الرئيسيه|داشبورد|الداشبورد)/i,
    action: { type: 'NAVIGATE', target: '/app/dashboard', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to dashboard',
    descriptionAr: 'الانتقال للوحة التحكم',
  },
  // Navigation — Branches
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:branches|الفروع|فروع|branch|فرع)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/branches', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to branches',
    descriptionAr: 'الانتقال لصفحة الفروع',
  },
  // Navigation — Users
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:users|المستخدمين|مستخدمين|يوزرز)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/users', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to users',
    descriptionAr: 'الانتقال لصفحة المستخدمين',
  },
  // Navigation — Roles
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:roles|الأدوار|الادوار|صلاحيات|رولز|ادوار)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/roles', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to roles',
    descriptionAr: 'الانتقال لصفحة الأدوار',
  },
  // Navigation — Business Lines
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:business.?lines?|خطوط عمل|خطوط أعمال|بزنس)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/business-lines', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to business lines',
    descriptionAr: 'الانتقال لصفحة خطوط الأعمال',
  },
  // Navigation — Settings
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:settings|الإعدادات|الاعدادات|اعدادات|سيتينجز)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/settings', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to settings',
    descriptionAr: 'الانتقال للإعدادات',
  },
  // Navigation — Patients
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:patients|المرضى|مرضى|حيوانات)/i,
    action: { type: 'NAVIGATE', target: '/app/patients', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to patients',
    descriptionAr: 'الانتقال لصفحة المرضى',
  },
  // Navigation — Appointments
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:appointments|المواعيد|مواعيد)/i,
    action: { type: 'NAVIGATE', target: '/app/appointments', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to appointments',
    descriptionAr: 'الانتقال لصفحة المواعيد',
  },
  // Navigation — Reports
  {
    pattern: /(?:افتح|روح|اذهب|خذني|وديني|open|go to|go|navigate|show)\s*(?:صفحة|صفحه|شاشة|شاشه|page|screen)?\s*(?:الـ?|ال)?(?:reports|التقارير|تقارير)/i,
    action: { type: 'NAVIGATE', target: '/app/reports', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to reports',
    descriptionAr: 'الانتقال لصفحة التقارير',
  },
  // Create — User
  {
    pattern: /(?:أضف|أنشئ|إنشاء|انشاء|انشئ|create|add|new)\s*(?:مستخدم|user)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/users/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create user',
    descriptionAr: 'الانتقال لإنشاء مستخدم',
  },
  // Create — Branch
  {
    pattern: /(?:أضف|أنشئ|إنشاء|انشاء|انشئ|create|add|new)\s*(?:فرع|branch)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/branches/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create branch',
    descriptionAr: 'الانتقال لإنشاء فرع',
  },
  // Create — Role
  {
    pattern: /(?:أضف|أنشئ|إنشاء|انشاء|انشئ|create|add|new)\s*(?:دور|role)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/roles/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create role',
    descriptionAr: 'الانتقال لإنشاء دور',
  },
  // Create — Business Line
  {
    pattern: /(?:أضف|أنشئ|إنشاء|انشاء|انشئ|create|add|new)\s*(?:خط عمل|خط أعمال|business.?line)/i,
    action: { type: 'NAVIGATE', target: '/app/administration/business-lines/create', isDestructive: false, requiresApproval: false, riskLevel: 'LOW' },
    descriptionEn: 'Navigate to create business line',
    descriptionAr: 'الانتقال لإنشاء خط عمل',
  },
];

// READ verb groups for pattern matching
// Group 1: Query verbs — "ما الفروع؟" / "show branches"
// Group 2: Selection verbs — "اختر فرع" / "choose a branch" (used during form fill)
const READ_QUERY_VERBS = '(?:ما|ايش|شو|كم|عرض|اعرض|اعرضلي|ورني|show|list|what|how many|عدد|اعداد|أعداد|وضح|وريني)';
const READ_SELECT_VERBS = '(?:اختر|اختار|حط|خلي|حدد|choose|pick|select|any|اي|أي)';

// READ patterns — Layer 0.5 (data queries, higher priority than navigation)
const READ_PATTERNS: {
  pattern: RegExp;
  entity: string;
  descriptionEn: string;
  descriptionAr: string;
}[] = [
  // Branches — query: "ما الفروع" / selection: "اختر اي فرع"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:الفروع|فروع|branches|branch)`, 'i'),
    entity: 'branches',
    descriptionEn: 'Querying branches...',
    descriptionAr: 'جاري استعلام الفروع...',
  },
  {
    pattern: new RegExp(`${READ_SELECT_VERBS}.*(?:الفروع|فروع|فرع|branches|branch)`, 'i'),
    entity: 'branches',
    descriptionEn: 'Fetching available branches...',
    descriptionAr: 'جاري عرض الفروع المتاحة...',
  },
  // Users — query: "ما المستخدمين"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:المستخدمين|مستخدمين|users|user)`, 'i'),
    entity: 'users',
    descriptionEn: 'Querying users...',
    descriptionAr: 'جاري استعلام المستخدمين...',
  },
  // Business Lines — query: "ما خطوط العمل" / selection: "اختر خط عمل"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:خطوط عمل|خطوط أعمال|خطوط|business.?lines?)`, 'i'),
    entity: 'business-lines',
    descriptionEn: 'Querying business lines...',
    descriptionAr: 'جاري استعلام خطوط الأعمال...',
  },
  {
    pattern: new RegExp(`${READ_SELECT_VERBS}.*(?:خطوط عمل|خطوط أعمال|خط عمل|business.?lines?)`, 'i'),
    entity: 'business-lines',
    descriptionEn: 'Fetching available business lines...',
    descriptionAr: 'جاري عرض خطوط الأعمال المتاحة...',
  },
  // Roles — query: "ما الأدوار"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:الادوار|أدوار|ادوار|صلاحيات|roles|role)`, 'i'),
    entity: 'roles',
    descriptionEn: 'Querying roles...',
    descriptionAr: 'جاري استعلام الأدوار...',
  },
];

// Detect language from text
function detectLanguage(text: string): 'en' | 'ar' {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
}

// ============================================
// SMART INTENT MATCHING SYSTEM (Layer 2)
// Fuzzy keyword matching with Levenshtein Distance
// ============================================

// Expanded navigation keywords for all panels (used by Layer 2 fuzzy matching)
// These are merged from PANEL_ROUTES + additional synonyms for better fuzzy matching
const NAVIGATION_KEYWORDS_EXPANDED: Record<string, { ar: string[]; en: string[] }> = {
  // System panel
  '/system/dashboard': { ar: ['داشبورد', 'لوحة', 'رئيسية', 'الرئيسيه', 'الرئيسية', 'تحكم', 'البداية', 'هوم', 'بداية'], en: ['dashboard', 'home', 'main', 'start', 'homepage'] },
  '/system/tenants': { ar: ['عيادات', 'عملاء', 'تينانت', 'مستأجرين', 'كلاينت', 'العيادات', 'عيادة'], en: ['tenants', 'clinics', 'clients', 'tenant', 'clinic'] },
  '/system/administration/users': { ar: ['مستخدمين', 'مستخدمي', 'يوزرز', 'مستخدم', 'ناس', 'المستخدمين', 'يوزر', 'حسابات'], en: ['users', 'people', 'accounts', 'members', 'user', 'platform'] },
  '/system/administration/roles': { ar: ['ادوار', 'أدوار', 'صلاحيات', 'رولز', 'دور', 'صلاحية', 'الادوار', 'الصلاحيات'], en: ['roles', 'permissions', 'access', 'rights', 'role', 'permission'] },
  '/system/settings': { ar: ['اعدادات', 'إعدادات', 'سيتينجز', 'ضبط', 'تهيئة', 'الاعدادات'], en: ['settings', 'config', 'preferences', 'options', 'configuration'] },
  '/system/dpf': { ar: ['دي بي اف', 'هيكل', 'الهيكل'], en: ['dpf', 'structure', 'framework'] },
  '/system/metrics': { ar: ['مقاييس', 'احصائيات', 'ميتريكس', 'المقاييس', 'تقارير'], en: ['metrics', 'statistics', 'stats', 'reports', 'analytics'] },
  '/system/ai': { ar: ['ذكاء', 'اصطناعي', 'الذكاء'], en: ['ai', 'artificial', 'intelligence'] },
  // App panel — administration
  '/app/dashboard': { ar: ['داشبورد', 'رئيسية', 'لوحة', 'تحكم', 'البداية', 'هوم', 'بداية'], en: ['dashboard', 'home', 'main', 'start'] },
  '/app/administration/business-lines': { ar: ['خطوط عمل', 'خط عمل', 'خطوط أعمال', 'بزنس لاين', 'خطوط'], en: ['business lines', 'business line', 'lines'] },
  '/app/administration/branches': { ar: ['فروع', 'فرع', 'الفروع', 'فرعنا', 'فروعنا', 'المواقع'], en: ['branches', 'branch', 'locations', 'offices'] },
  '/app/administration/users': { ar: ['مستخدمين', 'يوزرز', 'مستخدم', 'المستخدمين', 'يوزر', 'حسابات', 'ناس'], en: ['users', 'people', 'accounts', 'members', 'user'] },
  '/app/administration/roles': { ar: ['ادوار', 'أدوار', 'صلاحيات', 'رولز', 'دور', 'صلاحية', 'الادوار'], en: ['roles', 'permissions', 'access', 'rights', 'role'] },
  '/app/administration/settings': { ar: ['اعدادات', 'إعدادات', 'سيتينجز', 'ضبط', 'تهيئة', 'الاعدادات'], en: ['settings', 'config', 'preferences', 'options'] },
  // App panel — domain pages
  '/app/patients': { ar: ['مرضى', 'حيوانات', 'مريض', 'حيوان', 'المرضى'], en: ['patients', 'animals', 'patient'] },
  '/app/appointments': { ar: ['مواعيد', 'موعد', 'المواعيد'], en: ['appointments', 'appointment', 'schedule'] },
  '/app/tasks': { ar: ['مهام', 'مهمة', 'المهام'], en: ['tasks', 'task', 'todos'] },
  '/app/reports': { ar: ['تقارير', 'تقرير', 'التقارير'], en: ['reports', 'report'] },
  '/app/my-profile': { ar: ['ملفي', 'بروفايل', 'حسابي', 'بروفايلي'], en: ['profile', 'my profile', 'account'] },
};

// Navigation verbs that indicate user wants to go somewhere
const NAVIGATION_VERBS = {
  ar: ['افتح', 'روح', 'اذهب', 'ارجع', 'رجعني', 'خذني', 'وديني', 'ورني', 'عرض', 'شوف', 'فتح', 'اظهر', 'ودني', 'رايح', 'اروح', 'اريد', 'عايز', 'ابي', 'بغيت'],
  en: ['open', 'go', 'navigate', 'show', 'display', 'back', 'return', 'take', 'view', 'want', 'need'],
};

/**
 * Calculate Levenshtein Distance between two strings
 * Returns the minimum number of single-character edits required
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,     // deletion
        matrix[i - 1][j] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Exact match (case insensitive)
  if (aLower === bLower) return 1;

  // Check if one contains the other
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return 0.9;
  }

  const distance = levenshteinDistance(aLower, bLower);
  const maxLength = Math.max(a.length, b.length);
  return (maxLength - distance) / maxLength;
}

/**
 * Check if input contains a navigation verb
 */
function hasNavigationIntent(input: string, language: 'ar' | 'en'): boolean {
  const verbs = NAVIGATION_VERBS[language];
  const inputLower = input.toLowerCase();

  return verbs.some(verb => {
    // Check exact word match or start of word
    return inputLower.includes(verb) || similarityScore(inputLower, verb) > 0.7;
  });
}

/**
 * Smart Intent Matching - Layer 2
 * Uses fuzzy keyword matching to understand user intent
 * Panel-aware: filters to current module's routes when available
 */
function smartIntentMatch(input: string, language: 'ar' | 'en', currentModule?: string): { route: string; confidence: number; keyword: string } | null {
  // Clean and split input into words
  const words = input
    .replace(/[^\u0600-\u06FF\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 1);

  let bestMatch: { route: string; confidence: number; keyword: string } | null = null;

  // Determine which routes to search — prioritize current panel
  const panelRoutes = currentModule ? PANEL_ROUTES[currentModule] : undefined;
  const searchKeywords = panelRoutes
    ? Object.fromEntries(
        Object.entries(NAVIGATION_KEYWORDS_EXPANDED).filter(([route]) =>
          Object.keys(panelRoutes).some(pr => route === pr)
        )
      )
    : NAVIGATION_KEYWORDS_EXPANDED;

  // Check each navigation target
  for (const [route, keywords] of Object.entries(searchKeywords)) {
    const langKeywords = keywords[language] || [];

    for (const word of words) {
      for (const keyword of langKeywords) {
        const similarity = similarityScore(word, keyword);

        // Accept matches with confidence > 65%
        if (similarity > 0.65 && (!bestMatch || similarity > bestMatch.confidence)) {
          bestMatch = { route, confidence: similarity, keyword };
        }
      }
    }
  }

  return bestMatch;
}

export class AGIEngine {
  private anthropic: Anthropic | null = null;
  private isInitialized = false;

  /**
   * Initialize the Claude client
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('✅ AGI Engine initialized with Claude API');
    } else {
      console.log('⚠️ AGI Engine running in pattern-matching mode (no API key)');
    }
    this.isInitialized = true;
  }

  /**
   * Check if Claude is available
   */
  async isClaudeAvailable(): Promise<boolean> {
    await this.initialize();
    return this.anthropic !== null;
  }

  /**
   * Process a chat message
   */
  async processChat(
    tenantId: string,
    userId: string,
    request: AgiChatRequest
  ): Promise<AgiChatResponse> {
    await this.initialize();

    const startTime = Date.now();
    const language = detectLanguage(request.message);
    let wasPatternMatched = false;
    let wasClaude = false;

    try {
      // Check if AI is enabled for this tenant
      const isEnabled = await AgiSettingsService.isAiEnabled(tenantId);
      if (!isEnabled) {
        return {
          success: false,
          message: this.createMessage('assistant', language === 'ar'
            ? 'خدمة الذكاء الاصطناعي غير مفعلة لهذا الحساب'
            : 'AI service is not enabled for this account'),
          error: 'AI_DISABLED',
        };
      }

      const currentModule = request.context?.currentModule;

      // Try pattern matching first (fast, no API cost)
      const patternResult = this.tryPatternMatching(request.message, language, currentModule);
      if (patternResult) {
        wasPatternMatched = true;

        // Permission check for non-NAVIGATE actions
        const permCheck = await this.checkPermission(userId, tenantId, patternResult, language);
        if (!permCheck.granted) {
          return {
            success: true,
            message: this.createMessage('assistant', permCheck.message!),
          };
        }

        // === READ action: execute and return data in chat ===
        if (patternResult.type === 'READ') {
          const readResult = await actionExecutor.execute(tenantId, userId, patternResult);
          const responseMessage = language === 'ar' ? readResult.messageAr : readResult.message;

          // Log and track
          await Promise.all([
            AgiLogsService.logChat({
              tenantId,
              userId,
              inputCommand: request.message,
              inputLanguage: language,
              parsedIntent: { pattern: 'read', entity: patternResult.target },
              status: readResult.success ? 'SUCCESS' : 'FAILED',
              processingTimeMs: Date.now() - startTime,
              wasPatternMatched: true,
              wasClaude: false,
            }),
            AgiUsageService.recordUsage({
              tenantId,
              userId,
              requestType: 'CHAT',
              inputTokens: 0,
              outputTokens: 0,
              model: 'pattern-matching',
              processingTimeMs: Date.now() - startTime,
              wasPatternMatched: true,
              wasClaude: false,
              pageContext: request.context?.currentPage,
              locale: language,
            }),
          ]);

          return {
            success: true,
            message: this.createMessage('assistant', responseMessage),
            data: readResult.data,
            formFillState: request.formFillState || undefined,
          };
        }

        // === Non-READ pattern match (NAVIGATE, etc.) ===
        // Log and track usage
        await Promise.all([
          AgiLogsService.logChat({
            tenantId,
            userId,
            inputCommand: request.message,
            inputLanguage: language,
            parsedIntent: { pattern: 'matched', action: patternResult },
            status: 'SUCCESS',
            processingTimeMs: Date.now() - startTime,
            wasPatternMatched: true,
            wasClaude: false,
          }),
          AgiUsageService.recordUsage({
            tenantId,
            userId,
            requestType: 'CHAT',
            inputTokens: 0,
            outputTokens: 0,
            model: 'pattern-matching',
            processingTimeMs: Date.now() - startTime,
            wasPatternMatched: true,
            wasClaude: false,
            pageContext: request.context?.currentPage,
            locale: language,
          }),
        ]);

        return {
          success: true,
          message: this.createMessage('assistant', patternResult.description),
          action: patternResult,
        };
      }

      // If no Claude API, return limited mode message
      if (!this.anthropic) {
        const limitedMessage = language === 'ar'
          ? 'أنا ذكي! حالياً في الوضع المحدود. يمكنني مساعدتك في:\n• التنقل بين الصفحات\n• الأوامر البسيطة\n\nجرب: "افتح صفحة المستخدمين"'
          : 'I\'m Zaki! Currently in limited mode. I can help you with:\n• Navigation\n• Simple commands\n\nTry: "open users page"';

        return {
          success: true,
          message: this.createMessage('assistant', limitedMessage),
        };
      }

      // Use Claude for complex requests
      wasClaude = true;
      const settings = await AgiSettingsService.getSettings(tenantId);
      const model = settings.defaultModel || 'claude-sonnet-4-20250514';

      // Check if this is a confirmed form fill action — execute directly
      if (request.formFillState?.isComplete && request.formFillState?.confirmedByUser) {
        const ffs = request.formFillState;
        const execAction: AgiAction = {
          type: 'CREATE',
          target: ffs.entity,
          params: ffs.collectedFields,
          description: `Create ${ffs.entity}`,
          descriptionAr: `إنشاء ${ffs.entity}`,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'MEDIUM',
        };

        // Permission check
        const permCheck = await this.checkPermission(userId, tenantId, execAction, language);
        if (!permCheck.granted) {
          return {
            success: true,
            message: this.createMessage('assistant', permCheck.message!),
          };
        }

        // Execute via ActionExecutor (service layer — no HTTP)
        const result = await actionExecutor.execute(tenantId, userId, execAction);
        const responseMessage = language === 'ar' ? result.messageAr : result.message;

        if (result.success) {
          return {
            success: true,
            message: this.createMessage('assistant', responseMessage),
            action: execAction,
          };
        } else {
          return {
            success: true,
            message: this.createMessage('assistant', responseMessage),
          };
        }
      }

      // Build dynamic system prompt based on context
      const systemPrompt = this.buildSystemPrompt(currentModule, language);
      let contextPrompt = '';
      if (request.context?.currentPage) {
        contextPrompt = `\n\nUser is currently on page: ${request.context.currentPage}`;
      }
      if (request.context?.locale) {
        contextPrompt += `\nPreferred language: ${request.context.locale === 'ar' ? 'Arabic' : 'English'}`;
      }

      // Include form fill state if present
      if (request.formFillState) {
        contextPrompt += `\n\nCurrent form fill state: ${JSON.stringify(request.formFillState)}`;
      }

      // Build messages array: include conversation history if available
      const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      if (request.history && request.history.length > 0) {
        for (const h of request.history) {
          if (h.role === 'user' || h.role === 'assistant') {
            claudeMessages.push({ role: h.role, content: h.content });
          }
        }
      }
      claudeMessages.push({ role: 'user', content: request.message });

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: settings.maxTokensPerRequest,
        system: systemPrompt + contextPrompt,
        messages: claudeMessages,
      });

      // Extract response
      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Try to parse action or form fill state from response
      const action = this.parseActionFromResponse(assistantMessage);
      const formFillState = this.parseFormFillFromResponse(assistantMessage);

      // Permission check for non-NAVIGATE actions
      if (action && action.type !== 'NAVIGATE') {
        const permCheck = await this.checkPermission(userId, tenantId, action, language);
        if (!permCheck.granted) {
          return {
            success: true,
            message: this.createMessage('assistant', permCheck.message!),
          };
        }
      }

      // Log and track usage
      const processingTimeMs = Date.now() - startTime;
      await Promise.all([
        AgiLogsService.logChat({
          tenantId,
          userId,
          inputCommand: request.message,
          inputLanguage: language,
          parsedIntent: { action, response: assistantMessage.substring(0, 200) },
          status: 'SUCCESS',
          processingTimeMs,
          wasPatternMatched: false,
          wasClaude: true,
        }),
        AgiUsageService.recordUsage({
          tenantId,
          userId,
          requestType: 'CHAT',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model,
          processingTimeMs,
          wasPatternMatched: false,
          wasClaude: true,
          pageContext: request.context?.currentPage,
          locale: language,
        }),
      ]);

      // Check if action requires approval
      if (action && action.requiresApproval) {
        const approval = await AgiApprovalsService.createApproval(tenantId, userId, {
          action,
          originalMessage: request.message,
        });

        return {
          success: true,
          message: this.createMessage('assistant', language === 'ar'
            ? `العملية تحتاج موافقة. تم إنشاء طلب موافقة رقم: ${approval.id.substring(0, 8)}`
            : `This action requires approval. Approval request created: ${approval.id.substring(0, 8)}`),
          action,
          requiresApproval: true,
          approvalId: approval.id,
        };
      }

      // Clean message: remove JSON blocks from display text
      const cleanMessage = assistantMessage
        .replace(/\{[\s\S]*"type"\s*:\s*"(?:ACTION|FORM_FILL)"[\s\S]*\}/g, '')
        .trim();

      return {
        success: true,
        message: this.createMessage('assistant', action ? action.description : (cleanMessage || assistantMessage)),
        action: action || undefined,
        formFillState,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error
      await AgiLogsService.logError({
        tenantId,
        userId,
        operation: 'CHAT',
        error: errorMessage,
        metadata: { request: request.message },
      });

      return {
        success: false,
        message: this.createMessage('assistant', language === 'ar'
          ? 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while processing your request. Please try again.'),
        error: errorMessage,
      };
    }
  }

  /**
   * Stream a chat response (for real-time UI updates)
   */
  async *streamChat(
    tenantId: string,
    userId: string,
    request: AgiChatRequest
  ): AsyncGenerator<AgiStreamChunk> {
    await this.initialize();

    const language = detectLanguage(request.message);

    // Try pattern matching first
    const patternResult = this.tryPatternMatching(request.message, language);
    if (patternResult) {
      yield { type: 'text', content: patternResult.description };
      yield { type: 'action', action: patternResult };
      yield { type: 'done' };
      return;
    }

    // If no Claude, yield limited mode message
    if (!this.anthropic) {
      yield {
        type: 'text',
        content: language === 'ar'
          ? 'أنا ذكي! حالياً في الوضع المحدود...'
          : 'I\'m Zaki! Currently in limited mode...',
      };
      yield { type: 'done' };
      return;
    }

    try {
      const settings = await AgiSettingsService.getSettings(tenantId);
      const systemPrompt = this.buildSystemPrompt(request.context?.currentModule);

      const stream = await this.anthropic.messages.stream({
        model: settings.defaultModel || 'claude-sonnet-4-20250514',
        max_tokens: settings.maxTokensPerRequest,
        system: systemPrompt,
        messages: [{ role: 'user', content: request.message }],
      });

      let fullResponse = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullResponse += event.delta.text;
          yield { type: 'text', content: event.delta.text };
        }
      }

      // Try to parse action at the end
      const action = this.parseActionFromResponse(fullResponse);
      if (action) {
        yield { type: 'action', action };
      }

      yield { type: 'done' };

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Stream error',
      };
    }
  }

  /**
   * Try to match input against known patterns
   * Layer 0.5: READ Patterns (data queries — highest priority)
   * Layer 1: Regex Pattern Matching (navigation/create — panel-aware)
   * Layer 2: Smart Intent Matching (fuzzy, panel-aware)
   */
  private tryPatternMatching(input: string, language: 'en' | 'ar', currentModule?: string): AgiAction | null {
    // ===== LAYER 0.5: READ Patterns (data queries) =====
    // "ما الفروع" = data query, NOT navigation — must check BEFORE navigation patterns
    for (const readPattern of READ_PATTERNS) {
      if (readPattern.pattern.test(input)) {
        console.log(`📊 Zaki Layer 0.5 READ Match: ${readPattern.entity}`);
        return {
          type: 'READ',
          target: readPattern.entity,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: language === 'ar' ? readPattern.descriptionAr : readPattern.descriptionEn,
          descriptionAr: readPattern.descriptionAr,
        };
      }
    }

    // ===== LAYER 1: Regex Pattern Matching (fast, exact) =====
    // Select the right pattern set based on current panel
    const patterns = (!currentModule || currentModule === 'SYSTEM')
      ? COMMAND_PATTERNS
      : APP_COMMAND_PATTERNS;

    for (const pattern of patterns) {
      if (pattern.pattern.test(input)) {
        console.log(`🎯 Zaki Layer 1 Match: ${pattern.action.target} (panel: ${currentModule || 'SYSTEM'})`);
        return {
          ...pattern.action,
          description: language === 'ar' ? pattern.descriptionAr : pattern.descriptionEn,
          descriptionAr: pattern.descriptionAr,
        };
      }
    }

    // ===== LAYER 2: Smart Intent Matching (fuzzy keywords, panel-aware) =====
    if (hasNavigationIntent(input, language)) {
      const smartMatch = smartIntentMatch(input, language, currentModule);

      if (smartMatch && smartMatch.confidence > 0.65) {
        console.log(`🧠 Zaki Layer 2 Smart Match: ${smartMatch.route} (confidence: ${(smartMatch.confidence * 100).toFixed(1)}%, keyword: "${smartMatch.keyword}", panel: ${currentModule || 'ALL'})`);

        // Route description from route path
        const routeName = smartMatch.route.split('/').pop() || '';
        const desc = {
          en: `Navigate to ${routeName.charAt(0).toUpperCase() + routeName.slice(1).replace(/-/g, ' ')}`,
          ar: `الانتقال إلى ${smartMatch.keyword}`,
        };

        return {
          type: 'NAVIGATE',
          target: smartMatch.route,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: language === 'ar' ? desc.ar : desc.en,
          descriptionAr: desc.ar,
        };
      }
    }

    // No match found - will fall through to Claude API (Layer 3)
    console.log(`🤖 Zaki: No pattern/smart match found, will use Claude API`);
    return null;
  }

  /**
   * Check DPF permission for an AI action
   * Returns { granted: true } or { granted: false, message: string }
   */
  private async checkPermission(
    userId: string,
    tenantId: string,
    action: AgiAction,
    language: 'en' | 'ar'
  ): Promise<{ granted: boolean; message?: string }> {
    // NAVIGATE actions don't require screen permission checks
    if (action.type === 'NAVIGATE') {
      return { granted: true };
    }

    const screenCode = ACTION_SCREEN_MAP[action.target];
    if (!screenCode) {
      // Unknown entity — allow (will fail at service layer if invalid)
      return { granted: true };
    }

    // READ needs ReadOnly(1), everything else needs Full(2)
    const requiredLevel = action.type === 'READ' ? 'read' : 'write';

    const hasAccess = await checkScreenAccess(userId, tenantId, screenCode, requiredLevel);
    if (hasAccess) {
      return { granted: true };
    }

    return {
      granted: false,
      message: language === 'ar'
        ? 'ليس لديك صلاحية لهذا الإجراء. تواصل مع الأدمن.'
        : 'You do not have permission for this action. Contact your admin.',
    };
  }

  /**
   * Build a dynamic system prompt based on context
   * Includes panel-aware pages and entity metadata for form fill
   */
  private buildSystemPrompt(currentModule?: string, language: 'en' | 'ar' = 'en'): string {
    let prompt = BASE_SYSTEM_PROMPT;

    // Add available pages based on current panel
    const panelRoutes = currentModule ? PANEL_ROUTES[currentModule] : PANEL_ROUTES['SYSTEM'];
    if (panelRoutes) {
      prompt += '\n\nالصفحات المتاحة / Available pages:\n';
      for (const [route, keywords] of Object.entries(panelRoutes)) {
        prompt += `- ${route} — ${keywords.ar[0]} / ${keywords.en[0]}\n`;
      }
    }

    // Add entity metadata for form fill capabilities
    prompt += '\n\n' + buildEntityPromptSection(language);

    return prompt;
  }

  /**
   * Parse action from Claude response
   */
  private parseActionFromResponse(response: string): AgiAction | null {
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*"type"\s*:\s*"ACTION"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.type === 'ACTION' && parsed.action) {
          return parsed.action as AgiAction;
        }
      }
    } catch {
      // Not valid JSON, return null
    }
    return null;
  }

  /**
   * Parse form fill state from Claude response
   */
  private parseFormFillFromResponse(response: string): AgiFormFillState | undefined {
    try {
      const jsonMatch = response.match(/\{[\s\S]*"type"\s*:\s*"FORM_FILL"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.type === 'FORM_FILL' && parsed.formFillState) {
          return parsed.formFillState as AgiFormFillState;
        }
      }
    } catch {
      // Not valid JSON, return undefined
    }
    return undefined;
  }

  /**
   * Create a message object
   */
  private createMessage(role: 'user' | 'assistant', content: string): AgiMessage {
    return {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
  }

  /**
   * Process voice input (placeholder for future implementation)
   */
  async processVoice(audioData: Buffer): Promise<string> {
    // TODO: Implement voice-to-text using Whisper or similar
    return 'Voice processing not yet implemented';
  }
}

// Export singleton instance
export const agiEngine = new AGIEngine();
