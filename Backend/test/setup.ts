import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { PrismaClient } from '../src/generated/prisma';
import * as argon2 from 'argon2';

let postgres: StartedTestContainer;
let redis: StartedTestContainer;
let prisma: PrismaClient;

export async function setupTestContainers(): Promise<{
  postgres: StartedTestContainer;
  redis: StartedTestContainer;
  prisma: PrismaClient;
  databaseUrl: string;
  redisUrl: string;
}> {
  postgres = await new GenericContainer('postgres:16-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: 'propertyos_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  redis = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  const databaseUrl = `postgresql://test:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/propertyos_test?schema=public`;
  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);

  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_HOST = redisHost;
  process.env.REDIS_PORT = String(redisPort);
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-12345';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-12345';
  process.env.APP_ENV = 'test';

  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return { postgres, redis, prisma, databaseUrl, redisUrl: `redis://${redisHost}:${redisPort}` };
}

export async function teardownTestContainers(): Promise<void> {
  await prisma?.$disconnect();
  await postgres?.stop();
  await redis?.stop();
}

export async function seedTestData(prisma: PrismaClient): Promise<void> {
  const adminPasswordHash = await argon2.hash('Admin@123');
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      fullName: 'Test Admin',
      email: 'admin@test.com',
      mobileNumber: '9999999999',
      passwordHash: adminPasswordHash,
      role: 'ADMIN' as any,
      emailVerifiedAt: new Date(),
      mobileVerifiedAt: new Date(),
    },
  });

  const state = await prisma.state.upsert({
    where: { code: 'MH' },
    update: {},
    create: { name: 'Maharashtra', code: 'MH' },
  });

  await prisma.city.upsert({
    where: { id: 'test-city-mumbai' },
    update: {},
    create: { id: 'test-city-mumbai', name: 'Mumbai', stateId: state.id },
  });

  await prisma.propertyType.upsert({
    where: { name: 'Office' },
    update: {},
    create: { name: 'Office' },
  });

  await prisma.availabilityStatus.upsert({
    where: { name: 'Available' },
    update: {},
    create: { name: 'Available' },
  });

  await prisma.furnishingStatus.upsert({
    where: { name: 'Unfurnished' },
    update: {},
    create: { name: 'Unfurnished' },
  });

  await prisma.verificationStatus.upsert({
    where: { name: 'Verified' },
    update: {},
    create: { name: 'Verified' },
  });

  await prisma.contactRole.upsert({
    where: { name: 'Owner' },
    update: {},
    create: { name: 'Owner' },
  });

  await prisma.source.upsert({
    where: { name: 'Manual Entry' },
    update: {},
    create: { name: 'Manual Entry' },
  });
}
