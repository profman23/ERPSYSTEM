/**
 * SAP B1 Authorization Migration Script
 * Creates the dpf_role_screen_authorizations table
 *
 * Run: npx tsx src/db/runSapB1Migration.ts
 */

import { db } from './index';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  SAP B1 AUTHORIZATION MIGRATION');
  console.log('═'.repeat(70));
  console.log('\n');

  try {
    // Check if table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'dpf_role_screen_authorizations'
      );
    `);

    if (tableExists.rows[0]?.exists) {
      console.log('⚠️  Table dpf_role_screen_authorizations already exists');
      console.log('   Skipping table creation...\n');
    } else {
      console.log('📦 Creating dpf_role_screen_authorizations table...\n');

      await db.execute(sql`
        CREATE TABLE dpf_role_screen_authorizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id),
          role_id UUID NOT NULL REFERENCES dpf_roles(id) ON DELETE CASCADE,
          screen_code VARCHAR(100) NOT NULL,
          authorization_level INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          CONSTRAINT unique_role_screen UNIQUE (role_id, screen_code)
        );
      `);

      console.log('✅ Table created successfully!\n');

      // Create indexes
      console.log('📊 Creating performance indexes...\n');

      await db.execute(sql`
        CREATE INDEX idx_dpf_role_screen_auth_tenant
        ON dpf_role_screen_authorizations(tenant_id);
      `);

      await db.execute(sql`
        CREATE INDEX idx_dpf_role_screen_auth_role
        ON dpf_role_screen_authorizations(role_id);
      `);

      await db.execute(sql`
        CREATE INDEX idx_dpf_role_screen_auth_screen
        ON dpf_role_screen_authorizations(screen_code);
      `);

      await db.execute(sql`
        CREATE INDEX idx_dpf_role_screen_auth_role_screen
        ON dpf_role_screen_authorizations(role_id, screen_code);
      `);

      console.log('✅ Indexes created successfully!\n');
    }

    // Verify table structure
    console.log('🔍 Verifying table structure...\n');

    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'dpf_role_screen_authorizations'
      ORDER BY ordinal_position;
    `);

    console.log('   Columns:');
    for (const col of columns.rows) {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    }

    console.log('\n');
    console.log('═'.repeat(70));
    console.log('  MIGRATION COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
