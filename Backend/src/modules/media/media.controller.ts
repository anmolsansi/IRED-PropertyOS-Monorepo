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
import { MediaService } from "./media.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  GetUploadUrlSchema,
  CompleteUploadSchema,
  UpdateMediaSchema,
  MediaQuerySchema,
  GetUploadUrlDto,
  CompleteUploadDto,
  UpdateMediaDto,
  MediaQueryDto,
} from "./dto/media.schema";

@ApiTags("media")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "media", version: "1" })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: "List media files" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of media files",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            entityType: "building",
            entityId: "uuid",
            fileType: "image",
            fileName: "tower-photo.jpg",
            url: "https://...",
            sizeBytes: 245000,
          },
        ],
        pagination: { page: 1, limit: 20, total: 85, totalPages: 5 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(MediaQuerySchema))
  async findAll(@Query() query: MediaQueryDto) {
    if (query.buildingId)
      return this.mediaService.findByBuilding(query.buildingId);
    if (query.floorId) return this.mediaService.findByFloor(query.floorId);
    if (query.unitId) return this.mediaService.findByUnit(query.unitId);
    return this.mediaService.findAll({
      page: query.page,
      limit: query.limit,
      fileType: query.fileType,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get media by ID" })
  async findOne(@Param("id") id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(":id/download-url")
  @ApiOperation({ summary: "Get presigned download URL" })
  async getDownloadUrl(@Param("id") id: string) {
    return this.mediaService.getDownloadUrl(id);
  }

  @Post("upload-url")
  @ApiOperation({ summary: "Get presigned upload URL" })
  @UsePipes(new ZodValidationPipe(GetUploadUrlSchema))
  async getUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.mediaService.getUploadUrl(dto);
  }

  @Post("complete-upload")
  @ApiOperation({ summary: "Mark upload as complete" })
  @UsePipes(new ZodValidationPipe(CompleteUploadSchema))
  async completeUpload(@Body() dto: CompleteUploadDto) {
    return this.mediaService.completeUpload(dto.mediaId, dto.fileSizeBytes);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update media metadata (Admin only)" })
  @UsePipes(new ZodValidationPipe(UpdateMediaSchema))
  async update(@Param("id") id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.updateMetadata(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete media (Admin only)" })
  async softDelete(@Param("id") id: string) {
    return this.mediaService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore soft-deleted media (Admin only)" })
  async restore(@Param("id") id: string) {
    return this.mediaService.restore(id);
  }
}
