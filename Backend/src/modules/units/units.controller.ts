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
import { UnitsService } from "./units.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateUnitSchema,
  UpdateUnitSchema,
  UnitQuerySchema,
  CreateUnitDto,
  UpdateUnitDto,
  UnitQueryDto,
} from "./dto/units.schema";

@ApiTags("units")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "units", version: "1" })
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List units with filters" })
  @ApiResponse({
    status: 200,
    description: "Paginated unit list",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            unitCode: "u1",
            unitNumber: "101",
            carpetArea: 800,
            monthlyRent: 50000,
            availabilityStatus: { name: "Available" },
          },
        ],
        pagination: { page: 1, limit: 20, total: 200, totalPages: 10 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(UnitQuerySchema))
  async findAll(
    @Query() query: UnitQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.unitsService.findAll(query, scope);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get unit by ID" })
  @ApiResponse({ status: 200, description: "Unit details with relations" })
  @ApiResponse({ status: 404, description: "Unit not found" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.unitsService.findOne(id, scope);
  }

  @Post()
  @ApiOperation({ summary: "Create a new unit" })
  @ApiResponse({
    status: 201,
    description: "Unit created",
    schema: {
      example: {
        id: "uuid",
        unitCode: "bld-101",
        unitNumber: "101",
        carpetArea: 800,
        monthlyRent: 50000,
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateUnitSchema))
  async create(@Body() dto: CreateUnitDto, @CurrentUser("id") userId: string) {
    return this.unitsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a unit" })
  @ApiResponse({ status: 200, description: "Unit updated" })
  @UsePipes(new ZodValidationPipe(UpdateUnitSchema))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
  ) {
    return this.unitsService.update(id, dto, userId, userRole === Role.ADMIN);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a unit (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Unit soft-deleted",
    schema: { example: { id: "uuid", deletedAt: "2025-01-15T10:30:00.000Z" } },
  })
  async softDelete(@Param("id") id: string) {
    return this.unitsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted unit (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Unit restored",
    schema: { example: { id: "uuid", deletedAt: null } },
  })
  async restore(@Param("id") id: string) {
    return this.unitsService.restore(id);
  }
}
