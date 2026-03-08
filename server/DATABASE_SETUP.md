# Database Setup - Neon PostgreSQL

## تم الربط بنجاح مع قاعدة بيانات Neon PostgreSQL! ✅

### معلومات الاتصال

- **Database Provider**: Neon PostgreSQL
- **PostgreSQL Version**: 17.7
- **Host**: ep-lingering-credit-ag62rxet-pooler.c-2.eu-central-1.aws.neon.tech
- **Database**: neondb
- **SSL**: Enabled (required)

### الجداول المنشأة

تم إنشاء 22 جدول بنجاح:

1. `tenants` - معلومات العملاء (Tenants)
2. `users` - المستخدمين
3. `roles` - الأدوار والصلاحيات
4. `permissions` - الصلاحيات
5. `branches` - الفروع
6. `business_lines` - خطوط الأعمال
7. `branch_capacity` - سعة الفروع
8. `subscription_features` - مميزات الاشتراكات
9. `auth_tokens` - رموز المصادقة
10. `audit_logs` - سجلات المراجعة
11. `quota_usage` - استخدام الحصص
12. `rate_limit_buckets` - محددات معدل الطلبات
13. `tenant_quotas` - حصص العملاء
14. `dpf_modules` - وحدات DPF
15. `dpf_screens` - شاشات DPF
16. `dpf_actions` - إجراءات DPF
17. `dpf_permissions` - صلاحيات DPF
18. `dpf_roles` - أدوار DPF
19. `dpf_role_permissions` - صلاحيات الأدوار DPF
20. `dpf_user_roles` - أدوار المستخدمين DPF
21. `dpf_agi_logs` - سجلات AGI
22. `dpf_voice_logs` - سجلات الصوت

### الأوامر المتاحة

```bash
# توليد ملفات Migration جديدة
npm run db:generate

# تشغيل Migrations على قاعدة البيانات
npm run db:migrate

# فتح Drizzle Studio لإدارة البيانات
npm run db:studio

# اختبار الاتصال بقاعدة البيانات
npx tsx src/db/testDrizzle.ts
```

### إعدادات Connection Pool

- **Max Connections**: 100
- **Idle Timeout**: 30 ثانية
- **Connection Timeout**: 10 ثوانٍ
- **SSL Mode**: Required (with rejectUnauthorized: false)

### ملفات الإعداد

- [.env](server/.env) - متغيرات البيئة
- [drizzle.config.ts](server/drizzle.config.ts) - إعدادات Drizzle Kit
- [src/db/index.ts](server/src/db/index.ts) - إعداد Connection Pool
- [src/db/migrate.ts](server/src/db/migrate.ts) - سكربت تشغيل Migrations

### الخطوات التالية

1. **تشغيل المشروع**:
   ```bash
   cd server
   npm run dev
   ```

2. **فتح Drizzle Studio** (لإدارة البيانات بشكل مرئي):
   ```bash
   npm run db:studio
   ```

3. **إضافة بيانات أولية** (Seed Data):
   - يمكنك استخدام السكربتات الموجودة في `src/db/seed/`

### ملاحظات مهمة

- ✅ تم تحديث الـ database driver من `postgres-js` إلى `pg` (node-postgres) لتحسين التوافق مع Windows
- ✅ تم إعداد SSL بشكل صحيح للعمل مع Neon
- ✅ تم تكوين Connection Pool للتعامل مع 3000+ tenant
- ✅ جميع الجداول جاهزة للاستخدام

### استخدام قاعدة البيانات في الكود

```typescript
import { db } from './db/index.js';
import { tenants } from './db/schemas/tenants.js';

// مثال: الحصول على جميع العملاء
const allTenants = await db.select().from(tenants);

// مثال: إضافة عميل جديد
await db.insert(tenants).values({
  tenantName: 'New Tenant',
  tenantCode: 'NT001',
  status: 'active'
});
```
