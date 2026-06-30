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

const MAJOR_CITIES: Record<string, string[]> = {
  AP: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  AR: ["Itanagar", "Tawang", "Pasighat"],
  AS: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  BR: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  CG: ["Raipur", "Bhilai", "Bilaspur"],
  GA: ["Panaji", "Vasco da Gama", "Mapusa"],
  GJ: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  HR: ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  HP: ["Shimla", "Manali", "Dharamsala"],
  JH: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  KA: ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangaluru", "Belgaum"],
  KL: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  MP: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  MH: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
  MN: ["Imphal"],
  ML: ["Shillong", "Tura"],
  MZ: ["Aizawl"],
  NL: ["Kohima", "Dimapur"],
  OD: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur"],
  PB: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  RJ: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  SK: ["Gangtok"],
  TN: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  TS: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad"],
  TR: ["Agartala"],
  UP: ["Lucknow", "Noida", "Ghaziabad", "Agra", "Varanasi", "Kanpur"],
  UK: ["Dehradun", "Haridwar", "Haldwani"],
  WB: ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  AN: ["Port Blair"],
  CH: ["Chandigarh"],
  DN: ["Daman", "Diu", "Silvassa"],
  DL: ["New Delhi", "Delhi", "Delhi NCR"],
  JK: ["Srinagar", "Jammu"],
  LA: ["Leh", "Kargil"],
  LD: ["Kavaratti"],
  PY: ["Puducherry", "Karaikal"],
};

const LOCALITIES: Record<string, string[]> = {
  Mumbai: [
    "Andheri",
    "Bandra",
    "BKC",
    "Lower Parel",
    "Worli",
    "Nariman Point",
    "Fort",
    "Colaba",
    "Powai",
    "Goregaon",
    "Malad",
    "Borivali",
    "Thane",
    "Navi Mumbai",
    "Kurla",
    "Chembur",
  ],
  Pune: [
    "Hinjewadi",
    "Kharadi",
    "Wakad",
    "Baner",
    "Aundh",
    "Kothrud",
    "Viman Nagar",
    "Koregaon Park",
    "Hadapsar",
    "Magarpatta",
    "Swargate",
    "Shivajinagar",
  ],
  Bengaluru: [
    "Whitefield",
    "Electronic City",
    "Outer Ring Road",
    "Koramangala",
    "Indiranagar",
    "HSR Layout",
    "BTM Layout",
    "Marathahalli",
    "Bellandur",
    "Sarjapur Road",
    "Hebbal",
    "Yelahanka",
  ],
  Hyderabad: [
    "HITEC City",
    "Gachibowli",
    "Madhapur",
    "Kondapur",
    "Jubilee Hills",
    "Banjara Hills",
    "Secunderabad",
    "Kukatpally",
    "Financial District",
    "Nanakramguda",
  ],
  "Delhi NCR": [
    "Connaught Place",
    "Nehru Place",
    "Saket",
    "Dwarka",
    "Rohini",
    "Gurugram DLF",
    "Gurugram Cyber Hub",
    "Noida Sector 62",
    "Noida Sector 18",
    "Faridabad",
    "Ghaziabad",
    "Lajpat Nagar",
    "Karol Bagh",
    "Janakpuri",
  ],
  Chennai: [
    "T. Nagar",
    "Anna Nagar",
    "Adyar",
    "OMR",
    "Porur",
    "Sholinganallur",
    "Thoraipakkam",
    "Velachery",
    "Guindy",
    "Ambattur",
  ],
  Kolkata: [
    "Salt Lake",
    "New Town",
    "Park Street",
    "BBD Bagh",
    "EM Bypass",
    "Sector V",
    "Rajarhat",
    "Howrah",
    "Durgapur",
  ],
  Ahmedabad: [
    "SG Highway",
    "CG Road",
    "Vastrapur",
    "Satellite",
    "Paldi",
    "Ashram Road",
    "Science City Road",
    "Gota",
    "Thaltej",
  ],
};

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

  private async ensureCities(stateId: string) {
    const activeCount = await this.prisma.city.count({
      where: { stateId, active: true },
    });
    if (activeCount > 0) return;

    const state = await this.prisma.state.findUnique({ where: { id: stateId } });
    if (!state || !state.code) return;

    const citiesToCreate = MAJOR_CITIES[state.code];
    if (!citiesToCreate) return;

    for (const cityName of citiesToCreate) {
      const existing = await this.prisma.city.findFirst({
        where: { name: cityName, stateId },
      });
      if (!existing) {
        await this.prisma.city.create({
          data: { name: cityName, stateId },
        });
      }
    }
  }

  private async ensureLocalities(cityId: string) {
    const activeCount = await this.prisma.locality.count({
      where: { cityId, active: true },
    });
    if (activeCount > 0) return;

    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city || !city.name) return;

    const localitiesToCreate = LOCALITIES[city.name];
    if (!localitiesToCreate) return;

    for (const localityName of localitiesToCreate) {
      const existing = await this.prisma.locality.findFirst({
        where: { name: localityName, cityId },
      });
      if (!existing) {
        await this.prisma.locality.create({
          data: { name: localityName, cityId },
        });
      }
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
