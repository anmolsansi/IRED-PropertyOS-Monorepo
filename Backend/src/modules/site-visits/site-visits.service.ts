import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SiteVisitStatus } from "@prisma/client";
import { buildLinkedGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";

@Injectable()
export class SiteVisitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      scheduledDate?: string;
      assignedTo?: string;
      status?: string;
      clientId?: string;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildLinkedGeographyWhere(geographicScope);

    const where: any = {
      ...geoWhere,
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
      ...(filters.status && { status: filters.status as SiteVisitStatus }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.scheduledDate && {
        scheduledAt: {
          gte: new Date(filters.scheduledDate),
          lt: new Date(new Date(filters.scheduledDate).getTime() + 86400000),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.siteVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          client: true,
          building: { select: { id: true, name: true, buildingCode: true } },
        },
      }),
      this.prisma.siteVisit.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const siteVisit = await this.prisma.siteVisit.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        creator: { select: { id: true, fullName: true, email: true } },
        client: true,
        building: true,
      },
    });
    if (!siteVisit) throw new NotFoundException("Site visit not found");
    return siteVisit;
  }

  async create(data: any, userId: string) {
    return this.prisma.siteVisit.create({
      data: { ...data, createdBy: userId },
    });
  }

  async update(id: string, data: any) {
    const siteVisit = await this.prisma.siteVisit.findUnique({ where: { id } });
    if (!siteVisit) throw new NotFoundException("Site visit not found");

    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        scheduled: ["confirmed", "cancelled"],
        confirmed: ["completed", "no_show", "cancelled"],
        completed: [],
        cancelled: [],
        no_show: [],
      };

      if (!validTransitions[siteVisit.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${siteVisit.status} to ${data.status}`,
        );
      }
    }

    return this.prisma.siteVisit.update({ where: { id }, data });
  }

  async cancel(id: string) {
    return this.update(id, { status: "cancelled" });
  }

  async complete(id: string, notes?: string) {
    return this.update(id, { status: "completed", notes });
  }

  async softDelete(id: string) {
    const siteVisit = await this.prisma.siteVisit.findUnique({ where: { id } });
    if (!siteVisit) throw new NotFoundException("Site visit not found");
    return this.prisma.siteVisit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const siteVisit = await this.prisma.siteVisit.findUnique({ where: { id } });
    if (!siteVisit) throw new NotFoundException("Site visit not found");
    return this.prisma.siteVisit.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
