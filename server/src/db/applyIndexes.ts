import { db } from './index.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyIndexes() {
  try {
    console.log('🚀 Applying DPF Performance Indexes...\n');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', '0002_add_dpf_performance_indexes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Execute the SQL
    console.log('📝 Executing SQL migration file...\n');
    await db.execute(sql.raw(sqlContent));

    console.log('✅ DPF Performance Indexes applied successfully!\n');

    // Verify indexes
    const result = await db.execute(sql`
      SELECT
        indexname,
        tablename
      FROM pg_indexes
      WHERE tablename LIKE 'dpf_%'
        AND schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`🎉 Total Performance Indexes Created: ${result.rows.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    process.exit(1);
  }
}

applyIndexes();
