import { Test, TestingModule } from "@nestjs/testing";
import { ChangeRequestsService } from "../change-requests.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("ChangeRequestsService", () => {
  let service: ChangeRequestsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      changeRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      changeItem: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      building: { findUnique: jest.fn() },
      floor: { findUnique: jest.fn() },
      unit: { findUnique: jest.fn() },
      contact: { findUnique: jest.fn() },
      versionSnapshot: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "vs-1", versionNumber: 1 }),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeRequestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChangeRequestsService>(ChangeRequestsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findOne", () => {
    it("should throw if not found", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue(null);
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return request with master data", async () => {
      const mockRequest = {
        id: "cr-1",
        entityType: "building",
        entityId: "b-1",
        changeItems: [],
      };
      prisma.changeRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.building.findUnique.mockResolvedValue({ id: "b-1", name: "Test" });
      const result = await service.findOne("cr-1");
      expect(result).toHaveProperty("masterData");
    });
  });

  describe("withdraw", () => {
    it("should throw if not found", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue(null);
      await expect(service.withdraw("cr-1", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw if not the requester", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue({
        id: "cr-1",
        requestedBy: "other",
        status: "pending",
      });
      await expect(service.withdraw("cr-1", "user-1")).rejects.toThrow(
        "Only the requester can withdraw",
      );
    });

    it("should throw if not pending", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue({
        id: "cr-1",
        requestedBy: "user-1",
        status: "approved",
      });
      await expect(service.withdraw("cr-1", "user-1")).rejects.toThrow(
        "Can only withdraw pending",
      );
    });

    it("should withdraw successfully", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue({
        id: "cr-1",
        requestedBy: "user-1",
        status: "pending",
        entityType: "building",
        entityId: "b-1",
      });
      const result = await service.withdraw("cr-1", "user-1");
      expect(prisma.changeRequest.update).toHaveBeenCalledWith({
        where: { id: "cr-1" },
        data: { status: "withdrawn", closedAt: expect.any(Date) },
      });
    });
  });

  describe("approveItems", () => {
    it("should throw if request not found", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue(null);
      await expect(service.approveItems("cr-1", [], "admin-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw if request withdrawn", async () => {
      prisma.changeRequest.findUnique.mockResolvedValue({
        id: "cr-1",
        status: "withdrawn",
        changeItems: [],
      });
      await expect(service.approveItems("cr-1", [], "admin-1")).rejects.toThrow(
        "Cannot approve withdrawn",
      );
    });
  });
});
