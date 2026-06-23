import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequirementStatus, ShortlistStatus } from "@prisma/client";

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { mobileNumber: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { requirements: true, deals: true, siteVisits: true },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        requirements: {
          include: { shortlists: true },
        },
        deals: {
          include: { building: true, unit: true },
          orderBy: { createdAt: "desc" },
        },
        siteVisits: {
          include: { building: true },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async create(data: any, userId: string) {
    return this.prisma.client.create({
      data: { ...data, createdBy: userId },
    });
  }

  async update(id: string, data: any) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.client.update({ where: { id }, data });
  }

  async addContact(clientId: string, data: any) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.clientContact.create({
      data: { ...data, clientId },
    });
  }

  async removeContact(contactId: string) {
    return this.prisma.clientContact.delete({ where: { id: contactId } });
  }

  async createRequirement(clientId: string, data: any, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException("Client not found");

    return this.prisma.requirement.create({
      data: {
        ...data,
        clientId,
        createdBy: userId,
      },
    });
  }

  async updateRequirement(id: string, data: any) {
    const req = await this.prisma.requirement.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("Requirement not found");

    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        active: ["fulfilled", "cancelled"],
        fulfilled: [],
        cancelled: [],
      };
      if (!validTransitions[req.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${req.status} to ${data.status}`,
        );
      }
    }

    return this.prisma.requirement.update({ where: { id }, data });
  }

  async addShortlist(requirementId: string, data: any) {
    const req = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });
    if (!req) throw new NotFoundException("Requirement not found");

    return this.prisma.shortlist.create({
      data: {
        ...data,
        requirementId,
      },
    });
  }

  async updateShortlist(id: string, data: any) {
    const shortlist = await this.prisma.shortlist.findUnique({ where: { id } });
    if (!shortlist) throw new NotFoundException("Shortlist not found");

    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        pending: ["accepted", "rejected"],
        accepted: [],
        rejected: [],
      };
      if (!validTransitions[shortlist.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${shortlist.status} to ${data.status}`,
        );
      }
    }

    return this.prisma.shortlist.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
