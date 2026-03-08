import { db } from './index.js';
import { sql } from 'drizzle-orm';
import { tenants } from './schemas/tenants.js';
import 'dotenv/config';

async function testDrizzleConnection() {
  console.log('🔍 Testing Drizzle ORM connection...');

  try {
    // Test basic query
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    console.log('✅ Drizzle ORM connected successfully!');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version);

    // Test querying tenants table
    console.log('\n📊 Testing tenants table...');
    const allTenants = await db.select().from(tenants).limit(5);
    console.log(`✅ Found ${allTenants.length} tenant(s) in database`);

    if (allTenants.length > 0) {
      console.log('\n🏢 Sample tenant:');
      console.log(`  - ID: ${allTenants[0].id}`);
      console.log(`  - Name: ${allTenants[0].tenantName}`);
      console.log(`  - Code: ${allTenants[0].tenantCode}`);
      console.log(`  - Status: ${allTenants[0].status}`);
    } else {
      console.log('ℹ️  No tenants found (database is empty)');
    }

    console.log('\n✅ All tests passed! Database is ready to use.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testDrizzleConnection();
