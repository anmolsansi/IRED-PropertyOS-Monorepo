import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditQueryDto } from "./dto/audit.schema";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AuditQueryDto) {
    const {
      page = 1,
      limit = 50,
      entityType,
      entityId,
      eventType,
      actorUserId,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where: Record<string, unknown> = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (eventType)
      where.eventType = { contains: eventType, mode: "insensitive" };
    if (actorUserId) where.actorUserId = actorUserId;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.auditEvent.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }
}
