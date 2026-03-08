import bcrypt from 'bcryptjs';
import { db } from './index';
import { users } from './schemas';
import { eq } from 'drizzle-orm';

async function resetPasswords() {
  const newPassword = 'Test@123';
  const hash = await bcrypt.hash(newPassword, 12);

  const emails = [
    'tenantadmin@petcare.vet',
    'doctor@petcareplus.vet',
    'reception@petcareplus.vet',
    'profman23@gmail.com',
  ];

  for (const email of emails) {
    const result = await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.email, email))
      .returning({ email: users.email, scope: users.accessScope });

    if (result.length > 0) {
      console.log(`Reset: ${result[0].email} | scope: ${result[0].scope}`);
    } else {
      console.log(`Not found: ${email}`);
    }
  }

  console.log(`\nAll passwords reset to: ${newPassword}`);
  process.exit(0);
}

resetPasswords().catch((e) => {
  console.error(e);
  process.exit(1);
});
