import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('@PoloMarco741', 10);

  // Create or update the superadmin user
  const superadmin = await prisma.user.upsert({
    where: { email: 'demo@truebook.ai' },
    update: {},
    create: {
      email: 'demo@truebook.ai',
      name: 'Demo Admin',
      password: hashedPassword,
      emailVerified: new Date(),
      role: 'SUPERADMIN',
    },
  });

  console.log({ superadmin });
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });