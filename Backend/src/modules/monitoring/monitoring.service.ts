import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private metrics: MetricsSnapshot = {
    uptime: 0,
    requests: { total: 0, errors: 0, avgResponseMs: 0 },
    database: { connections: 0, queryAvgMs: 0 },
    memory: { heapUsedMb: 0, heapTotalMb: 0, rssMb: 0 },
    cpu: { user: 0, system: 0 },
    timestamp: new Date().toISOString(),
  };

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.collectMetrics();
    this.metricsInterval = setInterval(() => this.collectMetrics(), 10000);
  }

  onModuleDestroy() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
  }

  getMetrics(): MetricsSnapshot {
    return { ...this.metrics, timestamp: new Date().toISOString() };
  }

  private collectMetrics() {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    this.metrics = {
      uptime: Math.floor(process.uptime()),
      requests: this.metrics.requests,
      database: this.metrics.database,
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
      cpu: {
        user: Math.round(cpu.user / 1000),
        system: Math.round(cpu.system / 1000),
      },
      timestamp: new Date().toISOString(),
    };
  }

  recordRequest(durationMs: number, isError: boolean) {
    this.metrics.requests.total++;
    if (isError) this.metrics.requests.errors++;
    const prev = this.metrics.requests.avgResponseMs;
    const count = this.metrics.requests.total;
    this.metrics.requests.avgResponseMs = Math.round(
      prev + (durationMs - prev) / count,
    );
  }
}

export interface MetricsSnapshot {
  uptime: number;
  requests: {
    total: number;
    errors: number;
    avgResponseMs: number;
  };
  database: {
    connections: number;
    queryAvgMs: number;
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  timestamp: string;
}
