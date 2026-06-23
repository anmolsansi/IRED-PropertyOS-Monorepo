import { Test, TestingModule } from "@nestjs/testing";
import { DealsService } from "../deals.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("DealsService", () => {
  let service: DealsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      deal: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "d-1", title: "Test Deal" }),
        update: jest.fn().mockResolvedValue({}),
      },
      commission: {
        create: jest.fn().mockResolvedValue({}),
      },
      invoice: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DealsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DealsService>(DealsService);
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
    it("should create a deal", async () => {
      const result = await service.create({ title: "Test Deal" }, "user-1");
      expect(result).toHaveProperty("id", "d-1");
    });
  });

  describe("update", () => {
    it("should throw if not found", async () => {
      prisma.deal.findUnique.mockResolvedValue(null);
      await expect(
        service.update("nonexistent", { status: "closed" }, "user-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw on invalid status transition", async () => {
      prisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        status: "negotiation",
      });
      await expect(
        service.update("d-1", { status: "shortlisted" }, "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow valid status transition", async () => {
      prisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        status: "negotiation",
      });
      await service.update("d-1", { status: "agreement_shared" }, "user-1");
      expect(prisma.deal.update).toHaveBeenCalled();
    });

    it("should set closedAt when closing", async () => {
      prisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        status: "agreement_shared",
      });
      await service.update("d-1", { status: "closed" }, "user-1");
      expect(prisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ closedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe("markInvoicePaid", () => {
    it("should set paid status", async () => {
      await service.markInvoicePaid("inv-1");
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: "paid", paidAt: expect.any(Date) },
      });
    });
  });
});
