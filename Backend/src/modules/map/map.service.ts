import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  async findByBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) {
    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
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

  async findNearby(lat: number, lng: number, radiusKm: number = 5) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
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
