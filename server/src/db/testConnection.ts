import { db } from './index.js';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function testConnection() {
  console.log('🔍 Testing database connection...');

  try {
    // Test basic query
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    console.log('✅ Database connection successful!');
    console.log('📅 Server time:', result[0].current_time);
    console.log('🐘 PostgreSQL version:', result[0].pg_version);

    // Test getting all tables
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Database tables created:');
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });

    console.log(`\n✅ Total tables: ${tables.length}`);

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testConnection();
