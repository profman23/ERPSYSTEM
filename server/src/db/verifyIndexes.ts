import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function verifyIndexes() {
  try {
    console.log('🔍 Verifying DPF Indexes...\n');

    const result = await db.execute(sql`
      SELECT
        indexname,
        tablename
      FROM pg_indexes
      WHERE tablename LIKE 'dpf_%'
        AND schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    console.log('✅ DPF Indexes Created:');
    console.log('========================\n');

    const groupedByTable: Record<string, string[]> = {};

    for (const row of result.rows as any[]) {
      if (!groupedByTable[row.tablename]) {
        groupedByTable[row.tablename] = [];
      }
      groupedByTable[row.tablename].push(row.indexname);
    }

    for (const [tableName, indexes] of Object.entries(groupedByTable)) {
      console.log(`📊 ${tableName}:`);
      indexes.forEach(idx => console.log(`   → ${idx}`));
      console.log('');
    }

    console.log(`\n🎉 Total DPF Indexes: ${result.rows.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying indexes:', error);
    process.exit(1);
  }
}

verifyIndexes();
