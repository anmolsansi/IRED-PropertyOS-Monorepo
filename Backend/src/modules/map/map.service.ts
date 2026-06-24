import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { buildGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  async findByBounds(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    geographicScope?: GeographicScope,
  ) {
    const geoWhere = buildGeographyWhere(geographicScope);

    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
        ...geoWhere,
        latitude: { gte: bounds.south, lte: bounds.north },
        longitude: { gte: bounds.west, lte: bounds.east },
      },
      select: {
        id: true,
        name: true,
        buildingCode: true,
        latitude: true,
        longitude: true,
        city: { select: { name: true } },
        locality: { select: { name: true } },
        propertyType: { select: { name: true } },
        availabilityStatus: { select: { name: true } },
        totalBuildingArea: true,
        totalUnits: true,
      },
    });
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number = 5,
    geographicScope?: GeographicScope,
  ) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const geoWhere = buildGeographyWhere(geographicScope);

    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
        ...geoWhere,
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      select: {
        id: true,
        name: true,
        buildingCode: true,
        latitude: true,
        longitude: true,
        city: { select: { name: true } },
        locality: { select: { name: true } },
        propertyType: { select: { name: true } },
        availabilityStatus: { select: { name: true } },
        totalBuildingArea: true,
        totalUnits: true,
      },
    });
  }
}
