import { Controller, Get, Header } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiExcludeController,
  ApiResponse,
} from "@nestjs/swagger";
import { MonitoringService } from "./monitoring.service";

@ApiTags("monitoring")
@Controller({ path: "monitoring", version: "1" })
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get("metrics")
  @ApiOperation({ summary: "System metrics (JSON)" })
  @ApiResponse({
    status: 200,
    description: "System metrics",
    schema: {
      example: {
        uptime: 3600,
        requests: { total: 1250, errors: 5, avgResponseMs: 42 },
        memory: { heapUsedMb: 85, heapTotalMb: 120, rssMb: 150 },
        cpu: { user: 1200, system: 300 },
        timestamp: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get("metrics/prometheus")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({ summary: "Prometheus-compatible metrics" })
  @ApiResponse({ status: 200, description: "Prometheus text format" })
  getPrometheusMetrics() {
    const m = this.monitoringService.getMetrics();
    return [
      `# HELP propertyos_uptime_seconds Application uptime in seconds`,
      `# TYPE propertyos_uptime_seconds gauge`,
      `propertyos_uptime_seconds ${m.uptime}`,
      ``,
      `# HELP propertyos_requests_total Total HTTP requests`,
      `# TYPE propertyos_requests_total counter`,
      `propertyos_requests_total ${m.requests.total}`,
      ``,
      `# HELP propertyos_request_errors_total Total HTTP errors`,
      `# TYPE propertyos_request_errors_total counter`,
      `propertyos_request_errors_total ${m.requests.errors}`,
      ``,
      `# HELP propertyos_request_duration_avg_ms Average request duration`,
      `# TYPE propertyos_request_duration_avg_ms gauge`,
      `propertyos_request_duration_avg_ms ${m.requests.avgResponseMs}`,
      ``,
      `# HELP propertyos_memory_heap_used_bytes Memory heap used`,
      `# TYPE propertyos_memory_heap_used_bytes gauge`,
      `propertyos_memory_heap_used_bytes ${m.memory.heapUsedMb * 1024 * 1024}`,
      ``,
      `# HELP propertyos_memory_heap_total_bytes Memory heap total`,
      `# TYPE propertyos_memory_heap_total_bytes gauge`,
      `propertyos_memory_heap_total_bytes ${m.memory.heapTotalMb * 1024 * 1024}`,
      ``,
      `# HELP propertyos_memory_rss_bytes RSS memory`,
      `# TYPE propertyos_memory_rss_bytes gauge`,
      `propertyos_memory_rss_bytes ${m.memory.rssMb * 1024 * 1024}`,
      ``,
      `# HELP propertyos_cpu_user_ms CPU user time`,
      `# TYPE propertyos_cpu_user_ms gauge`,
      `propertyos_cpu_user_ms ${m.cpu.user}`,
      ``,
      `# HELP propertyos_cpu_system_ms CPU system time`,
      `# TYPE propertyos_cpu_system_ms gauge`,
      `propertyos_cpu_system_ms ${m.cpu.system}`,
    ].join("\n");
  }
}
