import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function analyzeDatabase() {
  console.log('🔍 Running ANALYZE on DPF tables...\n');

  const dpfTables = [
    'dpf_modules',
    'dpf_screens',
    'dpf_actions',
    'dpf_permissions',
    'dpf_roles',
    'dpf_role_permissions',
    'dpf_user_roles',
    'dpf_agi_logs',
    'dpf_voice_logs'
  ];

  for (const table of dpfTables) {
    try {
      console.log(`   Analyzing ${table}...`);
      await db.execute(sql.raw(`ANALYZE ${table}`));
    } catch (error) {
      console.log(`   ⚠️  Warning: Could not analyze ${table}`);
    }
  }

  console.log('\n✅ Database analysis completed!');
  console.log('   Query planner now has updated statistics.\n');

  process.exit(0);
}

analyzeDatabase();
