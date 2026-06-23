import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../email/mail.service";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.role && { role: filters.role as UserRole }),
      ...(filters.status && { status: filters.status as UserStatus }),
      ...(filters.search && {
        OR: [
          {
            fullName: {
              contains: filters.search,
              mode: "insensitive" as const,
            },
          },
          { email: { contains: filters.search, mode: "insensitive" as const } },
          { mobileNumber: { contains: filters.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          mobileNumber: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              geographicAssignments: true,
              createdBuildings: true,
              assignedUnits: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        mobileNumber: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        mobileVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        geographicAssignments: {
          where: { active: true },
          include: { state: true, city: true },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async invite(data: {
    email: string;
    fullName: string;
    mobileNumber?: string;
    role: UserRole;
    stateIds?: string[];
    cityIds?: string[];
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException("A user with this email already exists");
    }

    const tempPassword = randomBytes(12).toString("base64url");
    const passwordHash = await argon2.hash(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        passwordHash,
        role: data.role,
        status: "active",
      },
    });

    if (data.stateIds || data.cityIds) {
      const assignments: any[] = [];
      if (data.stateIds) {
        for (const stateId of data.stateIds) {
          assignments.push({
            userId: user.id,
            stateId,
            assignmentType: "state",
          });
        }
      }
      if (data.cityIds) {
        for (const cityId of data.cityIds) {
          assignments.push({ userId: user.id, cityId, assignmentType: "city" });
        }
      }
      await this.prisma.workerGeographicAssignment.createMany({
        data: assignments,
      });
    }

    this.logger.log(`Worker invited: ${user.email} (${user.role})`);

    return {
      id: user.id,
      email: user.email,
      tempPassword,
      message: "Worker invited. Share the temporary password securely.",
    };
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    const updateData: any = { status };
    if (status === "inactive" || status === "suspended") {
      updateData.deactivatedAt = new Date();
    } else {
      updateData.deactivatedAt = null;
    }

    return this.prisma.user.update({ where: { id }, data: updateData });
  }

  async update(
    id: string,
    data: {
      email?: string;
      fullName?: string;
      mobileNumber?: string;
      role?: UserRole;
      status?: UserStatus;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    const updateData: any = {};
    if (data.email) updateData.email = data.email.toLowerCase().trim();
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.mobileNumber !== undefined)
      updateData.mobileNumber = data.mobileNumber;
    if (data.role) updateData.role = data.role;
    if (data.status) {
      updateData.status = data.status;
      updateData.deactivatedAt =
        data.status === "inactive" || data.status === "suspended"
          ? new Date()
          : null;
    }

    return this.prisma.user.update({ where: { id }, data: updateData });
  }

  async assignGeographicScope(
    userId: string,
    assignments: {
      assignmentType: "state" | "city" | "locality";
      stateId?: string;
      cityId?: string;
      localityId?: string;
    }[],
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.workerGeographicAssignment.updateMany({
      where: { userId, active: true },
      data: { active: false },
    });

    const newAssignments = assignments.map((a) => ({
      userId,
      assignmentType: a.assignmentType,
      stateId: a.stateId || null,
      cityId: a.cityId || null,
      localityId: a.localityId || null,
    }));

    await this.prisma.workerGeographicAssignment.createMany({
      data: newAssignments,
    });

    return this.prisma.workerGeographicAssignment.findMany({
      where: { userId, active: true },
      include: { state: true, city: true },
    });
  }

  async reassignUnits(fromWorkerId: string, toWorkerId: string) {
    const fromWorker = await this.prisma.user.findUnique({
      where: { id: fromWorkerId },
    });
    const toWorker = await this.prisma.user.findUnique({
      where: { id: toWorkerId },
    });

    if (!fromWorker) throw new NotFoundException("Source worker not found");
    if (!toWorker) throw new NotFoundException("Target worker not found");

    const result = await this.prisma.unit.updateMany({
      where: { assignedWorkerId: fromWorkerId, deletedAt: null },
      data: { assignedWorkerId: toWorkerId },
    });

    await this.prisma.auditEvent.create({
      data: {
        eventType: "units_reassigned",
        entityType: "user",
        entityId: fromWorkerId,
        metadataJson: {
          fromWorkerId,
          toWorkerId,
          unitCount: result.count,
        },
      },
    });

    return { reassignCount: result.count };
  }

  async resetPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const tempPassword = randomBytes(12).toString("base64url");
    const passwordHash = await argon2.hash(tempPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    return {
      tempPassword,
      message: "Password reset. Share the temporary password securely.",
    };
  }
}
