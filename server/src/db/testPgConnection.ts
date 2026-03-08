import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection with pg package...');
  console.log('📍 Connection string:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');

    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version);

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Database tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log(`\n✅ Total tables: ${tables.rows.length}`);

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testConnection();
