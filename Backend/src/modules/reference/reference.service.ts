import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const INDIAN_STATES = [
  { name: "Andhra Pradesh", code: "AP" },
  { name: "Arunachal Pradesh", code: "AR" },
  { name: "Assam", code: "AS" },
  { name: "Bihar", code: "BR" },
  { name: "Chhattisgarh", code: "CG" },
  { name: "Goa", code: "GA" },
  { name: "Gujarat", code: "GJ" },
  { name: "Haryana", code: "HR" },
  { name: "Himachal Pradesh", code: "HP" },
  { name: "Jharkhand", code: "JH" },
  { name: "Karnataka", code: "KA" },
  { name: "Kerala", code: "KL" },
  { name: "Madhya Pradesh", code: "MP" },
  { name: "Maharashtra", code: "MH" },
  { name: "Manipur", code: "MN" },
  { name: "Meghalaya", code: "ML" },
  { name: "Mizoram", code: "MZ" },
  { name: "Nagaland", code: "NL" },
  { name: "Odisha", code: "OD" },
  { name: "Punjab", code: "PB" },
  { name: "Rajasthan", code: "RJ" },
  { name: "Sikkim", code: "SK" },
  { name: "Tamil Nadu", code: "TN" },
  { name: "Telangana", code: "TS" },
  { name: "Tripura", code: "TR" },
  { name: "Uttar Pradesh", code: "UP" },
  { name: "Uttarakhand", code: "UK" },
  { name: "West Bengal", code: "WB" },
  { name: "Andaman and Nicobar Islands", code: "AN" },
  { name: "Chandigarh", code: "CH" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN" },
  { name: "Delhi", code: "DL" },
  { name: "Jammu and Kashmir", code: "JK" },
  { name: "Ladakh", code: "LA" },
  { name: "Lakshadweep", code: "LD" },
  { name: "Puducherry", code: "PY" },
];

const PROPERTY_TYPES = [
  "Office",
  "Retail",
  "Warehouse",
  "Industrial",
  "Residential",
  "CoWorking",
  "Plot",
  "Farmhouse",
];

const FURNISHING_STATUSES = [
  "Unfurnished",
  "Semi Furnished",
  "Fully Furnished",
  "Warm Shell",
  "Bare Shell",
];

const AVAILABILITY_STATUSES = [
  "Available",
  "Occupied",
  "Under Maintenance",
  "Coming Soon",
  "Not Available",
  "Reserved",
];

const VERIFICATION_STATUSES = [
  "Unverified",
  "Under Review",
  "Verified",
  "Discrepancy Found",
];

const CONTACT_ROLES = [
  "Owner",
  "Landlord",
  "Tenant",
  "Manager",
  "Agent",
  "Facility Manager",
  "Security",
  "Maintenance",
  "Legal",
  "Accountant",
];

const DOCUMENT_CATEGORIES = [
  "Lease Agreement",
  "NOC Certificate",
  "Sale Deed",
  "Tax Receipt",
  "Occupancy Certificate",
  "Building Plan",
  "Insurance",
  "Photograph",
  "ID Proof",
  "Other",
];

const SOURCES = [
  "Manual Entry",
  "Website",
  "Referral",
  "99acres",
  "MagicBricks",
  "Housing.com",
  "JustDial",
  "Google Maps",
  "Walk-in",
  "Existing Client",
];

@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}

  private async ensureNamedDefaults(
    model: {
      count: (args: { where: { active: boolean } }) => Promise<number>;
      upsert: (args: {
        where: { name: string };
        update: Record<string, never>;
        create: { name: string };
      }) => Promise<unknown>;
    },
    names: string[],
  ) {
    const activeCount = await model.count({ where: { active: true } });
    if (activeCount > 0) return;

    for (const name of names) {
      await model.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  private async ensureStates() {
    const activeCount = await this.prisma.state.count({
      where: { active: true },
    });
    if (activeCount > 0) return;

    for (const state of INDIAN_STATES) {
      await this.prisma.state.upsert({
        where: { code: state.code },
        update: {},
        create: state,
      });
    }
  }

  async findAllStates() {
    await this.ensureStates();
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
    await this.ensureNamedDefaults(this.prisma.propertyType, PROPERTY_TYPES);
    return this.prisma.propertyType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllFurnishingStatuses() {
    await this.ensureNamedDefaults(
      this.prisma.furnishingStatus,
      FURNISHING_STATUSES,
    );
    return this.prisma.furnishingStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllAvailabilityStatuses() {
    await this.ensureNamedDefaults(
      this.prisma.availabilityStatus,
      AVAILABILITY_STATUSES,
    );
    return this.prisma.availabilityStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllVerificationStatuses() {
    await this.ensureNamedDefaults(
      this.prisma.verificationStatus,
      VERIFICATION_STATUSES,
    );
    return this.prisma.verificationStatus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllContactRoles() {
    await this.ensureNamedDefaults(this.prisma.contactRole, CONTACT_ROLES);
    return this.prisma.contactRole.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllDocumentCategories() {
    await this.ensureNamedDefaults(
      this.prisma.documentCategory,
      DOCUMENT_CATEGORIES,
    );
    return this.prisma.documentCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllSources() {
    await this.ensureNamedDefaults(this.prisma.source, SOURCES);
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
