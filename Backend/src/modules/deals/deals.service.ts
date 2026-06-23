import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DealStatus, SnapshotSource } from "@prisma/client";
import { buildLinkedGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      assignedTo?: string;
      clientId?: string;
      buildingId?: string;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildLinkedGeographyWhere(geographicScope);

    const where = {
      ...geoWhere,
      ...(filters.status && { status: filters.status as DealStatus }),
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.buildingId && { buildingId: filters.buildingId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: true,
          building: true,
          unit: true,
          assignee: true,
          _count: { select: { commissions: true, invoices: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        client: true,
        building: true,
        unit: true,
        assignee: true,
        creator: { select: { id: true, fullName: true, email: true } },
        commissions: true,
        invoices: true,
      },
    });
    if (!deal) throw new NotFoundException("Deal not found");
    return deal;
  }

  async create(data: any, userId: string) {
    return this.prisma.deal.create({
      data: { ...data, createdBy: userId },
    });
  }

  async update(id: string, data: any, userId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException("Deal not found");

    if (data.status && data.status !== deal.status) {
      const validTransitions: Record<string, string[]> = {
        requirement_received: ["shortlisted", "lost"],
        shortlisted: ["site_visit_scheduled", "lost"],
        site_visit_scheduled: ["site_visit_completed", "lost"],
        site_visit_completed: ["negotiation", "lost"],
        negotiation: ["agreement_shared", "lost"],
        agreement_shared: ["closed", "lost"],
        closed: [],
        lost: [],
      };

      if (!validTransitions[deal.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${deal.status} to ${data.status}`,
        );
      }

      if (data.status === "closed") {
        data.closedAt = new Date();
      }
    }

    return this.prisma.deal.update({ where: { id }, data });
  }

  async addCommission(dealId: string, data: { amount: number; rate?: number }) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");

    return this.prisma.commission.create({
      data: { dealId, ...data },
    });
  }

  async addInvoice(dealId: string, data: { amount: number; dueDate?: string }) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");

    return this.prisma.invoice.create({
      data: {
        dealId,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
  }

  async markInvoicePaid(invoiceId: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt: new Date() },
    });
  }

  async softDelete(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException("Deal not found");
    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException("Deal not found");
    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
