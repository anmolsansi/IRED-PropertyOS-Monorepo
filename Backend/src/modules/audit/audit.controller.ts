import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { AuditQuerySchema, AuditQueryDto } from "./dto/audit.schema";

@ApiTags("audit")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "audit", version: "1" })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "List audit events with filters" })
  @UsePipes(new ZodValidationPipe(AuditQuerySchema))
  @ApiResponse({
    status: 200,
    description: "Paginated list of audit events",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            actorUserId: "uuid",
            eventType: "POST /v1/buildings",
            entityType: "building",
            entityId: "uuid",
            metadataJson: {
              method: "POST",
              url: "/v1/buildings",
              duration: 42,
            },
            ipAddress: "127.0.0.1",
            userAgent: "Mozilla/5.0",
            createdAt: "2025-01-15T10:30:00.000Z",
            actor: {
              id: "uuid",
              fullName: "System Admin",
              email: "admin@ired.com",
            },
          },
        ],
        pagination: { page: 1, limit: 50, total: 120, totalPages: 3 },
      },
    },
  })
  async findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get audit event by ID" })
  @ApiResponse({ status: 200, description: "Audit event details" })
  @ApiResponse({ status: 404, description: "Audit event not found" })
  async findOne(@Param("id") id: string) {
    return this.auditService.findOne(id);
  }
}
