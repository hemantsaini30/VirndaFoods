// prisma/seed.js
//
// Minimal seed stub for Phase 1. Real seeding (creating an admin account,
// sample restaurants, etc.) starts in Phase 3. For now this just proves the
// seed command runs end-to-end against your database.
//
// Run with: npm run seed

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seed stub running — no data seeded yet (real seeding starts Phase 3).');

  const userCount = await prisma.user.count();
  // eslint-disable-next-line no-console
  console.log(`Current user count in database: ${userCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
