import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ChangeRequestStatus,
  ChangeItemStatus,
  EntityType,
  SnapshotSource,
} from "@prisma/client";
import { GeographicScope } from "../../shared/utils/geography-filter";

@Injectable()
export class ChangeRequestsService {
  private readonly logger = new Logger(ChangeRequestsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      entityType?: string;
      cityId?: string;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = geographicScope
      ? await this.buildChangeRequestGeographyWhere(geographicScope)
      : {};

    const where = {
      ...geoWhere,
      ...(filters.status && { status: filters.status as ChangeRequestStatus }),
      ...(filters.entityType && {
        entityType: filters.entityType as EntityType,
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          requestedByUser: true,
          reviewedByUser: true,
          changeItems: true,
        },
      }),
      this.prisma.changeRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        requestedByUser: true,
        reviewedByUser: true,
        changeItems: {
          orderBy: { fieldName: "asc" },
        },
      },
    });

    if (!request) throw new NotFoundException("Change request not found");

    // Change requests are scoped through their entity's building
    if (geographicScope && request.entityId) {
      const masterData = await this.getMasterData(
        request.entityType,
        request.entityId,
      );
      if (masterData && masterData.buildingId) {
        const { verifyEntityGeography } =
          await import("../../shared/utils/verify-entity-geography");
        const building = await this.prisma.building.findUnique({
          where: { id: masterData.buildingId },
          select: { id: true, stateId: true, cityId: true, localityId: true },
        });
        if (building) {
          await verifyEntityGeography(
            this.prisma,
            geographicScope,
            building,
            "Change request",
          );
        }
      }
    }

    let masterData: any = null;
    if (request.entityId) {
      masterData = await this.getMasterData(
        request.entityType,
        request.entityId,
      );
    }

    return { ...request, masterData };
  }

  async withdraw(id: string, userId: string) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
    });

    if (!request) throw new NotFoundException("Change request not found");

    if (request.requestedBy !== userId) {
      throw new ForbiddenException(
        "Only the requester can withdraw this request",
      );
    }

    if (request.status !== "pending") {
      throw new BadRequestException("Can only withdraw pending requests");
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: { status: "withdrawn", closedAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "change_request_withdrawn",
        entityType: request.entityType,
        entityId: request.entityId,
        metadataJson: { changeRequestId: id },
      },
    });

    return updated;
  }

  async approveItems(
    id: string,
    items: { changeItemId: string; finalValue?: string; comment?: string }[],
    adminId: string,
  ) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { changeItems: true },
    });

    if (!request) throw new NotFoundException("Change request not found");
    if (request.status === "withdrawn") {
      throw new BadRequestException("Cannot approve withdrawn request");
    }
    if (request.status === "approved") {
      throw new BadRequestException("Request already fully approved");
    }

    const currentEntity = await this.getMasterData(
      request.entityType,
      request.entityId,
    );
    if (!currentEntity) {
      throw new NotFoundException("Referenced entity no longer exists");
    }

    const snapshot = await this.createVersionSnapshot(
      request.entityType,
      request.entityId,
      currentEntity,
      SnapshotSource.approval,
      adminId,
    );

    const approvedFieldUpdates: Record<string, unknown> = {};

    for (const item of items) {
      const changeItem = request.changeItems.find(
        (ci) => ci.id === item.changeItemId,
      );
      if (!changeItem) continue;

      const finalValue =
        item.finalValue !== undefined
          ? item.finalValue
          : (changeItem.proposedValueJson as string);

      await this.prisma.changeItem.update({
        where: { id: item.changeItemId },
        data: {
          status: ChangeItemStatus.approved,
          finalValueJson: finalValue,
          adminComment: item.comment || null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      approvedFieldUpdates[changeItem.fieldName] = this.parseValue(finalValue);
    }

    if (Object.keys(approvedFieldUpdates).length > 0) {
      await this.applyToMasterData(
        request.entityType,
        request.entityId,
        approvedFieldUpdates,
      );
    }

    const allItems = await this.prisma.changeItem.findMany({
      where: { changeRequestId: id },
    });

    const allReviewed = allItems.every(
      (ci) => ci.status !== ChangeItemStatus.pending,
    );
    const anyApproved = allItems.some(
      (ci) => ci.status === ChangeItemStatus.approved,
    );

    let newStatus: ChangeRequestStatus;
    if (allReviewed) {
      newStatus = anyApproved
        ? ChangeRequestStatus.approved
        : ChangeRequestStatus.rejected;
    } else {
      newStatus = ChangeRequestStatus.partially_approved;
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        closedAt: allReviewed ? new Date() : null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: adminId,
        eventType: "change_request_items_approved",
        entityType: request.entityType,
        entityId: request.entityId,
        metadataJson: {
          changeRequestId: id,
          approvedFields: Object.keys(approvedFieldUpdates),
          snapshotId: snapshot.id,
          newStatus,
        },
      },
    });

    return updated;
  }

  async rejectItems(
    id: string,
    items: { changeItemId: string; comment: string }[],
    adminId: string,
  ) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { changeItems: true },
    });

    if (!request) throw new NotFoundException("Change request not found");
    if (request.status === "withdrawn") {
      throw new BadRequestException("Cannot reject withdrawn request");
    }

    for (const item of items) {
      await this.prisma.changeItem.update({
        where: { id: item.changeItemId },
        data: {
          status: ChangeItemStatus.rejected,
          adminComment: item.comment,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    const allItems = await this.prisma.changeItem.findMany({
      where: { changeRequestId: id },
    });

    const allReviewed = allItems.every(
      (ci) => ci.status !== ChangeItemStatus.pending,
    );
    const anyApproved = allItems.some(
      (ci) => ci.status === ChangeItemStatus.approved,
    );

    let newStatus: ChangeRequestStatus;
    if (allReviewed) {
      newStatus = anyApproved
        ? ChangeRequestStatus.partially_approved
        : ChangeRequestStatus.rejected;
    } else {
      newStatus = ChangeRequestStatus.partially_approved;
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        closedAt: allReviewed ? new Date() : null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: adminId,
        eventType: "change_request_items_rejected",
        entityType: request.entityType,
        entityId: request.entityId,
        metadataJson: {
          changeRequestId: id,
          rejectedFields: items.map((i) => i.changeItemId),
        },
      },
    });

    return updated;
  }

  async resolveConflict(
    id: string,
    changeItemId: string,
    finalValue: string,
    adminId: string,
  ) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { changeItems: true },
    });

    if (!request) throw new NotFoundException("Change request not found");

    const changeItem = request.changeItems.find((ci) => ci.id === changeItemId);
    if (!changeItem) throw new NotFoundException("Change item not found");
    if (changeItem.status !== ChangeItemStatus.conflict) {
      throw new BadRequestException("Item is not in conflict status");
    }

    const currentEntity = await this.getMasterData(
      request.entityType,
      request.entityId,
    );
    if (currentEntity) {
      await this.createVersionSnapshot(
        request.entityType,
        request.entityId,
        currentEntity,
        SnapshotSource.admin_update,
        adminId,
      );
    }

    await this.prisma.changeItem.update({
      where: { id: changeItemId },
      data: {
        status: ChangeItemStatus.approved,
        finalValueJson: finalValue,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.applyToMasterData(request.entityType, request.entityId, {
      [changeItem.fieldName]: this.parseValue(finalValue),
    });

    const allItems = await this.prisma.changeItem.findMany({
      where: { changeRequestId: id },
    });
    const allReviewed = allItems.every(
      (ci) => ci.status !== ChangeItemStatus.pending,
    );
    const hasConflicts = allItems.some(
      (ci) => ci.status === ChangeItemStatus.conflict,
    );

    let newStatus: ChangeRequestStatus;
    if (hasConflicts) {
      newStatus = ChangeRequestStatus.conflict;
    } else if (allReviewed) {
      const anyApproved = allItems.some(
        (ci) => ci.status === ChangeItemStatus.approved,
      );
      newStatus = anyApproved
        ? ChangeRequestStatus.approved
        : ChangeRequestStatus.rejected;
    } else {
      newStatus = ChangeRequestStatus.partially_approved;
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        closedAt: allReviewed && !hasConflicts ? new Date() : null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: adminId,
        eventType: "conflict_resolved",
        entityType: request.entityType,
        entityId: request.entityId,
        metadataJson: {
          changeRequestId: id,
          changeItemId,
          fieldName: changeItem.fieldName,
        },
      },
    });

    return updated;
  }

  private async buildChangeRequestGeographyWhere(scope: GeographicScope) {
    if (scope.denyAll) {
      return { entityId: "00000000-0000-0000-0000-000000000000" };
    }

    const hasScope =
      scope.stateIds.length > 0 ||
      scope.cityIds.length > 0 ||
      scope.localityIds.length > 0;
    if (!hasScope) return {};

    const buildingFilter: any = {};
    if (scope.stateIds.length > 0)
      buildingFilter.stateId = { in: scope.stateIds };
    if (scope.cityIds.length > 0) buildingFilter.cityId = { in: scope.cityIds };
    if (scope.localityIds.length > 0)
      buildingFilter.localityId = { in: scope.localityIds };

    const buildings = await this.prisma.building.findMany({
      where: buildingFilter,
      select: { id: true },
    });
    const buildingIds = buildings.map((b) => b.id);

    return { entityId: { in: buildingIds } };
  }

  private async getMasterData(entityType: string, entityId: string) {
    const modelMap: Record<string, string> = {
      building: "building",
      floor: "floor",
      unit: "unit",
      contact: "contact",
    };

    const modelName = modelMap[entityType];
    if (!modelName) return null;

    return (this.prisma as any)[modelName].findUnique({
      where: { id: entityId },
    });
  }

  private async applyToMasterData(
    entityType: string,
    entityId: string,
    updates: Record<string, unknown>,
  ) {
    const modelMap: Record<string, string> = {
      building: "building",
      floor: "floor",
      unit: "unit",
      contact: "contact",
    };

    const modelName = modelMap[entityType];
    if (!modelName) return;

    await (this.prisma as any)[modelName].update({
      where: { id: entityId },
      data: updates,
    });
  }

  private async createVersionSnapshot(
    entityType: string,
    entityId: string,
    snapshotData: unknown,
    source: SnapshotSource,
    userId: string,
  ) {
    const lastSnapshot = await this.prisma.versionSnapshot.findFirst({
      where: { entityType, entityId },
      orderBy: { versionNumber: "desc" },
    });

    const versionNumber = (lastSnapshot?.versionNumber || 0) + 1;

    return this.prisma.versionSnapshot.create({
      data: {
        entityType,
        entityId,
        versionNumber,
        snapshotJson: snapshotData as any,
        source,
        createdBy: userId,
      },
    });
  }

  private parseValue(value: string): unknown {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (value === "undefined") return undefined;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
