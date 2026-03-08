import { db } from './index';
import { users } from './schemas/users';

async function main() {
  const allUsers = await db
    .select({
      email: users.email,
      role: users.role,
      tenantId: users.tenantId,
    })
    .from(users);

  console.log(`Users found: ${allUsers.length}`);
  for (const u of allUsers) {
    console.log(`  ${u.email} | ${u.role} | tenant: ${u.tenantId || 'null'}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
