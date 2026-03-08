# Claude Issues Resolved - سجل المشاكل المحلولة

هذا الملف يحتوي على المشاكل التي تم حلها لتجنب تكرارها في المستقبل.

---

## Issue #1: فشل تعيين/تعديل Role للمستخدمين من صفحة System Users

**التاريخ:** 2025-12-22

**الوصف:**
- عند محاولة تعيين أو تعديل role لمستخدم من `/system/users`، كان يفشل الـ POST بخطأ 401 ثم 500
- الـ DELETE كان يعمل بنجاح (لذلك كان يظهر "No Roles" بعد محاولة التعديل)

**الأعراض:**
1. خطأ 401 عند محاولة تعيين role
2. بعد الإصلاح الجزئي، خطأ 500: `null value in column "assigned_scope" violates not-null constraint`
3. المستخدم يظهر "No Roles" بعد محاولة التعديل الفاشلة

**السبب الجذري:**
ثلاث مشاكل متتالية:

### المشكلة 1: Permission mapping مفقود
- `users.assign_role` لم يكن موجوداً في `permissionMiddleware.ts`

### المشكلة 2: خطأ في اسم الحقل
- `req.user?.id` بدلاً من `req.user?.userId` في controller

### المشكلة 3: حقل مطلوب مفقود في INSERT
- `assignedScope` مطلوب في جدول `dpf_user_roles` لكنه لم يكن يُرسل في INSERT

**الملفات المعدلة:**

### 1. `server/src/rbac/permissionMiddleware.ts`
```typescript
// أضف هذا في screenMap
'users.assign_role': { screenCode: 'USERS', level: 'write' },
```

### 2. `server/src/controllers/dpfUserRoleController.ts`
```typescript
// تغيير من:
const assignedBy = req.user?.id;
// إلى:
const assignedBy = req.user?.userId;

// إضافة فحص SYSTEM user:
const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
```

### 3. `server/src/services/userRoleService.ts`
```typescript
// تغيير signature الدالة:
static async assignRoleToUser(
  tenantId: string,
  assignedBy: string,
  input: AssignRoleToUserInput & { assignedScope?: string; businessLineId?: string | null; branchId?: string | null },
  isSystemTenant: boolean = false
): Promise<{ success: boolean }> {
  const { userId, roleId, expiresAt, assignedScope = 'GLOBAL', businessLineId = null, branchId = null } = input;

  // ... باقي الكود

  await db.insert(dpfUserRoles).values({
    tenantId: targetTenantId,
    userId,
    roleId,
    assignedBy,
    assignedScope,      // إضافة هذا الحقل
    businessLineId,     // إضافة هذا الحقل
    branchId,           // إضافة هذا الحقل
    expiresAt,
  });
}
```

**الدروس المستفادة:**
1. تأكد دائماً من أن جميع الحقول المطلوبة (NOT NULL) موجودة في INSERT statements
2. عند إضافة permission جديد، أضفه أيضاً في `screenMap` في `permissionMiddleware.ts`
3. استخدم `req.user?.userId` وليس `req.user?.id` للحصول على ID المستخدم الحالي
4. SYSTEM users يحتاجون معاملة خاصة - تحقق من `accessScope === 'system'` في كل من `context` و `req.user`

---

## Issue #2: URL Duplication في API Calls - `/api/v1/api/v1/...`

**التاريخ:** 2025-12-22

**الوصف:**
عند فتح modal إضافة tenant جديد من `/system/tenants`، كانت طلبات API تفشل بخطأ 404.

**الأعراض:**
```
GET http://localhost:5500/api/v1/api/v1/tenants/meta/countries 404
GET http://localhost:5500/api/v1/api/v1/tenants/meta/subscription-plans 404
POST http://localhost:5500/api/v1/api/v1/tenants/advanced 404
```

لاحظ تكرار `/api/v1/api/v1/` بدلاً من `/api/v1/`.

**السبب الجذري:**
**Double-prefixing issue:**

1. **API Client** في `client/src/lib/api.ts` يحدد baseURL:
   ```typescript
   const getApiBaseUrl = () => {
     const base = import.meta.env.VITE_API_URL || 'http://localhost:5500';
     return `${base}/api/v1`;  // ← baseURL = http://localhost:5500/api/v1
   };
   ```

2. **المكونات كانت تضيف `/api/v1` مرة ثانية:**
   ```typescript
   // CountryTimezoneSelector.tsx
   apiClient.get('/api/v1/tenants/meta/countries')

   // SubscriptionPlanSelector.tsx
   apiClient.get('/api/v1/tenants/meta/subscription-plans')

   // TenantFormModal.tsx
   apiClient.post('/api/v1/tenants/advanced', data)
   ```

3. **النتيجة:** axios يجمع الـ baseURL مع الـ path:
   - `http://localhost:5500/api/v1` + `/api/v1/tenants/...`
   - = `http://localhost:5500/api/v1/api/v1/tenants/...` ❌

**الحل:**
إزالة `/api/v1` من paths المكونات (لأن الـ baseURL يحتويها بالفعل).

**الملفات المعدلة:**

### 1. `client/src/components/tenants/CountryTimezoneSelector.tsx`
```typescript
// قبل:
const response = await apiClient.get(`/api/v1/tenants/meta/countries?lang=${lang}`);
// بعد:
const response = await apiClient.get(`/tenants/meta/countries?lang=${lang}`);
```

### 2. `client/src/components/tenants/SubscriptionPlanSelector.tsx`
```typescript
// قبل:
const response = await apiClient.get('/api/v1/tenants/meta/subscription-plans');
// بعد:
const response = await apiClient.get('/tenants/meta/subscription-plans');
```

### 3. `client/src/components/tenants/TenantFormModal.tsx`
```typescript
// قبل:
async function createTenant(data: TenantFormData) {
  const response = await apiClient.post('/api/v1/tenants/advanced', data);
  // ...
}

async function updateTenant(id: string, data: Partial<TenantFormData>) {
  const response = await apiClient.put(`/api/v1/tenants/advanced/${id}`, data);
  // ...
}

// بعد:
async function createTenant(data: TenantFormData) {
  const response = await apiClient.post('/tenants/advanced', data);
  // ...
}

async function updateTenant(id: string, data: Partial<TenantFormData>) {
  const response = await apiClient.put(`/tenants/advanced/${id}`, data);
  // ...
}
```

**الدروس المستفادة:**
1. **DRY Principle**: عند استخدام axios client مع baseURL محدد، استخدم paths نسبية فقط
2. عند إضافة API calls جديدة، تحقق من baseURL في `api.ts` أولاً
3. الـ pattern الصحيح: `apiClient.get('/tenants/...')` وليس `apiClient.get('/api/v1/tenants/...')`

---

## Issue #3: Duplicate Tenant Code عند الإنشاء المتزامن

**التاريخ:** 2025-12-22

**الوصف:**
عند محاولة إنشاء tenant جديد، كان يفشل بخطأ duplicate key حتى مع عدم وجود tenant بنفس الاسم.

**الأعراض:**
```
error: duplicate key value violates unique constraint "tenants_code_unique"
```

**السبب الجذري:**
**Reservation-Finalization Pattern Violation:**

1. **`TenantCodeGenerator.generateUniqueCode()`** يعمل الآتي:
   - يولد كود جديد مثل `VET-A3B9C2-N8KPQL`
   - يحجز الكود بإدخال سجل مؤقت في الـ database:
   ```typescript
   await db.insert(tenants).values({
     code: candidateCode,
     name: '__CODE_RESERVATION__',  // ← سجل محجوز
     subscriptionPlan: 'trial',
     status: 'pending',
   }).onConflictDoNothing({ target: tenants.code });
   ```

2. **`TenantSetupService.createTenant()`** كان يحاول INSERT جديد:
   ```typescript
   // ❌ خطأ: السجل موجود بالفعل!
   const [newTenant] = await db.insert(tenants).values({
     code,  // ← نفس الكود المحجوز
     name: input.name,
     // ...
   }).returning();
   ```

3. **النتيجة:** محاولة إدخال سجل بنفس الـ code الموجود → duplicate key error

**الحل:**
استخدام `finalizeCodeReservation()` (UPDATE) بدلاً من `db.insert()` (INSERT).

**الملفات المعدلة:**

### `server/src/services/TenantSetupService.ts`
```typescript
async createTenant(input: CreateTenantInput): Promise<TenantCreationResult> {
  try {
    // 1. توليد كود فريد (يُنشئ حجز في DB)
    const code = await tenantCodeGenerator.generateUniqueCode();

    const country = MIDDLE_EAST_COUNTRIES.find(c => c.code === input.countryCode);
    if (!country) {
      // إلغاء الحجز إذا فشل التحقق
      await tenantCodeGenerator.cancelCodeReservation(code);
      return { success: false, error: 'Invalid country code' };
    }

    const planLimits = await subscriptionService.getPlanLimits(input.subscriptionPlan);

    // 2. تحويل الحجز إلى tenant حقيقي (UPDATE وليس INSERT)
    const finalizeResult = await tenantCodeGenerator.finalizeCodeReservation(code, {
      name: input.name,
      subscriptionPlan: input.subscriptionPlan,
      countryCode: input.countryCode,
      country: country.name,
      timezone: country.timezone,
      contactEmail: input.contactEmail,
      // ... باقي البيانات
    });

    if (!finalizeResult.success || !finalizeResult.tenantId) {
      return { success: false, error: finalizeResult.error || 'Failed to finalize tenant creation' };
    }

    // 3. جلب السجل الكامل
    const newTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, finalizeResult.tenantId),
    });

    // ... باقي الكود
  }
}
```

**لماذا هذا الحل آمن للإنشاء المتزامن (10+ مستخدمين)؟**

1. **Atomic INSERT with onConflictDoNothing**: الـ database يضمن عدم التكرار
2. **Retry Mechanism**: إذا حصل تصادم، يولد كود جديد ويعيد المحاولة (حتى 5 مرات)
3. **UPDATE بدلاً من INSERT**: لا يوجد خطر duplicate key لأننا نحدث سجل موجود
4. **Optional Redis**: طبقة إضافية للأداء (ليست مطلوبة للأمان)

**الدروس المستفادة:**
1. **Reservation Pattern**: عند استخدام pattern الحجز (reservation)، استخدم UPDATE للتحويل وليس INSERT
2. **Concurrent Safety**: تأكد من أن الحل يعمل مع 10+ مستخدمين متزامنين
3. **Cleanup on Failure**: دائماً ألغِ الحجز (`cancelCodeReservation`) إذا فشل التحقق

---

## Issue #4: [القادم]

**التاريخ:**

**الوصف:**

**الأعراض:**

**السبب الجذري:**

**الحل:**

**الملفات المعدلة:**

---
