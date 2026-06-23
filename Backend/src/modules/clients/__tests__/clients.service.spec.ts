import { Test, TestingModule } from "@nestjs/testing";
import { ClientsService } from "../clients.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("ClientsService", () => {
  let service: ClientsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      client: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "c-1", name: "Test Client" }),
        update: jest.fn().mockResolvedValue({}),
      },
      clientContact: {
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      requirement: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      shortlist: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });
  });

  describe("create", () => {
    it("should create a client", async () => {
      const result = await service.create({ name: "Test Client" }, "user-1");
      expect(result).toHaveProperty("id", "c-1");
    });
  });

  describe("updateRequirement", () => {
    it("should throw if not found", async () => {
      prisma.requirement.findUnique.mockResolvedValue(null);
      await expect(
        service.updateRequirement("nonexistent", { status: "fulfilled" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw on invalid transition", async () => {
      prisma.requirement.findUnique.mockResolvedValue({
        id: "r-1",
        status: "cancelled",
      });
      await expect(
        service.updateRequirement("r-1", { status: "active" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateShortlist", () => {
    it("should throw if not found", async () => {
      prisma.shortlist.findUnique.mockResolvedValue(null);
      await expect(
        service.updateShortlist("nonexistent", { status: "accepted" }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
