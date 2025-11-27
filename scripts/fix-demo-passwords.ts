import bcrypt from 'bcryptjs';
import { db } from '../server/src/db';
import { users } from '../server/src/db/schemas';
import { eq } from 'drizzle-orm';

const DEMO_USERS = [
  'superadmin@system.local',
  'admin@petcareplus.vet',
  'doctor@petcareplus.vet',
  'reception@petcareplus.vet'
];

const PASSWORD = 'admin123';

async function fixDemoPasswords() {
  console.log('🔐 Generating bcrypt hash for password: admin123');
  
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(PASSWORD, saltRounds);
  
  console.log('✅ Generated hash:', hashedPassword);
  console.log('\n📝 Updating demo users...\n');
  
  for (const email of DEMO_USERS) {
    try {
      const result = await db
        .update(users)
        .set({ 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.email, email))
        .returning({ id: users.id, email: users.email });
      
      if (result.length > 0) {
        console.log(`✅ Updated: ${email}`);
      } else {
        console.log(`⚠️ Not found: ${email}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${email}:`, error);
    }
  }
  
  console.log('\n🔓 Verifying password hash...');
  const isMatch = await bcrypt.compare(PASSWORD, hashedPassword);
  console.log(`Password verification: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n✨ Done! All demo users now have password: admin123');
  process.exit(0);
}

fixDemoPasswords().catch(console.error);
