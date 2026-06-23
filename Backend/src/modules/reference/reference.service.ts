import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}

  async findAllStates() {
    return this.prisma.state.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findCitiesByState(stateId: string) {
    return this.prisma.city.findMany({
      where: { stateId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async findLocalitiesByCity(cityId: string) {
    return this.prisma.locality.findMany({
      where: { cityId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async findMicroMarketsByLocality(localityId: string) {
    return this.prisma.microMarket.findMany({
      where: { localityId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllPropertyTypes() {
    return this.prisma.propertyType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllFurnishingStatuses() {
    return this.prisma.furnishingStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllAvailabilityStatuses() {
    return this.prisma.availabilityStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllVerificationStatuses() {
    return this.prisma.verificationStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllContactRoles() {
    return this.prisma.contactRole.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllDocumentCategories() {
    return this.prisma.documentCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllSources() {
    return this.prisma.source.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllZones() {
    return this.prisma.zone.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findZonesByCity(cityId: string) {
    return this.prisma.zone.findMany({
      where: { cityId, active: true },
      orderBy: { name: "asc" },
    });
  }
}
