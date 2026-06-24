import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType } from "@prisma/client";
import { GeographicScope } from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

const EDITABLE_FIELDS = [
  "floorName",
  "floorNumber",
  "totalArea",
  "availableArea",
  "availabilityStatusId",
  "notes",
];

@Injectable()
export class FloorsService {
  constructor(private prisma: PrismaService) {}

  async findByBuilding(buildingId: string, geographicScope?: GeographicScope) {
    if (geographicScope) {
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, stateId: true, cityId: true, localityId: true },
      });
      if (building) {
        await verifyEntityGeography(this.prisma, geographicScope, building, "Floor (building filter)");
      }
    }
    return this.prisma.floor.findMany({
      where: { buildingId, deletedAt: null },
      orderBy: { floorNumber: "asc" },
      include: {
        availabilityStatus: true,
        units: {
          where: { deletedAt: null },
          orderBy: { unitNumber: "asc" },
        },
      },
    });
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        availabilityStatus: true,
        units: {
          where: { deletedAt: null },
          orderBy: { unitNumber: "asc" },
        },
      },
    });
    if (!floor) throw new NotFoundException("Floor not found");
    // Floors are scoped through their building
    if (geographicScope && floor.building) {
      await verifyEntityGeography(this.prisma, geographicScope, floor.building, "Floor");
    }
    return floor;
  }

  async create(buildingId: string, data: any, userId: string) {
    return this.prisma.floor.create({
      data: {
        ...data,
        buildingId,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(id: string, data: any, userId: string, isAdmin: boolean) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) throw new NotFoundException("Floor not found");

    if (isAdmin) {
      return this.prisma.floor.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }

    const changes = diffFields(floor as any, data, EDITABLE_FIELDS);

    const changeRequest = await createChangeRequest(this.prisma, {
      entityType: EntityType.floor,
      entityId: id,
      requestedBy: userId,
      workerNote: data.workerNote,
      fields: changes,
    });

    if (!changeRequest) {
      return { message: "No changes detected", entityId: id };
    }

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "change_request_created",
        entityType: "floor",
        entityId: id,
        metadataJson: {
          changeRequestId: changeRequest.id,
          fieldsChanged: changes.map((c) => c.fieldName),
        },
      },
    });

    return changeRequest;
  }

  async softDelete(id: string) {
    return this.prisma.floor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    return this.prisma.floor.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
