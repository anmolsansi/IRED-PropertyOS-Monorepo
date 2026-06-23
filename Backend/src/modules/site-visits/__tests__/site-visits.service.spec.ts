import { Test, TestingModule } from "@nestjs/testing";
import { SiteVisitsService } from "../site-visits.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";

describe("SiteVisitsService", () => {
  let service: SiteVisitsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      siteVisit: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: "sv-1", status: "scheduled" }),
        update: jest
          .fn()
          .mockResolvedValue({ id: "sv-1", status: "completed" }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteVisitsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SiteVisitsService>(SiteVisitsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });

    it("should apply status filter", async () => {
      await service.findAll({ status: "scheduled" });
      expect(prisma.siteVisit.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a site visit by id", async () => {
      const mock = { id: "sv-1", status: "scheduled" };
      prisma.siteVisit.findUnique.mockResolvedValue(mock);
      const result = await service.findOne("sv-1");
      expect(result).toEqual(mock);
    });

    it("should throw NotFoundException", async () => {
      prisma.siteVisit.findUnique.mockResolvedValue(null);
      await expect(service.findOne("sv-1")).rejects.toThrow(
        "Site visit not found",
      );
    });
  });

  describe("create", () => {
    it("should create a site visit", async () => {
      const result = await service.create(
        { scheduledAt: new Date() },
        "user-1",
      );
      expect(result).toHaveProperty("id", "sv-1");
    });
  });

  describe("update", () => {
    it("should update a site visit", async () => {
      prisma.siteVisit.findUnique.mockResolvedValue({
        id: "sv-1",
        status: "scheduled",
      });
      const result = await service.update("sv-1", { status: "confirmed" });
      expect(result).toHaveProperty("status", "completed");
    });

    it("should throw on invalid status transition", async () => {
      prisma.siteVisit.findUnique.mockResolvedValue({
        id: "sv-1",
        status: "completed",
      });
      await expect(
        service.update("sv-1", { status: "scheduled" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("complete", () => {
    it("should mark as completed", async () => {
      prisma.siteVisit.findUnique.mockResolvedValue({
        id: "sv-1",
        status: "confirmed",
      });
      const result = await service.complete("sv-1", "All good");
      expect(result).toHaveProperty("status", "completed");
    });
  });

  describe("cancel", () => {
    it("should cancel a site visit", async () => {
      prisma.siteVisit.findUnique.mockResolvedValue({
        id: "sv-1",
        status: "scheduled",
      });
      const result = await service.cancel("sv-1");
      expect(result).toHaveProperty("status");
    });
  });
});
