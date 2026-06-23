import { Module } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";
import { ExportSchedulerService } from "./export-scheduler.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, ExportSchedulerService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
