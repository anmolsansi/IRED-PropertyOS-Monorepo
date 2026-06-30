import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  buildGeographyWhere,
  GeographicScope,
} from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

const EDITABLE_FIELDS = [
  "name",
  "propertyTypeId",
  "stateId",
  "cityId",
  "cityName",
  "zoneId",
  "localityId",
  "localityName",
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
  "commercialTerms",
  "additionalFields",
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

    const andConditions: any[] = [];

    if (filters.stateId) andConditions.push({ stateId: filters.stateId });
    if (filters.propertyTypeId) andConditions.push({ propertyTypeId: filters.propertyTypeId });
    if (filters.availabilityStatusId) andConditions.push({ availabilityStatusId: filters.availabilityStatusId });

    if (filters.cityId) {
      const cityForFilter = await this.prisma.city.findUnique({ where: { id: filters.cityId } });
      if (cityForFilter) {
        andConditions.push({
          OR: [
            { cityId: filters.cityId },
            { cityName: { equals: cityForFilter.name, mode: "insensitive" as const } },
          ]
        });
      } else {
        andConditions.push({ cityId: filters.cityId });
      }
    }

    if (filters.localityId) {
      const localityForFilter = await this.prisma.locality.findUnique({ where: { id: filters.localityId } });
      if (localityForFilter) {
        andConditions.push({
          OR: [
            { localityId: filters.localityId },
            { localityName: { equals: localityForFilter.name, mode: "insensitive" as const } },
          ]
        });
      } else {
        andConditions.push({ localityId: filters.localityId });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { buildingCode: { contains: search, mode: "insensitive" as const } },
          { fullAddress: { contains: search, mode: "insensitive" as const } },
          { cityName: { contains: search, mode: "insensitive" as const } },
          { localityName: { contains: search, mode: "insensitive" as const } },
        ]
      });
    }

    const where: any = {
      deletedAt: null,
      ...geoWhere,
    };

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

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

  async findOne(id: string, geographicScope?: GeographicScope) {
    const building = await this.prisma.building.findUnique({
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
    if (!building) throw new NotFoundException("Building not found");
    await verifyEntityGeography(
      this.prisma,
      geographicScope,
      building,
      "Building",
    );
    return building;
  }

  async create(data: any, userId: string) {
    const buildingCode =
      data.buildingCode || (await this.generateBuildingCode());
    const normalizedData = await this.resolveReferenceNames(data);

    return this.prisma.building.create({
      data: {
        ...normalizedData,
        buildingCode,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  private async resolveReferenceNames(data: any) {
    const {
      propertyTypeName,
      stateCode,
      stateName,
      sourceName,
      ...normalizedData
    } = data;

    if (!normalizedData.propertyTypeId && propertyTypeName) {
      const propertyType = await this.prisma.propertyType.upsert({
        where: { name: propertyTypeName },
        update: {},
        create: { name: propertyTypeName },
      });
      normalizedData.propertyTypeId = propertyType.id;
    }

    if (!normalizedData.stateId && (stateCode || stateName)) {
      const state = stateCode
        ? await this.prisma.state.upsert({
            where: { code: stateCode },
            update: stateName ? { name: stateName } : {},
            create: { code: stateCode, name: stateName || stateCode },
          })
        : await this.prisma.state.findFirst({
            where: { name: stateName, active: true },
          });

      if (state) normalizedData.stateId = state.id;
    }

    if (!normalizedData.sourceId && sourceName) {
      const source = await this.prisma.source.upsert({
        where: { name: sourceName },
        update: {},
        create: { name: sourceName },
      });
      normalizedData.sourceId = source.id;
    }

    if (normalizedData.cityName && !normalizedData.cityId && normalizedData.stateId) {
      const city = await this.prisma.city.findFirst({
        where: { name: normalizedData.cityName, stateId: normalizedData.stateId },
      });
      if (city) {
        normalizedData.cityId = city.id;
      } else {
        const newCity = await this.prisma.city.create({
          data: { name: normalizedData.cityName, stateId: normalizedData.stateId },
        });
        normalizedData.cityId = newCity.id;
      }
    }

    if (normalizedData.localityName && !normalizedData.localityId && normalizedData.cityId) {
      const locality = await this.prisma.locality.findFirst({
        where: { name: normalizedData.localityName, cityId: normalizedData.cityId },
      });
      if (locality) {
        normalizedData.localityId = locality.id;
      } else {
        const newLocality = await this.prisma.locality.create({
          data: { name: normalizedData.localityName, cityId: normalizedData.cityId },
        });
        normalizedData.localityId = newLocality.id;
      }
    }

    return normalizedData;
  }

  private async generateBuildingCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `BLD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const existing = await this.prisma.building.findUnique({
        where: { buildingCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }

    return `BLD-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
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
