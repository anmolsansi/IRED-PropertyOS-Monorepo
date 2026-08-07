import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType, TelecallerStatus } from "@prisma/client";
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

const ACTIVE_INTAKE_STATUSES = ["NEW", "IN_PROGRESS", "FOLLOW_UP"] as const;
type IntakeStatus = (typeof ACTIVE_INTAKE_STATUSES)[number] | "COMPLETED";

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

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    if (filters.cityId) {
      if (isUuid(filters.cityId)) {
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
      } else {
        andConditions.push({ cityName: { equals: filters.cityId, mode: "insensitive" as const } });
      }
    }

    if (filters.localityId) {
      if (isUuid(filters.localityId)) {
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
      } else {
        andConditions.push({ localityName: { equals: filters.localityId, mode: "insensitive" as const } });
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
      telecallerStatus: TelecallerStatus.VERIFIED,
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
          creator: true,
          updater: true,
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

  async findIntake(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: IntakeStatus;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;
    const geoWhere = buildGeographyWhere(geographicScope);
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { buildingCode: { contains: search, mode: "insensitive" as const } },
          { fullAddress: { contains: search, mode: "insensitive" as const } },
          { cityName: { contains: search, mode: "insensitive" as const } },
          { localityName: { contains: search, mode: "insensitive" as const } },
          { creator: { fullName: { contains: search, mode: "insensitive" as const } } },
        ],
      });
    }

    if (status === "NEW") {
      andConditions.push({ telecallerStatus: TelecallerStatus.BLANK });
    } else if (status === "IN_PROGRESS" || status === "FOLLOW_UP") {
      andConditions.push({
        additionalFields: {
          path: ["intakeStatus"],
          equals: status,
        },
      });
    }

    const where: any = {
      deletedAt: null,
      telecallerStatus: { not: TelecallerStatus.VERIFIED },
      ...geoWhere,
    };

    if (andConditions.length > 0) where.AND = andConditions;

    const [data, total, newCount, inProgressCount, followUpCount] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          state: true,
          city: true,
          locality: true,
          propertyType: true,
          creator: true,
          updater: true,
          _count: {
            select: {
              contacts: { where: { deletedAt: null } },
              media: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.building.count({ where }),
      this.prisma.building.count({
        where: {
          deletedAt: null,
          telecallerStatus: TelecallerStatus.BLANK,
          ...geoWhere,
        },
      }),
      this.prisma.building.count({
        where: {
          deletedAt: null,
          telecallerStatus: TelecallerStatus.REVIEW_NEEDED,
          additionalFields: { path: ["intakeStatus"], equals: "IN_PROGRESS" },
          ...geoWhere,
        },
      }),
      this.prisma.building.count({
        where: {
          deletedAt: null,
          telecallerStatus: TelecallerStatus.REVIEW_NEEDED,
          additionalFields: { path: ["intakeStatus"], equals: "FOLLOW_UP" },
          ...geoWhere,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total: newCount + inProgressCount + followUpCount,
        new: newCount,
        inProgress: inProgressCount,
        followUp: followUpCount,
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
        creator: true,
        updater: true,
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

    const { contacts, ...restData } = normalizedData;
    const now = new Date().toISOString();

    const createPayload: any = {
      ...restData,
      additionalFields: this.mergeIntakeMetadata(restData.additionalFields, {
        intakeStatus: "NEW",
        intakeSubmittedAt: now,
        intakeSubmittedBy: userId,
      }),
      telecallerStatus: TelecallerStatus.BLANK,
      buildingCode,
      createdBy: userId,
      updatedBy: userId,
    };

    if (contacts && Array.isArray(contacts)) {
      createPayload.contacts = {
        create: contacts.map((c: any) => ({
          fullName: c.name,
          mobileNumber: c.phone || null,
          email: c.email || null,
          notes: [c.contactType ? `Type: ${c.contactType}` : null, c.designation ? `Designation: ${c.designation}` : null, c.isPrimary ? "Primary Contact" : null].filter(Boolean).join(", "),
        })),
      };
    }

    const building = await this.prisma.building.create({
      data: createPayload,
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "property_submitted_to_intake",
        entityType: "building",
        entityId: building.id,
        metadataJson: { intakeStatus: "NEW" },
      },
    });

    return building;
  }

  private mergeIntakeMetadata(existing: any, patch: Record<string, unknown>) {
    const base =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? existing
        : existing
          ? { fields: existing }
          : {};
    return { ...base, ...patch };
  }

  private getIntakeStatus(additionalFields: any): IntakeStatus {
    if (
      additionalFields &&
      typeof additionalFields === "object" &&
      !Array.isArray(additionalFields) &&
      typeof additionalFields.intakeStatus === "string"
    ) {
      return additionalFields.intakeStatus as IntakeStatus;
    }
    return "NEW";
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

  async update(
    id: string,
    data: any,
    userId: string,
    isAdmin: boolean,
    isRider = false,
  ) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException("Building not found");

    const isActiveIntake = building.telecallerStatus !== TelecallerStatus.VERIFIED;

    if (isAdmin || (isActiveIntake && !isRider)) {
      const { contacts, ...restData } = data;
      const updatePayload: any = { ...restData, updatedBy: userId };

      if (isActiveIntake) {
        const currentStatus = this.getIntakeStatus(building.additionalFields);
        updatePayload.additionalFields = this.mergeIntakeMetadata(
          restData.additionalFields ?? building.additionalFields,
          {
            intakeStatus: currentStatus,
            intakeLastEditedAt: new Date().toISOString(),
            intakeLastEditedBy: userId,
          },
        );
      }

      if (contacts && Array.isArray(contacts)) {
        updatePayload.contacts = {
          deleteMany: {},
          create: contacts.map((c: any) => ({
            fullName: c.name,
            mobileNumber: c.phone || null,
            email: c.email || null,
            notes: [c.contactType ? `Type: ${c.contactType}` : null, c.designation ? `Designation: ${c.designation}` : null, c.isPrimary ? "Primary Contact" : null].filter(Boolean).join(", "),
          })),
        };
      }

      const updated = await this.prisma.building.update({
        where: { id },
        data: updatePayload,
      });

      if (isActiveIntake) {
        await this.prisma.auditEvent.create({
          data: {
            actorUserId: userId,
            eventType: "property_intake_updated",
            entityType: "building",
            entityId: id,
            metadataJson: { intakeStatus: this.getIntakeStatus(updated.additionalFields) },
          },
        });
      }

      return updated;
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

  async updateIntakeStatus(id: string, status: string, userId: string) {
    if (!ACTIVE_INTAKE_STATUSES.includes(status as any)) {
      throw new BadRequestException(
        `Invalid intake status. Expected one of: ${ACTIVE_INTAKE_STATUSES.join(", ")}`,
      );
    }

    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException("Building not found");
    if (building.telecallerStatus === TelecallerStatus.VERIFIED) {
      throw new BadRequestException("Completed properties cannot be moved back to intake");
    }

    const now = new Date().toISOString();
    const nextTelecallerStatus =
      status === "NEW"
        ? TelecallerStatus.BLANK
        : TelecallerStatus.REVIEW_NEEDED;

    const additionalFields = this.mergeIntakeMetadata(building.additionalFields, {
      intakeStatus: status,
      intakeLastEditedAt: now,
      intakeLastEditedBy: userId,
      ...(status === "IN_PROGRESS" ? { intakeStartedAt: now, intakeStartedBy: userId } : {}),
      ...(status === "FOLLOW_UP" ? { intakeFollowUpAt: now, intakeFollowUpBy: userId } : {}),
    });

    const updated = await this.prisma.building.update({
      where: { id },
      data: {
        telecallerStatus: nextTelecallerStatus,
        additionalFields,
        updatedBy: userId,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "property_intake_status_changed",
        entityType: "building",
        entityId: id,
        metadataJson: { intakeStatus: status },
      },
    });

    return updated;
  }

  async completeIntake(id: string, userId: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        contacts: { where: { deletedAt: null } },
      },
    });
    if (!building) throw new NotFoundException("Building not found");
    if (building.telecallerStatus === TelecallerStatus.VERIFIED) return building;

    const missing: string[] = [];
    if (!building.name?.trim()) missing.push("property name");
    if (!building.fullAddress?.trim()) missing.push("full address");
    if (!building.stateId) missing.push("state");
    if (!building.cityId && !building.cityName?.trim()) missing.push("city");
    if (building.contacts.length === 0) missing.push("at least one contact");

    if (missing.length > 0) {
      throw new BadRequestException(
        `Complete the following before adding to Properties: ${missing.join(", ")}`,
      );
    }

    const now = new Date().toISOString();
    const additionalFields = this.mergeIntakeMetadata(building.additionalFields, {
      intakeStatus: "COMPLETED",
      intakeCompletedAt: now,
      intakeCompletedBy: userId,
      intakeLastEditedAt: now,
      intakeLastEditedBy: userId,
    });

    const updated = await this.prisma.building.update({
      where: { id },
      data: {
        telecallerStatus: TelecallerStatus.VERIFIED,
        additionalFields,
        updatedBy: userId,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "property_intake_completed",
        entityType: "building",
        entityId: id,
        metadataJson: { intakeStatus: "COMPLETED" },
      },
    });

    return updated;
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
