import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import { ImportsService } from "./imports.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { MapColumnsSchema, MapColumnsDto } from "./dto/imports.schema";
import { parseCsvFile } from "../../shared/utils/csv-parser";

@ApiTags("imports")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@Controller({ path: "imports", version: "1" })
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  @ApiOperation({ summary: "List all imports" })
  @ApiResponse({
    status: 200,
    description: "Import list",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            fileName: "buildings.csv",
            entityType: "building",
            status: "completed",
            createdAt: "2025-01-15T10:30:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 20, total: 5, totalPages: 1 },
      },
    },
  })
  async findAll() {
    return this.importsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get import by ID" })
  @ApiResponse({ status: 200, description: "Import details with rows" })
  @ApiResponse({ status: 404, description: "Import not found" })
  async findOne(@Param("id") id: string) {
    return this.importsService.findOne(id);
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload and parse import file (max 10MB)" })
  @ApiResponse({
    status: 201,
    description: "File parsed",
    schema: {
      example: {
        id: "uuid",
        fileName: "buildings.csv",
        entityType: "building",
        status: "uploaded",
        totalRows: 50,
        validRows: 48,
        errorRows: 2,
      },
    },
  })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("entityType") entityType: string,
    @CurrentUser("id") userId: string,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    if (file.size === 0) throw new BadRequestException("File is empty");
    const allowedMimes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
    if (
      !allowedMimes.includes(file.mimetype) &&
      !file.originalname.endsWith(".csv")
    ) {
      throw new BadRequestException("Only CSV files are allowed");
    }

    const rows = parseCsvFile(file.buffer.toString());
    return this.importsService.upload(
      {
        fileName: file.originalname,
        fileType: file.mimetype,
        entityType,
        rows,
      },
      userId,
    );
  }

  @Post(":id/map-columns")
  @ApiOperation({ summary: "Map source columns to system fields" })
  @ApiResponse({
    status: 200,
    description: "Columns mapped",
    schema: {
      example: {
        id: "uuid",
        status: "mapped",
        columnMapping: { "Building Name": "name", City: "cityId" },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(MapColumnsSchema))
  async mapColumns(@Param("id") id: string, @Body() dto: MapColumnsDto) {
    return this.importsService.mapColumns(id, dto.mapping);
  }

  @Post(":id/validate")
  @ApiOperation({ summary: "Validate import data" })
  @ApiResponse({
    status: 200,
    description: "Validation results",
    schema: {
      example: {
        id: "uuid",
        status: "validated",
        validRows: 48,
        errorRows: 2,
        errors: [{ row: 5, field: "name", message: "Required" }],
      },
    },
  })
  async validate(@Param("id") id: string) {
    return this.importsService.validate(id);
  }

  @Post(":id/confirm")
  @ApiOperation({ summary: "Confirm and process import" })
  @ApiResponse({
    status: 200,
    description: "Import processed",
    schema: {
      example: {
        id: "uuid",
        status: "completed",
        importStats: { created: 48, updated: 0, failed: 2 },
      },
    },
  })
  async confirm(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.importsService.confirm(id, userId);
  }
}
