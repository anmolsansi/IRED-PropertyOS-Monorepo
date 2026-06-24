import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TaskStatus, TaskType, FollowUpStatus } from "@prisma/client";
import { buildLinkedGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      assignedTo?: string;
      status?: string;
      type?: string;
      buildingId?: string;
      clientId?: string;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildLinkedGeographyWhere(geographicScope);

    const where = {
      ...geoWhere,
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
      ...(filters.status && { status: filters.status as TaskStatus }),
      ...(filters.type && { type: filters.type as TaskType }),
      ...(filters.buildingId && { buildingId: filters.buildingId }),
      ...(filters.clientId && { clientId: filters.clientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: "asc" },
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          creator: { select: { id: true, fullName: true } },
          client: { select: { id: true, name: true } },
          building: { select: { id: true, name: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        creator: { select: { id: true, fullName: true, email: true } },
        client: true,
        building: true,
      },
    });
    if (!task) throw new NotFoundException("Task not found");
    await verifyEntityGeography(this.prisma, geographicScope, task, "Task");
    return task;
  }

  async create(data: any, userId: string) {
    return this.prisma.task.create({
      data: { ...data, createdBy: userId },
    });
  }

  async update(id: string, data: any) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");

    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        open: ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
        completed: [],
        cancelled: [],
      };

      if (!validTransitions[task.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${task.status} to ${data.status}`,
        );
      }
    }

    return this.prisma.task.update({ where: { id }, data });
  }

  async addFollowUp(taskId: string, data: any, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Task not found");

    return this.prisma.followUp.create({
      data: {
        ...data,
        taskId,
        createdBy: userId,
      },
    });
  }

  async getFollowUps(taskId: string) {
    return this.prisma.followUp.findMany({
      where: { taskId },
      orderBy: { dueDate: "asc" },
    });
  }

  async updateFollowUp(id: string, data: any) {
    const followUp = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followUp) throw new NotFoundException("Follow-up not found");

    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        pending: ["completed", "overdue"],
        completed: [],
        overdue: ["completed"],
      };

      if (!validTransitions[followUp.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${followUp.status} to ${data.status}`,
        );
      }
    }

    return this.prisma.followUp.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
