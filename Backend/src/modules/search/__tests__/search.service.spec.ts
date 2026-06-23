import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "../search.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("SearchService", () => {
  let service: SearchService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      building: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      contact: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("searchProperties", () => {
    it("should return paginated results", async () => {
      const result = await service.searchProperties({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });

    it("should apply state filter", async () => {
      await service.searchProperties({ stateId: "state-1" });
      expect(prisma.building.findMany).toHaveBeenCalled();
    });

    it("should apply rent filters via units", async () => {
      await service.searchProperties({ minRent: 10000, maxRent: 50000 });
      expect(prisma.building.findMany).toHaveBeenCalled();
    });

    it("should apply search text", async () => {
      await service.searchProperties({ search: "tower" });
      expect(prisma.building.findMany).toHaveBeenCalled();
    });
  });

  describe("searchUnits", () => {
    it("should return paginated results", async () => {
      const result = await service.searchUnits({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });

    it("should apply rent filter", async () => {
      await service.searchUnits({ minRent: 10000 });
      expect(prisma.unit.findMany).toHaveBeenCalled();
    });
  });

  describe("searchContacts", () => {
    it("should return paginated results", async () => {
      const result = await service.searchContacts({});
      expect(result).toHaveProperty("data");
    });

    it("should apply search text", async () => {
      await service.searchContacts({ search: "John" });
      expect(prisma.contact.findMany).toHaveBeenCalled();
    });
  });
});
