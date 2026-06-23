import { Test, TestingModule } from "@nestjs/testing";
import { ExportsService } from "../exports.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("ExportsService", () => {
  let service: ExportsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      building: { findMany: jest.fn().mockResolvedValue([]) },
      unit: { findMany: jest.fn().mockResolvedValue([]) },
      contact: { findMany: jest.fn().mockResolvedValue([]) },
      client: { findMany: jest.fn().mockResolvedValue([]) },
      deal: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getExportableData", () => {
    it("should export buildings", async () => {
      const result = await service.getExportableData("buildings");
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("rows");
      expect(prisma.building.findMany).toHaveBeenCalled();
    });

    it("should export units", async () => {
      const result = await service.getExportableData("units");
      expect(result).toHaveProperty("headers");
      expect(prisma.unit.findMany).toHaveBeenCalled();
    });

    it("should export contacts", async () => {
      const result = await service.getExportableData("contacts");
      expect(result).toHaveProperty("headers");
      expect(prisma.contact.findMany).toHaveBeenCalled();
    });

    it("should export clients", async () => {
      const result = await service.getExportableData("clients");
      expect(result).toHaveProperty("headers");
      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it("should export deals", async () => {
      const result = await service.getExportableData("deals");
      expect(result).toHaveProperty("headers");
      expect(prisma.deal.findMany).toHaveBeenCalled();
    });

    it("should throw for unknown entity type", async () => {
      await expect(service.getExportableData("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
