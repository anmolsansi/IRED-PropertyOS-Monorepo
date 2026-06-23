import { Test, TestingModule } from "@nestjs/testing";
import { FloorsService } from "../floors.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("FloorsService", () => {
  let service: FloorsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      floor: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "f-1", floorNumber: 1 }),
        update: jest
          .fn()
          .mockImplementation((_args: any) =>
            Promise.resolve({ id: "f-1", ...(_args.data || {}) }),
          ),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
      changeRequest: {
        create: jest.fn().mockResolvedValue({ id: "cr-1", changeItems: [] }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FloorsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FloorsService>(FloorsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByBuilding", () => {
    it("should return floors for a building", async () => {
      const result = await service.findByBuilding("b-1");
      expect(result).toEqual([]);
      expect(prisma.floor.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a floor by id", async () => {
      const mock = { id: "f-1", floorNumber: 1 };
      prisma.floor.findUnique.mockResolvedValue(mock);
      const result = await service.findOne("f-1");
      expect(result).toEqual(mock);
    });
  });

  describe("create", () => {
    it("should create a floor", async () => {
      const result = await service.create("b-1", { floorNumber: 1 }, "user-1");
      expect(result).toHaveProperty("id", "f-1");
    });
  });

  describe("update", () => {
    it("should update directly for admin", async () => {
      prisma.floor.findUnique.mockResolvedValue({ id: "f-1", floorNumber: 1 });
      const result = await service.update(
        "f-1",
        { floorNumber: 2 },
        "admin-1",
        true,
      );
      expect(result).toHaveProperty("floorNumber", 2);
    });

    it("should throw NotFoundException for non-existent floor", async () => {
      prisma.floor.findUnique.mockResolvedValue(null);
      await expect(service.update("f-1", {}, "user-1", true)).rejects.toThrow(
        "Floor not found",
      );
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt", async () => {
      await service.softDelete("f-1");
      expect(prisma.floor.update).toHaveBeenCalledWith({
        where: { id: "f-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("restore", () => {
    it("should clear deletedAt", async () => {
      await service.restore("f-1");
      expect(prisma.floor.update).toHaveBeenCalledWith({
        where: { id: "f-1" },
        data: { deletedAt: null },
      });
    });
  });
});
