import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Health check (database + memory)" })
  @ApiResponse({
    status: 200,
    description: "Health status",
    schema: {
      example: {
        status: "ok",
        details: { database: { status: "up" }, memory_rss: { status: "up" } },
      },
    },
  })
  @ApiResponse({ status: 503, description: "Service unhealthy" })
  check() {
    return this.health.check([
      () => this.prisma.pingCheck("database", this.prismaService),
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024),
      async (): Promise<HealthIndicatorResult> => {
        try {
          const net = await import("node:net");
          const host = process.env.REDIS_HOST || "localhost";
          const port = parseInt(process.env.REDIS_PORT || "6379", 10);
          await new Promise<void>((resolve, reject) => {
            const socket = net.createConnection({ host, port });
            socket.setTimeout(2000);
            socket.on("connect", () => { socket.destroy(); resolve(); });
            socket.on("error", (err) => { socket.destroy(); reject(err); });
            socket.on("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
          });
          return { redis: { status: "up" as const } };
        } catch {
          return { redis: { status: "down" as const, message: "Connection failed" } };
        }
      },
      async (): Promise<HealthIndicatorResult> => {
        const endpoint = process.env.S3_ENDPOINT;
        if (!endpoint) {
          return { s3: { status: "up" as const, message: "Not configured" } };
        }
        try {
          const url = new URL(endpoint);
          const net = await import("node:net");
          const host = url.hostname;
          const port = parseInt(url.port) || 443;
          await new Promise<void>((resolve, reject) => {
            const socket = net.createConnection({ host, port });
            socket.setTimeout(2000);
            socket.on("connect", () => { socket.destroy(); resolve(); });
            socket.on("error", (err) => { socket.destroy(); reject(err); });
            socket.on("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
          });
          return { s3: { status: "up" as const } };
        } catch {
          return { s3: { status: "down" as const, message: "Connection failed" } };
        }
      },
    ]);
  }
}
