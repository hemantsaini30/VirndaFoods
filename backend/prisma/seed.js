// prisma/seed.js
//
// Phase 3: creates the initial admin account from environment variables.
// Idempotent — safe to run multiple times (e.g. on every fresh clone, or
// by accident) without creating duplicate admins or crashing.
//
// Run with: npm run seed

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;
  const bcryptCost = Number(process.env.BCRYPT_COST) || 12;

  if (!email || !password || !name) {
    console.log(
      'ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME must all be set in .env to seed an admin account — skipping.'
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists for ${email} — skipping (idempotent seed).`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, bcryptCost);

  const admin = await prisma.user.create({
    data: { email, passwordHash, name, role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });

  console.log(`Created admin account: ${admin.email} (${admin.id})`);
}

async function main() {
  await seedAdmin();

  const userCount = await prisma.user.count();
  console.log(`Current user count in database: ${userCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });