import { db } from './index';
import { users } from './schemas/users';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const [u] = await db
    .select({ passwordHash: users.passwordHash, email: users.email })
    .from(users)
    .where(eq(users.email, 'mohamed.ghazal@gmail.com'));

  if (!u) {
    console.log('User NOT FOUND');
    process.exit(0);
  }

  const match = await bcrypt.compare('Test@123', u.passwordHash);
  console.log(`Email: ${u.email}`);
  console.log(`Test@123 matches: ${match}`);

  if (!match) {
    console.log('Resetting password to Test@123...');
    const hash = await bcrypt.hash('Test@123', 12);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.email, 'mohamed.ghazal@gmail.com'));

    // Verify
    const [check] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.email, 'mohamed.ghazal@gmail.com'));
    const ok = await bcrypt.compare('Test@123', check.passwordHash);
    console.log(`After reset, Test@123 matches: ${ok}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
