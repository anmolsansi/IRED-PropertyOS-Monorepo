import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role } from "../../shared/decorators/roles.decorator";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard() {
    const [
      totalProperties,
      availableProperties,
      occupiedProperties,
      pendingApprovals,
      totalWorkers,
      totalClients,
      activeDeals,
      closedDeals,
      upcomingSiteVisits,
      pendingTasks,
      totalUnits,
      availableUnits,
    ] = await Promise.all([
      this.prisma.building.count({ where: { deletedAt: null } }),
      this.prisma.building.count({
        where: { deletedAt: null, availabilityStatus: { name: "Available" } },
      }),
      this.prisma.building.count({
        where: { deletedAt: null, availabilityStatus: { name: "Occupied" } },
      }),
      this.prisma.changeRequest.count({ where: { status: "pending" } }),
      this.prisma.user.count({
        where: { role: Role.WORKER, status: "active" },
      }),
      this.prisma.client.count(),
      this.prisma.deal.count({
        where: { status: { notIn: ["closed", "lost"] } },
      }),
      this.prisma.deal.count({ where: { status: "closed" } }),
      this.prisma.siteVisit.count({
        where: {
          scheduledAt: { gte: new Date() },
          status: { in: ["scheduled", "confirmed"] },
        },
      }),
      this.prisma.task.count({
        where: { status: { in: ["open", "in_progress"] } },
      }),
      this.prisma.unit.count({ where: { deletedAt: null } }),
      this.prisma.unit.count({
        where: { deletedAt: null, availabilityStatus: { name: "Available" } },
      }),
    ]);

    const pendingChangeRequests = await this.prisma.changeRequest.findMany({
      where: { status: "pending" },
      take: 5,
      orderBy: { requestedAt: "desc" },
      include: {
        requestedByUser: { select: { id: true, fullName: true } },
      },
    });

    const recentActivity = await this.prisma.auditEvent.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, fullName: true } },
      },
    });

    return {
      metrics: {
        totalProperties,
        availableProperties,
        occupiedProperties,
        availabilityRate:
          totalProperties > 0
            ? ((availableProperties / totalProperties) * 100).toFixed(1)
            : 0,
        pendingApprovals,
        totalWorkers,
        totalClients,
        activeDeals,
        closedDeals,
        upcomingSiteVisits,
        pendingTasks,
        totalUnits,
        availableUnits,
        unitOccupancyRate:
          totalUnits > 0
            ? (((totalUnits - availableUnits) / totalUnits) * 100).toFixed(1)
            : 0,
      },
      pendingChangeRequests,
      recentActivity,
    };
  }

  async getWorkerDashboard(userId: string) {
    const assignments = await this.prisma.workerGeographicAssignment.findMany({
      where: { userId, active: true },
    });

    const stateIds = assignments
      .filter((a) => a.stateId)
      .map((a) => a.stateId!);
    const cityIds = assignments.filter((a) => a.cityId).map((a) => a.cityId!);

    const geographicFilter =
      stateIds.length > 0 || cityIds.length > 0
        ? {
            OR: [
              ...(stateIds.length > 0 ? [{ stateId: { in: stateIds } }] : []),
              ...(cityIds.length > 0 ? [{ cityId: { in: cityIds } }] : []),
            ],
          }
        : {};

    const [
      assignedProperties,
      pendingMyChanges,
      myTasks,
      myUpcomingSiteVisits,
      myDeals,
    ] = await Promise.all([
      this.prisma.building.count({
        where: { deletedAt: null, ...geographicFilter },
      }),
      this.prisma.changeRequest.count({
        where: { requestedBy: userId, status: "pending" },
      }),
      this.prisma.task.count({
        where: {
          assignedTo: userId,
          status: { in: ["open", "in_progress"] },
        },
      }),
      this.prisma.siteVisit.count({
        where: {
          assignedTo: userId,
          scheduledAt: { gte: new Date() },
          status: { in: ["scheduled", "confirmed"] },
        },
      }),
      this.prisma.deal.count({
        where: {
          assignedTo: userId,
          status: { notIn: ["closed", "lost"] },
        },
      }),
    ]);

    const recentTasks = await this.prisma.task.findMany({
      where: { assignedTo: userId },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: {
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
      },
    });

    return {
      metrics: {
        assignedProperties,
        pendingMyChanges,
        myTasks,
        myUpcomingSiteVisits,
        myDeals,
      },
      recentTasks,
    };
  }

  async getActivity(limit = 20) {
    return this.prisma.auditEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }
}
