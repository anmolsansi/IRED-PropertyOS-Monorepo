import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';

/**
 * Standalone script to export Swagger JSON.
 * Usage: npx ts-node scripts/export-swagger.ts
 * Requires DATABASE_URL and other env vars to be set.
 */
async function exportSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('IRED PropertyOS API')
    .setDescription('Commercial Real Estate Operations Platform API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('auth', 'Authentication and OTP verification')
    .addTag('users', 'User management and assignments')
    .addTag('reference', 'Reference data management')
    .addTag('buildings', 'Building (property) management')
    .addTag('floors', 'Floor management')
    .addTag('units', 'Unit management')
    .addTag('contacts', 'Contact management')
    .addTag('media', 'Media and document management')
    .addTag('change-requests', 'Worker change requests and approvals')
    .addTag('search', 'Property search')
    .addTag('dashboard', 'Dashboard metrics')
    .addTag('health', 'Health checks')
    .addTag('deals', 'Deal pipeline and commissions')
    .addTag('clients', 'Client management and requirements')
    .addTag('proposals', 'Proposal generation and PDF export')
    .addTag('tasks', 'Task management and follow-ups')
    .addTag('site-visits', 'Site visit scheduling')
    .addTag('imports', 'CSV data import')
    .addTag('exports', 'Data export')
    .addTag('map', 'Geographic map queries')
    .addTag('notifications', 'Notification queue management')
    .addTag('audit', 'Audit event logs')
    .addTag('monitoring', 'System monitoring and metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/swagger.json', JSON.stringify(document, null, 2));

  const paths = Object.keys(document.paths || {});
  const totalOps = paths.reduce((sum, p) => sum + Object.keys(document.paths[p]).length, 0);
  console.log(`✅ Exported: ${paths.length} paths, ${totalOps} operations`);

  await app.close();
}

exportSwagger().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
