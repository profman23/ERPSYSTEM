import { db } from './index.js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runBranchMigration() {
  try {
    console.log('📦 Running Branch Scope Migration...');

    const migrationSQL = readFileSync(
      join(__dirname, 'migrations', '0003_curvy_gabe_jones.sql'),
      'utf8'
    );

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(/;[\s]*(?=CREATE|ALTER|DROP|DO)/g)
      .filter(s => s.trim().length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await db.execute(sql.raw(statement + ';'));
          console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate')
          ) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Branch Scope Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runBranchMigration();
