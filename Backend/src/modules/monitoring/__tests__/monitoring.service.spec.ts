import { Test, TestingModule } from "@nestjs/testing";
import { MonitoringService } from "../monitoring.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("MonitoringService", () => {
  let service: MonitoringService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("getMetrics", () => {
    it("returns a metrics snapshot with required fields", () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty("uptime");
      expect(metrics).toHaveProperty("requests");
      expect(metrics).toHaveProperty("database");
      expect(metrics).toHaveProperty("memory");
      expect(metrics).toHaveProperty("cpu");
      expect(metrics).toHaveProperty("timestamp");
      expect(typeof metrics.uptime).toBe("number");
      expect(typeof metrics.requests.total).toBe("number");
      expect(typeof metrics.requests.errors).toBe("number");
      expect(typeof metrics.requests.avgResponseMs).toBe("number");
      expect(typeof metrics.memory.heapUsedMb).toBe("number");
      expect(typeof metrics.memory.heapTotalMb).toBe("number");
      expect(typeof metrics.memory.rssMb).toBe("number");
      expect(typeof metrics.timestamp).toBe("string");
    });
  });

  describe("recordRequest", () => {
    it("increments total request count", () => {
      service.recordRequest(100, false);
      const metrics = service.getMetrics();

      expect(metrics.requests.total).toBe(1);
    });

    it("increments error count when isError is true", () => {
      service.recordRequest(200, true);
      const metrics = service.getMetrics();

      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.total).toBe(1);
    });

    it("does not increment error count when isError is false", () => {
      service.recordRequest(100, false);
      const metrics = service.getMetrics();

      expect(metrics.requests.errors).toBe(0);
    });

    it("calculates rolling average response time", () => {
      service.recordRequest(100, false);
      service.recordRequest(200, false);
      const metrics = service.getMetrics();

      expect(metrics.requests.avgResponseMs).toBe(150);
    });

    it("handles first request correctly", () => {
      service.recordRequest(50, false);
      const metrics = service.getMetrics();

      expect(metrics.requests.avgResponseMs).toBe(50);
    });

    it("accumulates multiple requests", () => {
      service.recordRequest(100, false);
      service.recordRequest(200, false);
      service.recordRequest(300, false);
      const metrics = service.getMetrics();

      expect(metrics.requests.total).toBe(3);
      expect(metrics.requests.avgResponseMs).toBe(200);
    });
  });

  describe("onModuleInit / onModuleDestroy", () => {
    it("starts and stops the metrics collection interval", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      service.onModuleInit();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      service.onModuleDestroy();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("does not crash if destroyed without init", () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
