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
import { ExportsService } from "./exports.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { ExportQuerySchema, ExportQueryDto } from "./dto/exports.schema";

@ApiTags("exports")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@Controller({ path: "exports", version: "1" })
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get(":entityType")
  @ApiOperation({ summary: "Export data as CSV-ready JSON" })
  @ApiResponse({
    status: 200,
    description: "Exportable data array",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            name: "Tower A",
            buildingCode: "tow-a",
            city: "Mumbai",
          },
        ],
        total: 45,
      },
    },
  })
  @UsePipes(new ZodValidationPipe(ExportQuerySchema))
  async export(
    @Param("entityType") entityType: string,
    @Query() query: ExportQueryDto,
  ) {
    return this.exportsService.getExportableData(entityType, query);
  }
}
