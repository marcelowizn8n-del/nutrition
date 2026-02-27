// prisma/seed.js
const { randomBytes } = require('crypto');
const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 1) Organization padrão
  const org = await prisma.organization.upsert({
    where: { id: 'org_default' },
    update: {},
    create: {
      id: 'org_default',
      name: 'Thinking Tools',
      slug: 'thinking-tools',
    },
  });

  // 2) Usuário ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@thinkingtools.health' },
    update: {},
    create: {
      name: 'Admin Thinking Tools',
      email: 'admin@thinkingtools.health',
      role: UserRole.ADMIN,
      passwordHash: 'dev-admin-placeholder', // depois vamos trocar por hash real
      organizationId: org.id,
    },
  });

  // 3) Usuário NUTRITIONIST
  const nutricionista = await prisma.user.upsert({
    where: { email: 'nutri@thinkingtools.health' },
    update: {},
    create: {
      name: 'Nutricionista Thinking Tools',
      email: 'nutri@thinkingtools.health',
      role: UserRole.NUTRITIONIST,
      passwordHash: 'dev-nutri-placeholder', // depois vamos trocar por hash real
      organizationId: org.id,
    },
  });

  // 4) ApiKey inicial para testes
  const rawKey =
    process.env.SEED_API_KEY ||
    'nutrition_test_' + randomBytes(16).toString('hex');

  const apiKey = await prisma.apiKey.upsert({
    where: { key: rawKey },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Chave de desenvolvimento inicial',
      key: rawKey,
      active: true,
      rateLimitPerMin: 60,
    },
  });

  console.log('✅ Seed executado com sucesso.');
  console.log('Organization ID:', org.id);
  console.log('Admin email:    admin@thinkingtools.health');
  console.log('Nutri email:    nutri@thinkingtools.health');
  console.log('ApiKey inicial (guarde isso para testar a API):');
  console.log(apiKey.key);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
