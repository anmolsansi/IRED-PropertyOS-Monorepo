import { Test, TestingModule } from "@nestjs/testing";
import { UnitsService } from "../units.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("UnitsService", () => {
  let service: UnitsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      unit: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "u-1", unitNumber: "101" }),
        update: jest
          .fn()
          .mockImplementation((_args: any) =>
            Promise.resolve({ id: "u-1", ...(_args.data || {}) }),
          ),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
      changeRequest: {
        create: jest.fn().mockResolvedValue({ id: "cr-1", changeItems: [] }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
      expect(result.meta).toHaveProperty("total", 0);
    });

    it("should apply search filter", async () => {
      await service.findAll({ search: "101" });
      expect(prisma.unit.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a unit by id", async () => {
      const mock = { id: "u-1", unitNumber: "101" };
      prisma.unit.findUnique.mockResolvedValue(mock);
      const result = await service.findOne("u-1");
      expect(result).toEqual(mock);
    });
  });

  describe("create", () => {
    it("should create a unit", async () => {
      const result = await service.create(
        { unitNumber: "101", buildingId: "b-1" },
        "user-1",
      );
      expect(result).toHaveProperty("id", "u-1");
    });
  });

  describe("update", () => {
    it("should update directly for admin", async () => {
      prisma.unit.findUnique.mockResolvedValue({
        id: "u-1",
        unitNumber: "101",
      });
      const result = await service.update(
        "u-1",
        { unitNumber: "102" },
        "admin-1",
        true,
      );
      expect(result).toHaveProperty("unitNumber", "102");
    });

    it("should throw NotFoundException for non-existent unit", async () => {
      prisma.unit.findUnique.mockResolvedValue(null);
      await expect(service.update("u-1", {}, "user-1", true)).rejects.toThrow(
        "Unit not found",
      );
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt", async () => {
      await service.softDelete("u-1");
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: "u-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("restore", () => {
    it("should clear deletedAt", async () => {
      await service.restore("u-1");
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: "u-1" },
        data: { deletedAt: null },
      });
    });
  });
});
