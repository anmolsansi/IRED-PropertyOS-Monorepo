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
import { BuildingsService } from "./buildings.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateBuildingSchema,
  UpdateBuildingSchema,
  BuildingQuerySchema,
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingQueryDto,
} from "./dto/buildings.schema";

@ApiTags("buildings")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "buildings", version: "1" })
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List completed/master buildings with filters" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of completed buildings",
    schema: {
      example: {
        data: [
          {
            id: "b1e42c00-1234-4567-8901-abcdef123456",
            buildingCode: "BLD-001",
            name: "Express Towers",
            totalFloors: 20,
            totalUnits: 120,
            city: { name: "Mumbai" },
            state: { name: "Maharashtra" },
            locality: { name: "Nariman Point" },
            propertyType: { name: "Office" },
            availabilityStatus: { name: "Available" },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(BuildingQuerySchema))
  async findAll(
    @Query() query: BuildingQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.buildingsService.findAll(query, scope);
  }

  @Get("intake")
  @Roles(Role.ADMIN, Role.WORKER)
  @GeographyScope()
  @ApiOperation({ summary: "List rider-submitted properties waiting in Property Intake" })
  async findIntake(
    @Query("page") page: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query("search") search: string | undefined,
    @Query("status") status: "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | undefined,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.buildingsService.findIntake(
      {
        page: page ? Number(page) : 1,
        limit: limit ? Math.min(Number(limit), 250) : 20,
        search,
        status,
      },
      scope,
    );
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get building by ID" })
  @ApiResponse({
    status: 200,
    description: "Building details with floors and contacts",
    schema: {
      example: {
        id: "b1e42c00-1234-4567-8901-abcdef123456",
        buildingCode: "BLD-001",
        name: "Express Towers",
        fullAddress: "123 Marine Drive, Nariman Point",
        latitude: 18.9432,
        longitude: 72.8234,
        totalFloors: 20,
        totalUnits: 120,
        floors: [{ floorNumber: 1, floorName: "Ground Floor" }],
        contacts: [{ fullName: "Rajesh Kumar", mobileNumber: "9876543210" }],
      },
    },
  })
  @ApiResponse({ status: 404, description: "Building not found" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.buildingsService.findOne(id, scope);
  }

  @Post()
  @ApiOperation({ summary: "Submit a new building to Property Intake" })
  @ApiResponse({
    status: 201,
    description: "Building submitted to Property Intake",
    schema: {
      example: {
        id: "b1e42c00-1234-4567-8901-abcdef123456",
        buildingCode: "BLD-001",
        name: "Express Towers",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateBuildingSchema))
  async create(
    @Body() dto: CreateBuildingDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.buildingsService.create(dto, userId);
  }

  @Patch(":id/intake-status")
  @Roles(Role.ADMIN, Role.WORKER)
  @ApiOperation({ summary: "Move a Property Intake record to New, In Progress, or Follow-up" })
  async updateIntakeStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.buildingsService.updateIntakeStatus(id, status, userId);
  }

  @Post(":id/complete-intake")
  @Roles(Role.ADMIN, Role.WORKER)
  @ApiOperation({ summary: "Complete Property Intake and promote the record to Properties" })
  async completeIntake(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.buildingsService.completeIntake(id, userId);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Update a building (Admin: direct, active intake: telecaller direct, master Worker: creates change request)",
  })
  @ApiResponse({
    status: 200,
    description: "Building updated or change request created",
  })
  @UsePipes(new ZodValidationPipe(UpdateBuildingSchema))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBuildingDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
  ) {
    return this.buildingsService.update(
      id,
      dto,
      userId,
      userRole === Role.ADMIN,
      userRole === Role.RIDER,
    );
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a building (Admin only)" })
  @ApiResponse({ status: 200, description: "Building soft deleted" })
  async softDelete(@Param("id") id: string) {
    return this.buildingsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted building (Admin only)" })
  @ApiResponse({ status: 200, description: "Building restored" })
  async restore(@Param("id") id: string) {
    return this.buildingsService.restore(id);
  }
}
