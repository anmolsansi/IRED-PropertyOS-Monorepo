import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType } from "@prisma/client";
import { buildGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";

const EDITABLE_FIELDS = [
  "name",
  "propertyTypeId",
  "stateId",
  "cityId",
  "zoneId",
  "localityId",
  "microMarketId",
  "fullAddress",
  "landmark",
  "pincode",
  "googleMapsUrl",
  "latitude",
  "longitude",
  "totalFloors",
  "totalUnits",
  "totalBuildingArea",
  "availabilityStatusId",
  "sourceId",
  "parkingDetails",
  "liftDetails",
  "powerBackupDetails",
  "fireSafetyDetails",
  "waterAvailabilityDetails",
  "roadWidth",
  "frontage",
  "nearbyTransportDetails",
  "notes",
];

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      stateId?: string;
      cityId?: string;
      localityId?: string;
      propertyTypeId?: string;
      availabilityStatusId?: string;
      search?: string;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildGeographyWhere(geographicScope);

    const where = {
      deletedAt: null,
      ...geoWhere,
      ...(filters.stateId && { stateId: filters.stateId }),
      ...(filters.cityId && { cityId: filters.cityId }),
      ...(filters.localityId && { localityId: filters.localityId }),
      ...(filters.propertyTypeId && { propertyTypeId: filters.propertyTypeId }),
      ...(filters.availabilityStatusId && {
        availabilityStatusId: filters.availabilityStatusId,
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { buildingCode: { contains: search, mode: "insensitive" as const } },
          { fullAddress: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          state: true,
          city: true,
          locality: true,
          propertyType: true,
          availabilityStatus: true,
          verificationStatus: true,
        },
      }),
      this.prisma.building.count({ where }),
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

  async findOne(id: string) {
    return this.prisma.building.findUnique({
      where: { id },
      include: {
        state: true,
        city: true,
        zone: true,
        locality: true,
        microMarket: true,
        propertyType: true,
        availabilityStatus: true,
        verificationStatus: true,
        source: true,
        floors: {
          where: { deletedAt: null },
          orderBy: { floorNumber: "asc" },
        },
        contacts: {
          where: { deletedAt: null },
        },
      },
    });
  }

  async create(data: any, userId: string) {
    return this.prisma.building.create({
      data: {
        ...data,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(id: string, data: any, userId: string, isAdmin: boolean) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException("Building not found");

    if (isAdmin) {
      return this.prisma.building.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }

    const changes = diffFields(building as any, data, EDITABLE_FIELDS);

    const changeRequest = await createChangeRequest(this.prisma, {
      entityType: EntityType.building,
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
        entityType: "building",
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
    return this.prisma.building.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    return this.prisma.building.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
