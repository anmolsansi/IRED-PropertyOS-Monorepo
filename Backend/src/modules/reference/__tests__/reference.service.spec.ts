import { Test, TestingModule } from "@nestjs/testing";
import { ReferenceService } from "../reference.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("ReferenceService", () => {
  let service: ReferenceService;
  let prisma: any;

  beforeEach(async () => {
    const referenceModel = (findManyValue: unknown[]) => ({
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue(findManyValue),
      upsert: jest.fn().mockResolvedValue({}),
    });

    prisma = {
      state: referenceModel([{ id: "s-1", name: "Delhi" }]),
      city: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "c-1", name: "New Delhi" }]),
      },
      locality: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "l-1", name: "Connaught Place" }]),
      },
      microMarket: { findMany: jest.fn().mockResolvedValue([]) },
      propertyType: referenceModel([]),
      furnishingStatus: referenceModel([]),
      availabilityStatus: referenceModel([]),
      verificationStatus: referenceModel([]),
      contactRole: referenceModel([]),
      documentCategory: referenceModel([]),
      source: referenceModel([]),
      zone: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReferenceService>(ReferenceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAllStates", () => {
    it("should return active states", async () => {
      const result = await service.findAllStates();
      expect(result).toHaveLength(1);
      expect(prisma.state.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: "asc" },
      });
      expect(prisma.state.upsert).not.toHaveBeenCalled();
    });
  });

  describe("findCitiesByState", () => {
    it("should return cities for a state", async () => {
      const result = await service.findCitiesByState("s-1");
      expect(result).toHaveLength(1);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: { stateId: "s-1", active: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findLocalitiesByCity", () => {
    it("should return localities for a city", async () => {
      const result = await service.findLocalitiesByCity("c-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("findAllPropertyTypes", () => {
    it("should return property types", async () => {
      const result = await service.findAllPropertyTypes();
      expect(result).toEqual([]);
      expect(prisma.propertyType.count).toHaveBeenCalledWith({
        where: { active: true },
      });
      expect(prisma.propertyType.upsert).not.toHaveBeenCalled();
    });
  });

  describe("findAllSources", () => {
    it("should return sources", async () => {
      const result = await service.findAllSources();
      expect(result).toEqual([]);
      expect(prisma.source.findMany).toHaveBeenCalled();
    });
  });

  describe("findAllZones", () => {
    it("should return zones", async () => {
      const result = await service.findAllZones();
      expect(result).toEqual([]);
      expect(prisma.zone.findMany).toHaveBeenCalled();
    });
  });

  describe("findZonesByCity", () => {
    it("should return zones for a city", async () => {
      const result = await service.findZonesByCity("c-1");
      expect(result).toEqual([]);
      expect(prisma.zone.findMany).toHaveBeenCalledWith({
        where: { cityId: "c-1", active: true },
        orderBy: { name: "asc" },
      });
    });
  });
});
