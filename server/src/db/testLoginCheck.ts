import { db } from './index';
import { users } from './schemas/users';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const [user] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, 'mohamed.ghazal@gmail.com'));

  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  console.log('Hash:', user.passwordHash.substring(0, 30) + '...');

  const passwords = ['Test@123', 'Admin@123', 'admin123', 'Password123', '123456', 'Mohamed@123'];
  for (const pwd of passwords) {
    const ok = await bcrypt.compare(pwd, user.passwordHash);
    console.log(`  ${pwd} → ${ok ? 'MATCH' : 'no'}`);
  }

  // Also reset to Test@123
  const newHash = await bcrypt.hash('Test@123', 12);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.email, 'mohamed.ghazal@gmail.com'));
  console.log('\nReset to Test@123 ✅');

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
