# Test Table API Documentation

## تم إنشاء جدول الاختبار بنجاح! ✅

تم إضافة جدول `test_table` إلى قاعدة البيانات مع API كامل للتعامل معه.

## معلومات الجدول

### الحقول (Columns):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name` | VARCHAR(255) | اسم العنصر (مطلوب) |
| `description` | TEXT | وصف العنصر |
| `quantity` | INTEGER | الكمية (افتراضي: 0) |
| `isActive` | BOOLEAN | حالة النشاط (افتراضي: true) |
| `metadata` | TEXT | بيانات إضافية (JSON) |
| `createdAt` | TIMESTAMP | تاريخ الإنشاء |
| `updatedAt` | TIMESTAMP | تاريخ آخر تحديث |

## API Endpoints

Base URL: `http://localhost:3000/api/v1/test`

### 1. الحصول على جميع السجلات
**GET** `/api/v1/test`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "78e5dcf1-a60d-4fdc-9e5c-46a4e4872029",
      "name": "Test Item 1",
      "description": "هذا عنصر تجريبي",
      "quantity": 10,
      "isActive": true,
      "metadata": "{\"tags\":[\"test\",\"demo\"]}",
      "createdAt": "2025-12-17T10:47:35.000Z",
      "updatedAt": "2025-12-17T10:47:35.000Z"
    }
  ],
  "count": 1
}
```

**مثال باستخدام curl:**
```bash
curl http://localhost:3000/api/v1/test
```

---

### 2. الحصول على سجل معين
**GET** `/api/v1/test/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "78e5dcf1-a60d-4fdc-9e5c-46a4e4872029",
    "name": "Test Item 1",
    "description": "هذا عنصر تجريبي",
    "quantity": 10,
    "isActive": true,
    "metadata": "{\"tags\":[\"test\",\"demo\"]}",
    "createdAt": "2025-12-17T10:47:35.000Z",
    "updatedAt": "2025-12-17T10:47:35.000Z"
  }
}
```

**مثال باستخدام curl:**
```bash
curl http://localhost:3000/api/v1/test/78e5dcf1-a60d-4fdc-9e5c-46a4e4872029
```

---

### 3. إنشاء سجل جديد
**POST** `/api/v1/test`

**Request Body:**
```json
{
  "name": "منتج جديد",
  "description": "وصف المنتج",
  "quantity": 50,
  "isActive": true,
  "metadata": {
    "category": "electronics",
    "tags": ["new", "featured"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid-here",
    "name": "منتج جديد",
    "description": "وصف المنتج",
    "quantity": 50,
    "isActive": true,
    "metadata": "{\"category\":\"electronics\",\"tags\":[\"new\",\"featured\"]}",
    "createdAt": "2025-12-17T11:00:00.000Z",
    "updatedAt": "2025-12-17T11:00:00.000Z"
  },
  "message": "Record created successfully"
}
```

**مثال باستخدام curl:**
```bash
curl -X POST http://localhost:3000/api/v1/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "منتج جديد",
    "description": "وصف المنتج",
    "quantity": 50,
    "isActive": true,
    "metadata": {"category": "electronics"}
  }'
```

---

### 4. تحديث سجل موجود
**PUT** `/api/v1/test/:id`

**Request Body:**
```json
{
  "name": "اسم محدث",
  "quantity": 100,
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "78e5dcf1-a60d-4fdc-9e5c-46a4e4872029",
    "name": "اسم محدث",
    "description": "هذا عنصر تجريبي",
    "quantity": 100,
    "isActive": false,
    "metadata": "{\"tags\":[\"test\",\"demo\"]}",
    "createdAt": "2025-12-17T10:47:35.000Z",
    "updatedAt": "2025-12-17T11:05:00.000Z"
  },
  "message": "Record updated successfully"
}
```

**مثال باستخدام curl:**
```bash
curl -X PUT http://localhost:3000/api/v1/test/78e5dcf1-a60d-4fdc-9e5c-46a4e4872029 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "اسم محدث",
    "quantity": 100
  }'
```

---

### 5. حذف سجل
**DELETE** `/api/v1/test/:id`

**Response:**
```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

**مثال باستخدام curl:**
```bash
curl -X DELETE http://localhost:3000/api/v1/test/78e5dcf1-a60d-4fdc-9e5c-46a4e4872029
```

---

## اختبار سريع

### تشغيل السيرفر:
```bash
cd server
npm run dev
```

### اختبار الـ API:

1. **إضافة سجل جديد:**
```bash
curl -X POST http://localhost:3000/api/v1/test \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "quantity": 10}'
```

2. **قراءة جميع السجلات:**
```bash
curl http://localhost:3000/api/v1/test
```

3. **اختبار العمليات من الكود:**
```bash
npx tsx src/db/testTableOperations.ts
```

---

## ملفات المشروع

- **Schema**: [server/src/db/schemas/testTable.ts](server/src/db/schemas/testTable.ts)
- **API Routes**: [server/src/routes/testRoutes.ts](server/src/routes/testRoutes.ts)
- **Test Script**: [server/src/db/testTableOperations.ts](server/src/db/testTableOperations.ts)
- **Migration**: [server/src/db/migrations/0001_dusty_slipstream.sql](server/src/db/migrations/0001_dusty_slipstream.sql)

---

## ملاحظات

- ✅ الـ API لا يحتاج authentication (للاختبار فقط)
- ✅ جميع العمليات CRUD متاحة
- ✅ يدعم JSON في حقل metadata
- ✅ التواريخ يتم إدارتها تلقائياً
- ✅ UUID يتم إنشاؤه تلقائياً

---

## استخدام من JavaScript/TypeScript

```typescript
import { db } from './db/index.js';
import { testTable } from './db/schemas/testTable.js';
import { eq } from 'drizzle-orm';

// إضافة سجل
const newRecord = await db.insert(testTable).values({
  name: 'My Item',
  quantity: 5
}).returning();

// قراءة جميع السجلات
const allRecords = await db.select().from(testTable);

// قراءة سجل معين
const record = await db.select()
  .from(testTable)
  .where(eq(testTable.id, 'some-uuid'));

// تحديث سجل
await db.update(testTable)
  .set({ quantity: 10 })
  .where(eq(testTable.id, 'some-uuid'));

// حذف سجل
await db.delete(testTable)
  .where(eq(testTable.id, 'some-uuid'));
```
