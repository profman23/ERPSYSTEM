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
import { buildEntityPromptSection, getEntityMeta } from './entityMetadata';
import { HierarchyService } from '../../services/HierarchyService';
import type { EntityFieldDef } from './entityMetadata';
import type {
  AgiChatRequest,
  AgiChatResponse,
  AgiMessage,
  AgiAction,
  ParsedCommand,
  AgiStreamChunk,
  AgiFormFillState,
} from '../../../../types/agi';

// Language-specific system prompts — NEVER bilingual to prevent language mixing
const BASE_SYSTEM_PROMPT_AR = `أنت "ذكي"، المساعد الذكي لنظام إدارة العيادات البيطرية.
عرّف نفسك دائماً بـ "ذكي" وكن ودوداً ومهنياً.

المهام المتاحة:
- إدارة المستخدمين والصلاحيات
- إدارة المؤسسات والفروع
- التنقل بين الصفحات
- الإجابة على الاستفسارات
- إنشاء سجلات جديدة عبر محادثة تفاعلية

قواعد:
1. احترم صلاحيات المستخدم — لا تنفذ ما ليس له صلاحية عليه
2. اطلب التأكيد قبل العمليات الحساسة (حذف، تعديل جماعي)
3. كن موجزاً ومفيداً
4. إذا طلب إنشاء كيان وحقول ناقصة ← استخدم أداة collect_form_data واسأل عن كل حقل مطلوب واحد تلو الآخر
5. لما كل الحقول الإلزامية جاهزة ← اعرض ملخص البيانات واستخدم collect_form_data مع is_complete=true واطلب تأكيد المستخدم
6. عندما يؤكد المستخدم (نعم/تمام/أيوه) ← استخدم أداة create_entity لإنشاء السجل
7. لعرض بيانات (فروع، مستخدمين...) ← استخدم أداة read_data
8. للتنقل لصفحة ← استخدم أداة navigate_to

تعليمات حرجة:
- ⚠️ يجب أن تكون كل ردودك بالعربية فقط. لا تكتب أي كلمة إنجليزية أبداً. حتى لو أسماء الحقول التقنية بالإنجليزية في الأدوات، اعرضها للمستخدم بالعربي فقط.
- استخدم الأدوات المتاحة بدلاً من كتابة JSON في ردودك
- ردك النصي يجب أن يكون رسالة طبيعية للمستخدم فقط
- للردود العادية (تحية، سؤال عام) أجب بنص عادي بدون استدعاء أي أداة`;

const BASE_SYSTEM_PROMPT_EN = `You are "Zaki", the intelligent assistant for the Veterinary ERP system.
Always introduce yourself as "Zaki" and be friendly and professional.

Available tasks:
- User and permission management
- Tenant and branch management
- Navigation between pages
- Answering questions
- Creating new records via interactive conversation

Rules:
1. Respect user permissions — don't execute what they don't have permission for
2. Ask for confirmation before destructive operations
3. Be concise and helpful
4. If creating an entity with missing fields → use collect_form_data tool and ask for each required field one by one
5. When all required fields are ready → show a summary, use collect_form_data with is_complete=true, and ask for confirmation
6. When the user confirms (yes/ok/sure) → use create_entity tool to create the record
7. To display data (branches, users...) → use read_data tool
8. For navigation → use navigate_to tool

Critical instructions:
- You MUST respond ONLY in English. Never use Arabic or any other language.
- Use the available tools instead of writing JSON in your responses
- Your text response should be a natural message to the user only
- For regular responses (greeting, general question), reply with plain text without calling any tool`;

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
// Group 1: Query verbs — "ما الفروع؟" / "show branches" / "كل الفروع" / "هات الفروع"
// Group 2: Selection verbs — "اختر فرع" / "choose a branch" (used during form fill)
// Group 3: Fetch/all verbs — "كل الفروع" / "جميع الفروع" / "هات الفروع"
const READ_QUERY_VERBS = '(?:ما|ايش|شو|كم|عرض|اعرض|اعرضلي|ورني|show|list|what|how many|عدد|اعداد|أعداد|وضح|وريني)';
const READ_FETCH_VERBS = '(?:كل|كال|جميع|هات|هاتلي|جيب|جيبلي|ابي|ابغى|ابغا|طلع|طلعلي|get|fetch|all|give me|bring)';
const READ_SELECT_VERBS = '(?:اختر|اختار|حط|خلي|حدد|choose|pick|select|any|اي|أي)';

// READ patterns — Layer 0.5 (data queries, higher priority than navigation)
const READ_PATTERNS: {
  pattern: RegExp;
  entity: string;
  descriptionEn: string;
  descriptionAr: string;
}[] = [
  // Branches — query: "ما الفروع" / fetch: "كل الفروع" / selection: "اختر اي فرع"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:الفروع|فروع|branches|branch)`, 'i'),
    entity: 'branches',
    descriptionEn: 'Querying branches...',
    descriptionAr: 'جاري استعلام الفروع...',
  },
  {
    pattern: new RegExp(`${READ_FETCH_VERBS}.*(?:الفروع|فروع|فرع|branches|branch)`, 'i'),
    entity: 'branches',
    descriptionEn: 'Fetching all branches...',
    descriptionAr: 'جاري عرض كل الفروع...',
  },
  {
    pattern: new RegExp(`${READ_SELECT_VERBS}.*(?:الفروع|فروع|فرع|branches|branch)`, 'i'),
    entity: 'branches',
    descriptionEn: 'Fetching available branches...',
    descriptionAr: 'جاري عرض الفروع المتاحة...',
  },
  // Users — query: "ما المستخدمين" / fetch: "كل المستخدمين"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:المستخدمين|مستخدمين|users|user)`, 'i'),
    entity: 'users',
    descriptionEn: 'Querying users...',
    descriptionAr: 'جاري استعلام المستخدمين...',
  },
  {
    pattern: new RegExp(`${READ_FETCH_VERBS}.*(?:المستخدمين|مستخدمين|users|user)`, 'i'),
    entity: 'users',
    descriptionEn: 'Fetching all users...',
    descriptionAr: 'جاري عرض كل المستخدمين...',
  },
  // Business Lines — query: "ما خطوط العمل" / fetch: "كل خطوط العمل" / selection: "اختر خط عمل"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:خطوط عمل|خطوط أعمال|خطوط|business.?lines?)`, 'i'),
    entity: 'business-lines',
    descriptionEn: 'Querying business lines...',
    descriptionAr: 'جاري استعلام خطوط الأعمال...',
  },
  {
    pattern: new RegExp(`${READ_FETCH_VERBS}.*(?:خطوط عمل|خطوط أعمال|خطوط|business.?lines?)`, 'i'),
    entity: 'business-lines',
    descriptionEn: 'Fetching all business lines...',
    descriptionAr: 'جاري عرض كل خطوط الأعمال...',
  },
  {
    pattern: new RegExp(`${READ_SELECT_VERBS}.*(?:خطوط عمل|خطوط أعمال|خط عمل|business.?lines?)`, 'i'),
    entity: 'business-lines',
    descriptionEn: 'Fetching available business lines...',
    descriptionAr: 'جاري عرض خطوط الأعمال المتاحة...',
  },
  // Roles — query: "ما الأدوار" / fetch: "كل الأدوار"
  {
    pattern: new RegExp(`${READ_QUERY_VERBS}.*(?:الادوار|أدوار|ادوار|صلاحيات|roles|role)`, 'i'),
    entity: 'roles',
    descriptionEn: 'Querying roles...',
    descriptionAr: 'جاري استعلام الأدوار...',
  },
  {
    pattern: new RegExp(`${READ_FETCH_VERBS}.*(?:الادوار|أدوار|ادوار|صلاحيات|roles|role)`, 'i'),
    entity: 'roles',
    descriptionEn: 'Fetching all roles...',
    descriptionAr: 'جاري عرض كل الأدوار...',
  },
];

// ============================================
// CLAUDE TOOL USE — Structured Function Calling
// Industry-standard approach: Claude calls tools with structured params
// instead of outputting JSON in text (99.9% reliable vs ~70%)
// ============================================
const CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_data',
    description: 'Query and display data from the system. Use when the user asks to see, list, show, or query entities. Examples: "show branches", "كل الفروع", "ما المستخدمين", "هات الفروع", "كال الفروع"',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity: {
          type: 'string',
          enum: ['branches', 'users', 'business-lines', 'roles', 'species'],
          description: 'The entity type to query',
        },
      },
      required: ['entity'],
    },
  },
  {
    name: 'navigate_to',
    description: 'Navigate user to a page in the application. Use when user asks to open, go to, or see a specific page or screen.',
    input_schema: {
      type: 'object' as const,
      properties: {
        route: {
          type: 'string',
          description: 'The route path, e.g. "/app/administration/branches", "/system/tenants", "/app/dashboard"',
        },
      },
      required: ['route'],
    },
  },
  {
    name: 'collect_form_data',
    description: 'Track form fill progress during entity creation. Call this EVERY time you collect a new field from the user. Your text response should ask for the next missing field, or show a summary and ask for confirmation if all fields are collected.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity: {
          type: 'string',
          enum: ['users', 'branches', 'business-lines', 'species'],
          description: 'The entity being created',
        },
        collected_fields: {
          type: 'object',
          description: `All fields collected so far. CRITICAL: You MUST use these EXACT camelCase key names:
• For "users" REQUIRED: firstName, lastName, email, password (min 8 chars), role (e.g. admin/doctor/receptionist), branchId (UUID). OPTIONAL: phone, accessScope
• For "branches" REQUIRED: name, businessLineId (UUID), country, city, address, buildingNumber, vatRegistrationNumber, commercialRegistrationNumber. OPTIONAL: phone, email, district, postalCode, timezone
• For "business-lines" REQUIRED: name, tenantId (UUID). OPTIONAL: businessLineType, description, contactEmail, contactPhone
• For "species" REQUIRED: name, nameAr. OPTIONAL: description
NEVER use Arabic labels, snake_case, or any other format as keys.`,
        },
        missing_fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required field names still needed (use EXACT camelCase names from collected_fields spec above)',
        },
        is_complete: {
          type: 'boolean',
          description: 'True when ALL required fields have been collected',
        },
        confirmed_by_user: {
          type: 'boolean',
          description: 'True ONLY when user explicitly confirmed creation (said yes/نعم/تمام)',
        },
      },
      required: ['entity', 'collected_fields', 'missing_fields', 'is_complete', 'confirmed_by_user'],
    },
  },
  {
    name: 'create_entity',
    description: 'Create a new record in the system. ONLY call this after ALL required fields are collected AND the user explicitly confirmed (said yes/نعم/تمام). NEVER call without user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity: {
          type: 'string',
          enum: ['users', 'branches', 'business-lines', 'species'],
          description: 'The entity type to create',
        },
        data: {
          type: 'object',
          description: `Complete entity data. CRITICAL: Use EXACT camelCase key names:
• "users" REQUIRED: firstName, lastName, email, password (min 8 chars), role, branchId (must be UUID)
• "branches" REQUIRED: name, businessLineId (UUID), country, city, address, buildingNumber, vatRegistrationNumber, commercialRegistrationNumber
• "business-lines" REQUIRED: name, tenantId (UUID)
• "species" REQUIRED: name, nameAr
If branchId or businessLineId is a name (not UUID), use the UUID from earlier read_data results.`,
        },
      },
      required: ['entity', 'data'],
    },
  },
];

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Resolve branch name/number to UUID via HierarchyService
async function resolveBranchByName(tenantId: string, nameOrIndex: string): Promise<string | null> {
  try {
    const hierarchy = await HierarchyService.getTenantHierarchy(tenantId);
    if (!hierarchy) return null;

    const allBranches: { id: string; name: string }[] = [];
    for (const bl of hierarchy.businessLines) {
      for (const branch of bl.branches) {
        allBranches.push({ id: (branch as any).id, name: branch.name });
      }
    }

    // Try numeric index (user said "1", "2", etc.)
    const idx = parseInt(nameOrIndex, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= allBranches.length) {
      return allBranches[idx - 1].id;
    }

    // Try name match (case-insensitive, partial)
    const lower = nameOrIndex.toLowerCase();
    const match = allBranches.find(b => b.name.toLowerCase() === lower)
      || allBranches.find(b => b.name.toLowerCase().includes(lower));
    return match?.id || null;
  } catch {
    return null;
  }
}

// Resolve business line name/number to UUID
async function resolveBusinessLineByName(tenantId: string, nameOrIndex: string): Promise<string | null> {
  try {
    const hierarchy = await HierarchyService.getTenantHierarchy(tenantId);
    if (!hierarchy) return null;

    const bls = hierarchy.businessLines.map(bl => ({ id: (bl as any).id, name: bl.name }));

    const idx = parseInt(nameOrIndex, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= bls.length) {
      return bls[idx - 1].id;
    }

    const lower = nameOrIndex.toLowerCase();
    const match = bls.find(b => b.name.toLowerCase() === lower)
      || bls.find(b => b.name.toLowerCase().includes(lower));
    return match?.id || null;
  } catch {
    return null;
  }
}

// Detect language from text — with conversation history fallback
// During form fill, messages like emails/passwords/names have no Arabic chars
// but the conversation language should stay Arabic. Always check history.
function detectLanguage(text: string, history?: { role: string; content: string }[]): 'en' | 'ar' {
  const arabicPattern = /[\u0600-\u06FF]/;

  // Current message has clear Arabic signal
  if (arabicPattern.test(text)) return 'ar';

  // No Arabic in current message → check conversation history
  // This handles: emails, passwords, names, numbers, "ok", etc.
  if (history && history.length > 0) {
    const recentUserMsgs = history.filter(h => h.role === 'user').slice(-8);
    const arabicCount = recentUserMsgs.filter(m => arabicPattern.test(m.content)).length;
    // If ANY recent user message was Arabic, stay Arabic
    if (arabicCount > 0) return 'ar';
  }

  return 'en';
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
    const language = detectLanguage(request.message, request.history);
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

      // NOTE: Server-side CONFIRM_PATTERN removed.
      // Claude handles confirmation via create_entity tool — 100% reliable field names.
      // formFillState is passed in system prompt context so Claude knows what was collected.

      // Build dynamic system prompt based on context
      const systemPrompt = this.buildSystemPrompt(currentModule, language);
      let contextPrompt = '';
      if (request.context?.currentPage) {
        contextPrompt = language === 'ar'
          ? `\n\nالمستخدم حالياً في صفحة: ${request.context.currentPage}`
          : `\n\nUser is currently on page: ${request.context.currentPage}`;
      }

      // Include form fill state if present (so Claude knows what's been collected)
      if (request.formFillState) {
        contextPrompt += language === 'ar'
          ? `\n\nحالة تعبئة النموذج الحالية: ${JSON.stringify(request.formFillState)}\nأكمل جمع الحقول الناقصة أو اطلب التأكيد إذا اكتملت.`
          : `\n\nCurrent form fill state: ${JSON.stringify(request.formFillState)}\nContinue collecting missing fields or ask for confirmation if complete.`;
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

      // === Claude Tool Use — structured function calling ===
      // Claude decides which tool to call (if any) with structured parameters
      // No more JSON-in-text parsing — 99.9% reliable structured output
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: settings.maxTokensPerRequest,
        system: systemPrompt + contextPrompt,
        messages: claudeMessages,
        tools: CLAUDE_TOOLS,
      });

      // Extract text content and tool use from response
      // Claude can return both text (conversational) + tool_use (structured action) in same response
      let textContent = '';
      let toolUse: { id: string; name: string; input: Record<string, unknown> } | null = null;

      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolUse = { id: block.id, name: block.name, input: block.input as Record<string, unknown> };
        }
      }

      console.log(`🤖 Zaki Claude: text=${textContent.length}chars, tool=${toolUse?.name || 'none'}, stop=${response.stop_reason}`);

      // Log and track usage
      const processingTimeMs = Date.now() - startTime;
      await Promise.all([
        AgiLogsService.logChat({
          tenantId,
          userId,
          inputCommand: request.message,
          inputLanguage: language,
          parsedIntent: { toolUse: toolUse?.name, response: textContent.substring(0, 200) },
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

      // Handle tool calls — Claude chose to call a structured tool
      if (toolUse) {
        return this.handleToolUse(toolUse, textContent, tenantId, userId, language, request.formFillState);
      }

      // Plain text response (no tool call) — general conversation
      return {
        success: true,
        message: this.createMessage('assistant', textContent || (language === 'ar'
          ? 'أنا ذكي! كيف أقدر أساعدك؟'
          : 'I\'m Zaki! How can I help you?')),
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

    const language = detectLanguage(request.message, request.history);

    const currentModule = request.context?.currentModule;

    // Try pattern matching first
    const patternResult = this.tryPatternMatching(request.message, language, currentModule);
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
      const systemPrompt = this.buildSystemPrompt(currentModule, language);

      // Build messages array with history (same as processChat)
      const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      if (request.history && request.history.length > 0) {
        for (const h of request.history) {
          if (h.role === 'user' || h.role === 'assistant') {
            claudeMessages.push({ role: h.role, content: h.content });
          }
        }
      }
      claudeMessages.push({ role: 'user', content: request.message });

      // Streaming with Tool Use: stream text, then check for tool_use at the end
      const stream = await this.anthropic.messages.stream({
        model: settings.defaultModel || 'claude-sonnet-4-20250514',
        max_tokens: settings.maxTokensPerRequest,
        system: systemPrompt,
        messages: claudeMessages,
        tools: CLAUDE_TOOLS,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'text', content: event.delta.text };
        }
      }

      // After streaming, check the final message for tool_use blocks
      const finalMessage = await stream.finalMessage();
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          // Convert tool_use to an action for the client
          const toolAction = this.toolUseToAction(block.name, block.input as Record<string, unknown>);
          if (toolAction) {
            yield { type: 'action', action: toolAction };
          }
          break;
        }
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
    // ===== LAYER -1: Skip pattern matching for CREATION intents =====
    // Creation requests MUST go to Claude for interactive form fill via Tool Use.
    // Pattern matching can only navigate — it cannot collect fields interactively.
    const CREATION_VERBS = /(?:أنشئ|انشئ|أنشي|انشي|إنشاء|انشاء|أضف|اضف|سوي|سوّي|ابني|يلا نسوي|create|add|new|make)\b/i;
    const ENTITY_NOUNS = /(?:مستخدم|يوزر|فرع|خط عمل|بزنس|user|branch|business|tenant|عيادة|species|فصيلة)/i;
    if (CREATION_VERBS.test(input) && ENTITY_NOUNS.test(input)) {
      console.log(`🤖 Zaki: Creation intent detected → skipping pattern matching, sending to Claude`);
      return null;
    }

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
    // Use language-specific prompt — NEVER bilingual
    let prompt = language === 'ar' ? BASE_SYSTEM_PROMPT_AR : BASE_SYSTEM_PROMPT_EN;

    // Add available pages based on current panel (in user's language only)
    const panelRoutes = currentModule ? PANEL_ROUTES[currentModule] : PANEL_ROUTES['SYSTEM'];
    if (panelRoutes) {
      prompt += language === 'ar' ? '\n\nالصفحات المتاحة:\n' : '\n\nAvailable pages:\n';
      for (const [route, keywords] of Object.entries(panelRoutes)) {
        const label = language === 'ar' ? keywords.ar[0] : keywords.en[0];
        prompt += `- ${route} — ${label}\n`;
      }
    }

    // Add entity metadata for form fill capabilities
    prompt += '\n\n' + buildEntityPromptSection(language);

    return prompt;
  }

  /**
   * Handle Claude Tool Use — execute the tool and return structured response
   * This replaces the old JSON-in-text parsing with 99.9% reliable structured output
   */
  private async handleToolUse(
    toolUse: { id: string; name: string; input: Record<string, unknown> },
    textContent: string,
    tenantId: string,
    userId: string,
    language: 'en' | 'ar',
    existingFormState?: AgiFormFillState,
  ): Promise<AgiChatResponse> {
    switch (toolUse.name) {
      // ─── READ DATA ─────────────────────────────────────
      case 'read_data': {
        const entity = toolUse.input.entity as string;
        console.log(`🔧 Zaki Tool: read_data("${entity}")`);

        const readAction: AgiAction = {
          type: 'READ',
          target: entity,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: `Reading ${entity}...`,
          descriptionAr: `جاري قراءة ${entity}...`,
        };

        // Permission check
        const readPermCheck = await this.checkPermission(userId, tenantId, readAction, language);
        if (!readPermCheck.granted) {
          return {
            success: true,
            message: this.createMessage('assistant', readPermCheck.message!),
          };
        }

        // Execute via actionExecutor
        const readResult = await actionExecutor.execute(tenantId, userId, readAction);
        const readMsg = language === 'ar' ? readResult.messageAr : readResult.message;

        return {
          success: true,
          message: this.createMessage('assistant', textContent || readMsg),
          data: readResult.data,
          formFillState: existingFormState || undefined,
        };
      }

      // ─── NAVIGATE ──────────────────────────────────────
      case 'navigate_to': {
        const route = toolUse.input.route as string;
        console.log(`🔧 Zaki Tool: navigate_to("${route}")`);

        const navAction: AgiAction = {
          type: 'NAVIGATE',
          target: route,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: textContent || `Navigating to ${route}`,
          descriptionAr: textContent || `الانتقال إلى ${route}`,
        };

        return {
          success: true,
          message: this.createMessage('assistant', textContent || navAction.description),
          action: navAction,
        };
      }

      // ─── COLLECT FORM DATA ─────────────────────────────
      case 'collect_form_data': {
        console.log(`🔧 Zaki Tool: collect_form_data("${toolUse.input.entity}", complete=${toolUse.input.is_complete})`);

        const formState: AgiFormFillState = {
          entity: toolUse.input.entity as string,
          action: 'CREATE',
          collectedFields: (toolUse.input.collected_fields as Record<string, unknown>) || {},
          missingRequired: (toolUse.input.missing_fields as string[]) || [],
          isComplete: (toolUse.input.is_complete as boolean) || false,
          confirmedByUser: (toolUse.input.confirmed_by_user as boolean) || false,
        };

        // Generate smart fallback message when Claude doesn't provide text
        // (happens when stop_reason is "tool_use" — Claude may skip text block)
        let formMessage = textContent;
        if (!formMessage || formMessage.length < 3) {
          if (formState.isComplete) {
            // All fields collected — show summary and ask for confirmation
            const meta = getEntityMeta(formState.entity);
            const entityName = meta
              ? (language === 'ar' ? meta.displayName.ar : meta.displayName.en)
              : formState.entity;
            const fieldLines = Object.entries(formState.collectedFields)
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .map(([k, v]) => {
                // Try to find field label from metadata
                const fieldMeta = meta?.requiredFields.find((f: EntityFieldDef) => f.name === k)
                  || meta?.optionalFields.find((f: EntityFieldDef) => f.name === k);
                const label = fieldMeta
                  ? (language === 'ar' ? fieldMeta.labelAr : fieldMeta.label)
                  : k;
                return `• ${label}: ${v}`;
              })
              .join('\n');

            formMessage = language === 'ar'
              ? `تم جمع كل البيانات المطلوبة لإنشاء ${entityName}:\n\n${fieldLines}\n\nهل تريد تأكيد الإنشاء؟`
              : `All required data collected for creating ${entityName}:\n\n${fieldLines}\n\nDo you want to confirm creation?`;
          } else if (formState.missingRequired.length > 0) {
            // Still missing fields — ask for the next one
            const nextFieldName = formState.missingRequired[0];
            const meta = getEntityMeta(formState.entity);
            const fieldMeta = meta?.requiredFields.find((f: EntityFieldDef) => f.name === nextFieldName)
              || meta?.optionalFields.find((f: EntityFieldDef) => f.name === nextFieldName);
            const fieldLabel = fieldMeta
              ? (language === 'ar' ? fieldMeta.labelAr : fieldMeta.label)
              : nextFieldName;

            // If field has predefined options, show them as numbered list
            if (fieldMeta?.options && fieldMeta.options.length > 0) {
              const optionsList = fieldMeta.options.map((o, i) =>
                `${i + 1}. ${language === 'ar' ? o.labelAr : o.label}`
              ).join('\n');
              formMessage = language === 'ar'
                ? `اختر ${fieldLabel}:\n\n${optionsList}\n\nاكتب الرقم أو الاسم`
                : `Choose ${fieldLabel}:\n\n${optionsList}\n\nType the number or name`;
            } else {
              formMessage = language === 'ar'
                ? `ما هو ${fieldLabel}؟`
                : `What is the ${fieldLabel}?`;
            }
          } else {
            formMessage = language === 'ar'
              ? 'جاري جمع البيانات...'
              : 'Collecting data...';
          }
        }

        return {
          success: true,
          message: this.createMessage('assistant', formMessage),
          formFillState: formState,
        };
      }

      // ─── CREATE ENTITY ─────────────────────────────────
      case 'create_entity': {
        const entity = toolUse.input.entity as string;
        const data = (toolUse.input.data as Record<string, unknown>) || {};
        console.log(`🔧 Zaki Tool: create_entity("${entity}") with ${Object.keys(data).length} fields`);
        console.log(`🔧 Zaki Tool: create_entity data keys: ${Object.keys(data).join(', ')}`);

        // ── Resolve name-to-UUID for FK fields ──
        // Claude may pass branch name instead of UUID if read_data didn't include IDs
        // or user referenced by name. Resolve here before executing.
        try {
          if (entity === 'users' && data.branchId && !isValidUUID(data.branchId as string)) {
            const resolved = await resolveBranchByName(tenantId, data.branchId as string);
            if (resolved) {
              console.log(`🔧 Zaki: Resolved branchId "${data.branchId}" → "${resolved}"`);
              data.branchId = resolved;
            }
          }
          if (entity === 'branches' && data.businessLineId && !isValidUUID(data.businessLineId as string)) {
            const resolved = await resolveBusinessLineByName(tenantId, data.businessLineId as string);
            if (resolved) {
              console.log(`🔧 Zaki: Resolved businessLineId "${data.businessLineId}" → "${resolved}"`);
              data.businessLineId = resolved;
            }
          }
        } catch (resolveErr) {
          console.warn(`⚠️ Zaki: FK resolution error:`, resolveErr);
        }

        const createAction: AgiAction = {
          type: 'CREATE',
          target: entity,
          params: data,
          description: `Create ${entity}`,
          descriptionAr: `إنشاء ${entity}`,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'MEDIUM',
        };

        // Permission check
        const createPermCheck = await this.checkPermission(userId, tenantId, createAction, language);
        if (!createPermCheck.granted) {
          return {
            success: true,
            message: this.createMessage('assistant', createPermCheck.message!),
          };
        }

        // Execute via actionExecutor
        const createResult = await actionExecutor.execute(tenantId, userId, createAction);
        const createMsg = language === 'ar' ? createResult.messageAr : createResult.message;

        return {
          success: true,
          message: this.createMessage('assistant', createResult.success
            ? (textContent || createMsg)
            : createMsg),
          action: createResult.success ? createAction : undefined,
        };
      }

      // ─── UNKNOWN TOOL ──────────────────────────────────
      default: {
        console.warn(`⚠️ Zaki: Unknown tool "${toolUse.name}"`);
        return {
          success: true,
          message: this.createMessage('assistant', textContent || (language === 'ar'
            ? 'حدث خطأ غير متوقع'
            : 'An unexpected error occurred')),
        };
      }
    }
  }

  /**
   * Convert a tool_use block to an AgiAction (used by streaming)
   */
  private toolUseToAction(toolName: string, input: Record<string, unknown>): AgiAction | null {
    switch (toolName) {
      case 'read_data':
        return {
          type: 'READ',
          target: input.entity as string,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: `Reading ${input.entity}...`,
          descriptionAr: `جاري قراءة ${input.entity}...`,
        };
      case 'navigate_to':
        return {
          type: 'NAVIGATE',
          target: input.route as string,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'LOW',
          description: `Navigate to ${input.route}`,
          descriptionAr: `الانتقال إلى ${input.route}`,
        };
      case 'create_entity':
        return {
          type: 'CREATE',
          target: input.entity as string,
          params: input.data as Record<string, unknown>,
          isDestructive: false,
          requiresApproval: false,
          riskLevel: 'MEDIUM',
          description: `Create ${input.entity}`,
          descriptionAr: `إنشاء ${input.entity}`,
        };
      default:
        return null;
    }
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
