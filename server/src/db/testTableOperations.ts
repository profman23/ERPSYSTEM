import { db } from './index.js';
import { testTable } from './schemas/testTable.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

async function testTableOperations() {
  console.log('🧪 Testing test_table operations...\n');

  try {
    // 1. إضافة بيانات تجريبية
    console.log('1️⃣ Adding test data...');
    const newRecords = await db.insert(testTable).values([
      {
        name: 'Test Item 1',
        description: 'هذا عنصر تجريبي للاختبار',
        quantity: 10,
        isActive: true,
        metadata: JSON.stringify({ tags: ['test', 'demo'], priority: 'high' })
      },
      {
        name: 'Test Item 2',
        description: 'عنصر تجريبي آخر',
        quantity: 25,
        isActive: true,
        metadata: JSON.stringify({ tags: ['sample'], priority: 'medium' })
      },
      {
        name: 'Test Item 3',
        description: 'عنصر ثالث للتجربة',
        quantity: 5,
        isActive: false,
        metadata: JSON.stringify({ tags: ['test', 'inactive'], priority: 'low' })
      }
    ]).returning();

    console.log(`✅ Added ${newRecords.length} test records`);

    // 2. قراءة جميع البيانات
    console.log('\n2️⃣ Reading all test data...');
    const allRecords = await db.select().from(testTable);
    console.log(`✅ Found ${allRecords.length} records:`);

    allRecords.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`   - ID: ${record.id}`);
      console.log(`   - Name: ${record.name}`);
      console.log(`   - Description: ${record.description}`);
      console.log(`   - Quantity: ${record.quantity}`);
      console.log(`   - Active: ${record.isActive ? 'Yes' : 'No'}`);
      console.log(`   - Created: ${record.createdAt}`);
    });

    // 3. قراءة العناصر النشطة فقط
    console.log('\n3️⃣ Reading active items only...');
    const activeRecords = await db.select()
      .from(testTable)
      .where(eq(testTable.isActive, true));
    console.log(`✅ Found ${activeRecords.length} active records`);

    // 4. تحديث بيانات
    console.log('\n4️⃣ Updating a record...');
    if (allRecords.length > 0) {
      const firstRecord = allRecords[0];
      await db.update(testTable)
        .set({
          quantity: 100,
          updatedAt: new Date(),
          description: 'تم تحديث هذا السجل للتجربة'
        })
        .where(eq(testTable.id, firstRecord.id));

      console.log(`✅ Updated record: ${firstRecord.name}`);

      // قراءة السجل بعد التحديث
      const updatedRecord = await db.select()
        .from(testTable)
        .where(eq(testTable.id, firstRecord.id));

      console.log(`   - New quantity: ${updatedRecord[0].quantity}`);
      console.log(`   - New description: ${updatedRecord[0].description}`);
    }

    // 5. حذف سجل
    console.log('\n5️⃣ Deleting a record...');
    if (allRecords.length > 2) {
      const lastRecord = allRecords[allRecords.length - 1];
      await db.delete(testTable)
        .where(eq(testTable.id, lastRecord.id));

      console.log(`✅ Deleted record: ${lastRecord.name}`);
    }

    // 6. عدد السجلات النهائي
    console.log('\n6️⃣ Final count...');
    const finalRecords = await db.select().from(testTable);
    console.log(`✅ Total records in test_table: ${finalRecords.length}`);

    console.log('\n✅ All test operations completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testTableOperations();
