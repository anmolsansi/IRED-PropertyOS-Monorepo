import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./gateway/notifications.gateway";
import { EmailWorker } from "./workers/email.worker";
import { SmsWorker } from "./workers/sms.worker";
import { PushWorker } from "./workers/push.worker";
import { SmsService } from "./services/sms.service";
import { PushService } from "./services/push.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../email/mail.module";

const redisHost = process.env.REDIS_HOST;
const redisDisabled = !redisHost || redisHost === "disabled";
const queueImports = redisDisabled
  ? []
  : [
      BullModule.forRootAsync({
        imports: [],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          connection: {
            host: config.get<string>("app.redis.host") || "localhost",
            port: config.get<number>("app.redis.port") || 6379,
            password: config.get<string>("app.redis.password") || undefined,
          },
        }),
      }),
      BullModule.registerQueue(
        {
          name: "email",
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        },
        {
          name: "sms",
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        },
        { name: "push", defaultJobOptions: { attempts: 1 } },
      ),
    ];

const queueProviders = redisDisabled ? [] : [EmailWorker, SmsWorker, PushWorker];

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("app.jwt.accessSecret"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
    ...queueImports,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    ...queueProviders,
    SmsService,
    PushService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
