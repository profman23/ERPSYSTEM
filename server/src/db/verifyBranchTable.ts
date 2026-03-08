import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function verifyBranchTable() {
  try {
    console.log('🔍 Verifying dpf_user_role_branches table...\n');

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'dpf_user_role_branches'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Table dpf_user_role_branches does not exist');
      process.exit(1);
    }

    console.log('✅ Table dpf_user_role_branches exists');

    // Check indexes
    const indexCheck = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'dpf_user_role_branches'
      ORDER BY indexname
    `);

    console.log(`\n📊 Found ${indexCheck.rows.length} indexes:`);
    indexCheck.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.indexname}`);
    });

    // Check columns
    const columnCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'dpf_user_role_branches'
      ORDER BY ordinal_position
    `);

    console.log(`\n📋 Table columns (${columnCheck.rows.length}):`);
    columnCheck.rows.forEach((row: any) => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    });

    console.log('\n✅ Migration verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyBranchTable();
