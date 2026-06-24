import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { buildGeographyWhere, buildLinkedGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchProperties(
    query: {
      stateId?: string;
      cityId?: string;
      localityId?: string;
      propertyTypeId?: string;
      furnishingStatusId?: string;
      availabilityStatusId?: string;
      verificationStatusId?: string;
      minArea?: number;
      maxArea?: number;
      minRent?: number;
      maxRent?: number;
      minBuildingArea?: number;
      maxBuildingArea?: number;
      assignedWorkerId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildGeographyWhere(geographicScope);

    const where: any = {
      deletedAt: null,
      ...geoWhere,
      ...(filters.stateId && { stateId: filters.stateId }),
      ...(filters.cityId && { cityId: filters.cityId }),
      ...(filters.localityId && { localityId: filters.localityId }),
      ...(filters.propertyTypeId && { propertyTypeId: filters.propertyTypeId }),
      ...(filters.furnishingStatusId && {
        units: {
          some: {
            furnishingStatusId: filters.furnishingStatusId,
            deletedAt: null,
          },
        },
      }),
      ...(filters.availabilityStatusId && {
        availabilityStatusId: filters.availabilityStatusId,
      }),
      ...(filters.verificationStatusId && {
        verificationStatusId: filters.verificationStatusId,
      }),
      ...(filters.minBuildingArea && {
        totalBuildingArea: { gte: filters.minBuildingArea },
      }),
      ...(filters.maxBuildingArea && {
        totalBuildingArea: { lte: filters.maxBuildingArea },
      }),
      ...(filters.assignedWorkerId && {
        units: {
          some: { assignedWorkerId: filters.assignedWorkerId, deletedAt: null },
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { buildingCode: { contains: search, mode: "insensitive" as const } },
          { fullAddress: { contains: search, mode: "insensitive" as const } },
          { landmark: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    if (filters.minRent || filters.maxRent) {
      where.units = {
        ...where.units,
        some: {
          ...(where.units?.some || {}),
          ...(filters.minRent && { monthlyRent: { gte: filters.minRent } }),
          ...(filters.maxRent && { monthlyRent: { lte: filters.maxRent } }),
          deletedAt: null,
        },
      };
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
          _count: { select: { units: true, floors: true } },
        },
      }),
      this.prisma.building.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async searchUnits(
    query: {
      buildingId?: string;
      availabilityStatusId?: string;
      propertyTypeId?: string;
      furnishingStatusId?: string;
      minRent?: number;
      maxRent?: number;
      minArea?: number;
      maxArea?: number;
      search?: string;
      page?: number;
      limit?: number;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildLinkedGeographyWhere(geographicScope);

    const where: any = {
      deletedAt: null,
      ...geoWhere,
      ...(filters.buildingId && { buildingId: filters.buildingId }),
      ...(filters.availabilityStatusId && {
        availabilityStatusId: filters.availabilityStatusId,
      }),
      ...(filters.propertyTypeId && { propertyTypeId: filters.propertyTypeId }),
      ...(filters.furnishingStatusId && {
        furnishingStatusId: filters.furnishingStatusId,
      }),
      ...(filters.minRent && { monthlyRent: { gte: filters.minRent } }),
      ...(filters.maxRent && { monthlyRent: { lte: filters.maxRent } }),
      ...(filters.minArea && { carpetArea: { gte: filters.minArea } }),
      ...(filters.maxArea && { carpetArea: { lte: filters.maxArea } }),
      ...(search && {
        OR: [
          { unitNumber: { contains: search, mode: "insensitive" as const } },
          { unitCode: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          building: { select: { id: true, name: true, buildingCode: true } },
          floor: { select: { id: true, floorName: true, floorNumber: true } },
          propertyType: true,
          furnishingStatus: true,
          availabilityStatus: true,
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async searchContacts(
    query: {
      contactRoleId?: string;
      verificationStatusId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    // Contacts are scoped through their building
    const geoWhere = geographicScope
      ? { building: buildGeographyWhere(geographicScope, "building") }
      : {};

    const where: any = {
      deletedAt: null,
      ...geoWhere,
      ...(filters.contactRoleId && { contactRoleId: filters.contactRoleId }),
      ...(filters.verificationStatusId && {
        verificationStatusId: filters.verificationStatusId,
      }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { mobileNumber: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          contactRole: true,
          verificationStatus: true,
          building: { select: { id: true, name: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
