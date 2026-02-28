import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  {
    email: 'admin@nutrition.com',
    password: 'Admin@123',
    name: 'Administrador',
    role: 'ADMIN' as const,
  },
  {
    email: 'nutricionista@nutrition.com',
    password: 'Nutri@123',
    name: 'Dra. Ana Silva',
    role: 'NUTRITIONIST' as const,
  },
  {
    email: 'paciente@nutrition.com',
    password: 'Paciente@123',
    name: 'Alice Martins',
    role: 'PATIENT' as const,
  },
  // Legacy users (for backward compatibility)
  {
    email: 'nutri@thinkingtools.health',
    password: 'Nutri@123',
    name: 'Dra. Ana (Legacy)',
    role: 'NUTRITIONIST' as const,
  },
  {
    email: 'alice@thinkingtools.health',
    password: 'Paciente@123',
    name: 'Alice (Legacy)',
    role: 'PATIENT' as const,
  },
];

async function main() {
  console.log('🌱 Seeding users...');

  // Ensure organization exists
  let organization = await prisma.organization.findUnique({
    where: { slug: 'demo' }
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Demo Organization',
        slug: 'demo',
      }
    });
    console.log('✅ Organization created');
  }

  for (const userData of USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      // Update password hash if user exists
      const passwordHash = await bcrypt.hash(userData.password, 10);
      await prisma.user.update({
        where: { email: userData.email },
        data: { passwordHash, name: userData.name },
      });
      console.log(`🔄 Updated: ${userData.email}`);
    } else {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          name: userData.name,
          role: userData.role,
          organizationId: organization.id,
        },
      });
      console.log(`✅ Created: ${userData.email}`);
    }
  }

  console.log('\n🎉 Users seed completed!');
  console.log('\n📝 Test credentials:');
  console.log('  Admin:         admin@nutrition.com / Admin@123');
  console.log('  Nutricionista: nutricionista@nutrition.com / Nutri@123');
  console.log('  Paciente:      paciente@nutrition.com / Paciente@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
