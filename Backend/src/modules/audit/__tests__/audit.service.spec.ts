import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../audit.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("AuditService", () => {
  let service: AuditService;
  let prisma: {
    auditEvent: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "evt-1",
            actorUserId: "user-1",
            eventType: "CREATE",
            entityType: "building",
            entityId: "bld-1",
            ipAddress: "127.0.0.1",
            createdAt: new Date("2025-01-15T10:00:00Z"),
            actor: { id: "user-1", fullName: "Admin", email: "admin@test.com" },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({
          id: "evt-1",
          actorUserId: "user-1",
          eventType: "CREATE",
          entityType: "building",
          entityId: "bld-1",
          actor: { id: "user-1", fullName: "Admin", email: "admin@test.com" },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findAll", () => {
    it("returns paginated audit events", async () => {
      const result = await service.findAll({ page: 1, limit: 50 });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });
      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          include: {
            actor: { select: { id: true, fullName: true, email: true } },
          },
        }),
      );
    });

    it("filters by entityType", async () => {
      await service.findAll({ page: 1, limit: 50, entityType: "building" });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: "building" }),
        }),
      );
    });

    it("filters by eventType with case-insensitive contains", async () => {
      await service.findAll({ page: 1, limit: 50, eventType: "create" });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: { contains: "create", mode: "insensitive" },
          }),
        }),
      );
    });

    it("filters by actorUserId", async () => {
      await service.findAll({ page: 1, limit: 50, actorUserId: "user-1" });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ actorUserId: "user-1" }),
        }),
      );
    });

    it("filters by date range", async () => {
      await service.findAll({
        page: 1,
        limit: 50,
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-12-31T23:59:59Z",
      });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date("2025-01-01T00:00:00Z"),
              lte: new Date("2025-12-31T23:59:59Z"),
            },
          }),
        }),
      );
    });

    it("paginates correctly for page 2", async () => {
      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("respects sortBy and sortOrder", async () => {
      await service.findAll({
        page: 1,
        limit: 50,
        sortBy: "eventType",
        sortOrder: "asc",
      });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { eventType: "asc" },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("returns a single audit event by id", async () => {
      const result = await service.findOne("evt-1");

      expect(result).toBeDefined();
      expect(result!.id).toBe("evt-1");
      expect(prisma.auditEvent.findUnique).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
      });
    });

    it("returns null for non-existent id", async () => {
      prisma.auditEvent.findUnique.mockResolvedValue(null);

      const result = await service.findOne("non-existent");

      expect(result).toBeNull();
    });
  });
});
