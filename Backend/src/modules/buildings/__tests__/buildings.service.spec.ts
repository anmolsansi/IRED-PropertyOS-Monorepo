import { Test, TestingModule } from "@nestjs/testing";
import { BuildingsService } from "../buildings.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("BuildingsService", () => {
  let service: BuildingsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      building: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: "b-1", name: "Test Building" }),
        update: jest.fn().mockResolvedValue({ id: "b-1", name: "Updated" }),
      },
      changeRequest: {
        create: jest.fn().mockResolvedValue({ id: "cr-1", changeItems: [] }),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
      expect(result.meta).toHaveProperty("total");
      expect(result.meta).toHaveProperty("page", 1);
    });

    it("should apply search filter", async () => {
      await service.findAll({ search: "tower" });
      expect(prisma.building.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return building by id", async () => {
      const mockBuilding = { id: "b-1", name: "Test Building" };
      prisma.building.findUnique.mockResolvedValue(mockBuilding);
      const result = await service.findOne("b-1");
      expect(result).toEqual(mockBuilding);
    });
  });

  describe("create", () => {
    it("should create a building", async () => {
      const result = await service.create({ name: "Test Building" }, "user-1");
      expect(result).toHaveProperty("id", "b-1");
      expect(prisma.building.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update directly for admin", async () => {
      prisma.building.findUnique.mockResolvedValue({
        id: "b-1",
        name: "Original",
      });
      const result = await service.update(
        "b-1",
        { name: "Updated" },
        "admin-1",
        true,
      );
      expect(result).toHaveProperty("name", "Updated");
    });

    it("should create change request for worker", async () => {
      prisma.building.findUnique.mockResolvedValue({
        id: "b-1",
        name: "Original",
        stateId: "s1",
        cityId: "c1",
      });
      const result = await service.update(
        "b-1",
        { name: "Worker Edit" },
        "worker-1",
        false,
      );
      expect(result).toHaveProperty("changeItems");
      expect(prisma.changeRequest.create).toHaveBeenCalled();
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt", async () => {
      await service.softDelete("b-1");
      expect(prisma.building.update).toHaveBeenCalledWith({
        where: { id: "b-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
