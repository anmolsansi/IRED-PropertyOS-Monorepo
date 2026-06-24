import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { FloorsService } from "./floors.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateFloorSchema,
  UpdateFloorSchema,
  CreateFloorDto,
  UpdateFloorDto,
} from "./dto/floors.schema";

@ApiTags("floors")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "buildings/:buildingId/floors", version: "1" })
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List floors for a building" })
  @ApiResponse({
    status: 200,
    description: "Floor list",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            floorCode: "f1",
            floorName: "Ground Floor",
            floorNumber: 0,
            totalArea: 5000,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  async findByBuilding(
    @Param("buildingId") buildingId: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.floorsService.findByBuilding(buildingId, scope);
  }

  @Post()
  @ApiOperation({ summary: "Add a floor to a building" })
  @ApiResponse({ status: 201, description: "Floor created" })
  @UsePipes(new ZodValidationPipe(CreateFloorSchema))
  async create(
    @Param("buildingId") buildingId: string,
    @Body() dto: CreateFloorDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.floorsService.create(buildingId, dto, userId);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get floor by ID" })
  @ApiResponse({ status: 200, description: "Floor details" })
  @ApiResponse({ status: 404, description: "Floor not found" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.floorsService.findOne(id, scope);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a floor" })
  @ApiResponse({ status: 200, description: "Floor updated" })
  @UsePipes(new ZodValidationPipe(UpdateFloorSchema))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateFloorDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
  ) {
    return this.floorsService.update(id, dto, userId, userRole === Role.ADMIN);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a floor (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Floor soft-deleted",
    schema: { example: { id: "uuid", deletedAt: "2025-01-15T10:30:00.000Z" } },
  })
  async softDelete(@Param("id") id: string) {
    return this.floorsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted floor (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Floor restored",
    schema: { example: { id: "uuid", deletedAt: null } },
  })
  async restore(@Param("id") id: string) {
    return this.floorsService.restore(id);
  }
}
