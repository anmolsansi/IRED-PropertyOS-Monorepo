import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SnapshotSource, RequirementStatus } from "@prisma/client";

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private prisma: PrismaService) {}

  async getExportableData(
    entityType: string,
    filters: Record<string, any> = {},
  ) {
    switch (entityType) {
      case "buildings":
        return this.exportBuildings(filters);
      case "units":
        return this.exportUnits(filters);
      case "contacts":
        return this.exportContacts(filters);
      case "clients":
        return this.exportClients(filters);
      case "deals":
        return this.exportDeals(filters);
      default:
        throw new NotFoundException(`Unknown entity type: ${entityType}`);
    }
  }

  private async exportBuildings(filters: Record<string, any>) {
    const where: any = { deletedAt: null, ...filters };
    const data = await this.prisma.building.findMany({
      where,
      include: {
        state: { select: { name: true } },
        city: { select: { name: true } },
        locality: { select: { name: true } },
        propertyType: { select: { name: true } },
        availabilityStatus: { select: { name: true } },
        verificationStatus: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      headers: [
        "Building Code",
        "Name",
        "State",
        "City",
        "Locality",
        "Property Type",
        "Address",
        "Total Floors",
        "Total Units",
        "Total Area",
        "Availability",
        "Verification",
        "Notes",
      ],
      rows: data.map((b) => [
        b.buildingCode,
        b.name,
        b.state?.name || "",
        b.city?.name || "",
        b.locality?.name || "",
        b.propertyType?.name || "",
        b.fullAddress || "",
        b.totalFloors || "",
        b.totalUnits || "",
        b.totalBuildingArea || "",
        b.availabilityStatus?.name || "",
        b.verificationStatus?.name || "",
        b.notes || "",
      ]),
    };
  }

  private async exportUnits(filters: Record<string, any>) {
    const where: any = { deletedAt: null, ...filters };
    const data = await this.prisma.unit.findMany({
      where,
      include: {
        building: { select: { name: true, buildingCode: true } },
        floor: { select: { floorName: true } },
        propertyType: { select: { name: true } },
        furnishingStatus: { select: { name: true } },
        availabilityStatus: { select: { name: true } },
      },
      orderBy: { unitNumber: "asc" },
    });

    return {
      headers: [
        "Unit Code",
        "Unit Number",
        "Building",
        "Floor",
        "Property Type",
        "Carpet Area",
        "Built Up Area",
        "Monthly Rent",
        "Furnishing",
        "Availability",
        "Notes",
      ],
      rows: data.map((u) => [
        u.unitCode,
        u.unitNumber,
        u.building?.name || "",
        u.floor?.floorName || "",
        u.propertyType?.name || "",
        u.carpetArea || "",
        u.builtUpArea || "",
        u.monthlyRent || "",
        u.furnishingStatus?.name || "",
        u.availabilityStatus?.name || "",
        u.notes || "",
      ]),
    };
  }

  private async exportContacts(filters: Record<string, any>) {
    const where: any = { deletedAt: null, ...filters };
    const data = await this.prisma.contact.findMany({
      where,
      include: {
        contactRole: { select: { name: true } },
        building: { select: { name: true } },
      },
      orderBy: { fullName: "asc" },
    });

    return {
      headers: [
        "Full Name",
        "Mobile",
        "Email",
        "Role",
        "Building",
        "WhatsApp",
        "Preferred Communication",
        "Notes",
      ],
      rows: data.map((c) => [
        c.fullName,
        c.mobileNumber || "",
        c.email || "",
        c.contactRole?.name || "",
        c.building?.name || "",
        c.whatsappNumber || "",
        c.preferredCommunicationMethod || "",
        c.notes || "",
      ]),
    };
  }

  private async exportClients(filters: Record<string, any>) {
    const data = await this.prisma.client.findMany({
      where: filters,
      include: {
        _count: { select: { requirements: true, deals: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      headers: ["Name", "Company", "Email", "Mobile", "Requirements", "Deals"],
      rows: data.map((c) => [
        c.name,
        c.company || "",
        c.email || "",
        c.mobileNumber || "",
        c._count.requirements,
        c._count.deals,
      ]),
    };
  }

  private async exportDeals(filters: Record<string, any>) {
    const data = await this.prisma.deal.findMany({
      where: filters,
      include: {
        client: { select: { name: true } },
        building: { select: { name: true } },
        unit: { select: { unitNumber: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      headers: [
        "Title",
        "Client",
        "Building",
        "Unit",
        "Deal Value",
        "Status",
        "Assigned To",
        "Created At",
      ],
      rows: data.map((d) => [
        d.title,
        d.client?.name || "",
        d.building?.name || "",
        d.unit?.unitNumber || "",
        d.dealValue || "",
        d.status,
        d.assignee?.fullName || "",
        d.createdAt.toISOString().split("T")[0],
      ]),
    };
  }
}
