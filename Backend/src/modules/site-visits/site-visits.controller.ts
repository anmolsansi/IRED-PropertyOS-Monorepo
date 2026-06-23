import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { SiteVisitsService } from "./site-visits.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateSiteVisitSchema,
  UpdateSiteVisitSchema,
  SiteVisitQuerySchema,
  CompleteSiteVisitSchema,
  CreateSiteVisitDto,
  UpdateSiteVisitDto,
  SiteVisitQueryDto,
  CompleteSiteVisitDto,
} from "./dto/site-visits.schema";

@ApiTags("site-visits")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "site-visits", version: "1" })
export class SiteVisitsController {
  constructor(private readonly siteVisitsService: SiteVisitsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List site visits" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of site visits",
    schema: {
      example: {
        data: [
          {
            id: "sv1e42c00-1234-4567-8901-abcdef123456",
            scheduledAt: "2025-01-20T14:00:00.000Z",
            status: "scheduled",
            client: { name: "Acme Corp" },
            building: { name: "Express Towers" },
            assignee: { fullName: "Rahul Verma" },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SiteVisitQuerySchema))
  async findAll(
    @Query() query: SiteVisitQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.siteVisitsService.findAll(query, scope);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get site visit by ID" })
  async findOne(@Param("id") id: string) {
    return this.siteVisitsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Schedule a new site visit" })
  @ApiResponse({
    status: 201,
    description: "Site visit scheduled",
    schema: {
      example: {
        id: "sv1e42c00-1234-4567-8901-abcdef123456",
        scheduledAt: "2025-01-20T14:00:00.000Z",
        status: "scheduled",
        clientId: "client-id",
        buildingId: "building-id",
        assignedTo: "worker-id",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateSiteVisitSchema))
  async create(
    @Body() dto: CreateSiteVisitDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.siteVisitsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a site visit" })
  @UsePipes(new ZodValidationPipe(UpdateSiteVisitSchema))
  async update(@Param("id") id: string, @Body() dto: UpdateSiteVisitDto) {
    return this.siteVisitsService.update(id, dto);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Mark site visit as completed" })
  @UsePipes(new ZodValidationPipe(CompleteSiteVisitSchema))
  async complete(@Param("id") id: string, @Body() dto: CompleteSiteVisitDto) {
    return this.siteVisitsService.complete(id, dto.notes);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel a site visit" })
  async cancel(@Param("id") id: string) {
    return this.siteVisitsService.cancel(id);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a site visit (Admin only)" })
  async softDelete(@Param("id") id: string) {
    return this.siteVisitsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted site visit (Admin only)" })
  async restore(@Param("id") id: string) {
    return this.siteVisitsService.restore(id);
  }
}
