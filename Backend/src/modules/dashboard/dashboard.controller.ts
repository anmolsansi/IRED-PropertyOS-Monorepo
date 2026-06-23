import { Controller, Get, Query, UseGuards, UsePipes } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { ActivityQuerySchema, ActivityQueryDto } from "./dto/dashboard.schema";

@ApiTags("dashboard")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "dashboard", version: "1" })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("admin")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get admin dashboard metrics" })
  @ApiResponse({
    status: 200,
    description: "Admin dashboard data",
    schema: {
      example: {
        totalBuildings: 45,
        totalUnits: 1200,
        totalClients: 320,
        activeDeals: 67,
        pendingTasks: 23,
        recentActivity: [],
      },
    },
  })
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get("worker")
  @Roles(Role.WORKER)
  @ApiOperation({ summary: "Get worker dashboard metrics" })
  async getWorkerDashboard(@CurrentUser("id") userId: string) {
    return this.dashboardService.getWorkerDashboard(userId);
  }

  @Get("activity")
  @ApiOperation({ summary: "Get recent activity feed" })
  @UsePipes(new ZodValidationPipe(ActivityQuerySchema))
  async getActivity(@Query() query: ActivityQueryDto) {
    return this.dashboardService.getActivity(query.limit);
  }
}
