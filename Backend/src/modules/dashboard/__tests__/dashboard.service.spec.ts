import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "../dashboard.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      building: { count: jest.fn().mockResolvedValue(10) },
      user: { count: jest.fn().mockResolvedValue(5) },
      client: { count: jest.fn().mockResolvedValue(20) },
      deal: { count: jest.fn().mockResolvedValue(8) },
      changeRequest: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
      },
      siteVisit: { count: jest.fn().mockResolvedValue(7) },
      unit: { count: jest.fn().mockResolvedValue(50) },
      task: {
        count: jest.fn().mockResolvedValue(12),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      workerGeographicAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAdminDashboard", () => {
    it("should return metrics and activity", async () => {
      const result = await service.getAdminDashboard();
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("pendingChangeRequests");
      expect(result).toHaveProperty("recentActivity");
      expect(result.metrics).toHaveProperty("totalProperties");
      expect(result.metrics).toHaveProperty("availabilityRate");
    });
  });

  describe("getWorkerDashboard", () => {
    it("should return worker-specific metrics", async () => {
      const result = await service.getWorkerDashboard("worker-1");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recentTasks");
      expect(result.metrics).toHaveProperty("assignedProperties");
      expect(result.metrics).toHaveProperty("pendingMyChanges");
    });
  });

  describe("getActivity", () => {
    it("should return recent activity", async () => {
      const result = await service.getActivity(10);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
