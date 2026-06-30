import { NestFactory } from "@nestjs/core";
import { VersioningType, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./shared/filters/http-exception.filter";
import { VersionHeaderInterceptor } from "./shared/interceptors/version-header.interceptor";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./shared/logger/winston.config";
import { LoggingInterceptor } from "./shared/logger/logging.interceptor";
async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const configService = app.get(ConfigService);

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const allowedOrigins =
    configService
      .get<string>("app.cors.origin")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const localDevOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
  ];
  const corsOrigins = new Set([...allowedOrigins, ...localDevOrigins]);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new VersionHeaderInterceptor(),
    new LoggingInterceptor()
  );

  if (configService.get<string>("app.env") !== "production") {
    const config = new DocumentBuilder()
      .setTitle("IRED PropertyOS API")
      .setDescription("Commercial Real Estate Operations Platform API")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "Authorization",
          description: "Enter JWT access token",
          in: "header",
        },
        "access-token",
      )
      .addTag("auth", "Authentication and OTP verification")
      .addTag("users", "User management and assignments")
      .addTag("reference", "Reference data management")
      .addTag("buildings", "Building (property) management")
      .addTag("floors", "Floor management")
      .addTag("units", "Unit management")
      .addTag("contacts", "Contact management")
      .addTag("media", "Media and document management")
      .addTag("change-requests", "Worker change requests and approvals")
      .addTag("search", "Property search")
      .addTag("dashboard", "Dashboard metrics")
      .addTag("health", "Health checks")
      .addTag("deals", "Deal pipeline and commissions")
      .addTag("clients", "Client management and requirements")
      .addTag("proposals", "Proposal generation and PDF export")
      .addTag("tasks", "Task management and follow-ups")
      .addTag("site-visits", "Site visit scheduling")
      .addTag("imports", "CSV data import")
      .addTag("exports", "Data export")
      .addTag("map", "Geographic map queries")
      .addTag("notifications", "Notification queue management")
      .addTag("audit", "Audit event logs")
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, documentFactory);
  }

  const port = configService.get<number>("app.port") ?? 3000;
  const baseUrl = configService.get<string>("app.url") ?? `http://localhost:${port}`;

  app.getHttpAdapter().get("/", (_req, res) => {
    res.json({
      name: "IRED PropertyOS API",
      status: "ok",
      frontend:
        configService.get<string>("app.frontendUrl") ?? "http://localhost:3000",
      docs: `${baseUrl}/api/docs`,
      health: `${baseUrl}/api/v1/health`,
      apiBase: `${baseUrl}/api/v1`,
    });
  });

  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Application running on: http://0.0.0.0:${port}`);
  console.log(`📚 Swagger docs: ${baseUrl}/api/docs`);
}

bootstrap();