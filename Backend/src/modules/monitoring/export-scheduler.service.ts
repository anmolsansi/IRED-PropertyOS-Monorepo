import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ExportSchedulerService {
  private readonly logger = new Logger(ExportSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyExport() {
    this.logger.log("Running daily scheduled export...");
    try {
      const exports = [
        this.exportBuildings(),
        this.exportClients(),
        this.exportDeals(),
      ];

      const results = await Promise.allSettled(exports);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      this.logger.log(
        `Daily export complete: ${succeeded} succeeded, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error(`Daily export failed: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyReport() {
    this.logger.log("Generating weekly report...");
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [buildings, deals, tasks, siteVisits] = await Promise.all([
        this.prisma.building.count({ where: { deletedAt: null } }),
        this.prisma.deal.findMany({
          where: { createdAt: { gte: weekAgo }, deletedAt: null },
          select: { status: true, dealValue: true },
        }),
        this.prisma.task.findMany({
          where: { createdAt: { gte: weekAgo }, deletedAt: null },
          select: { status: true, priority: true },
        }),
        this.prisma.siteVisit.findMany({
          where: { scheduledAt: { gte: weekAgo }, deletedAt: null },
          select: { status: true },
        }),
      ]);

      this.logger.log(
        `Weekly Report: ${buildings} buildings, ` +
          `${deals.length} new deals (total value: ${deals.reduce((s, d) => s + (d.dealValue || 0), 0)}), ` +
          `${tasks.length} new tasks, ` +
          `${siteVisits.length} site visits`,
      );
    } catch (error) {
      this.logger.error(`Weekly report failed: ${(error as Error).message}`);
    }
  }

  private async exportBuildings() {
    return this.prisma.building.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        buildingCode: true,
        totalFloors: true,
        totalUnits: true,
      },
    });
  }

  private async exportClients() {
    return this.prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, company: true, email: true },
    });
  }

  private async exportDeals() {
    return this.prisma.deal.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, dealValue: true, status: true },
    });
  }
}
