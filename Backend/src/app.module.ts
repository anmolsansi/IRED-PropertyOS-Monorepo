import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SharedModule } from "./shared/shared.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./modules/email/mail.module";
import { RequestIdMiddleware } from "./shared/middleware/request-id.middleware";

// V1 Modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ReferenceModule } from "./modules/reference/reference.module";
import { BuildingsModule } from "./modules/buildings/buildings.module";
import { FloorsModule } from "./modules/floors/floors.module";
import { UnitsModule } from "./modules/units/units.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { MediaModule } from "./modules/media/media.module";
import { ChangeRequestsModule } from "./modules/change-requests/change-requests.module";
import { SearchModule } from "./modules/search/search.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";

// V2 Modules
import { ImportsModule } from "./modules/imports/imports.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { MapModule } from "./modules/map/map.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { ProposalsModule } from "./modules/proposals/proposals.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { SiteVisitsModule } from "./modules/site-visits/site-visits.module";
import { DealsModule } from "./modules/deals/deals.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("app.throttler.ttl") || 60000,
          limit: config.get<number>("app.throttler.limit") || 60,
        },
      ],
    }),

    PrismaModule,
    SharedModule,
    HealthModule,
    MailModule,

    // V1
    AuthModule,
    UsersModule,
    ReferenceModule,
    BuildingsModule,
    FloorsModule,
    UnitsModule,
    ContactsModule,
    MediaModule,
    ChangeRequestsModule,
    SearchModule,
    DashboardModule,

    // V2
    ImportsModule,
    ExportsModule,
    MapModule,
    ClientsModule,
    ProposalsModule,
    TasksModule,
    SiteVisitsModule,
    DealsModule,
    NotificationsModule,
    AuditModule,
    MonitoringModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
