import {
  Controller,
  Get,
  Patch,
  Post,
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
import { ChangeRequestsService } from "./change-requests.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  ChangeRequestQuerySchema,
  ApproveItemsSchema,
  RejectItemsSchema,
  ResolveConflictSchema,
  ChangeRequestQueryDto,
  ApproveItemsDto,
  RejectItemsDto,
  ResolveConflictDto,
} from "./dto/change-requests.schema";

@ApiTags("change-requests")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "change-requests", version: "1" })
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List change requests" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of change requests",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            entityType: "building",
            entityId: "uuid",
            requestedBy: { id: "uuid", fullName: "John Doe" },
            status: "PENDING",
            itemCount: 3,
            createdAt: "2025-01-15T10:30:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 20, total: 12, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(ChangeRequestQuerySchema))
  async findAll(
    @Query() query: ChangeRequestQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.changeRequestsService.findAll(query, scope);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get change request by ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.changeRequestsService.findOne(id, scope);
  }

  @Post(":id/withdraw")
  @ApiOperation({ summary: "Withdraw a pending change request" })
  async withdraw(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.changeRequestsService.withdraw(id, userId);
  }

  @Post(":id/approve-items")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Approve selected items in a change request" })
  @UsePipes(new ZodValidationPipe(ApproveItemsSchema))
  async approveItems(
    @Param("id") id: string,
    @Body() dto: ApproveItemsDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.changeRequestsService.approveItems(id, dto.items, adminId);
  }

  @Post(":id/reject-items")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Reject selected items in a change request" })
  @UsePipes(new ZodValidationPipe(RejectItemsSchema))
  async rejectItems(
    @Param("id") id: string,
    @Body() dto: RejectItemsDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.changeRequestsService.rejectItems(id, dto.items, adminId);
  }

  @Post(":id/resolve-conflict")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Resolve a conflict in a change request" })
  @UsePipes(new ZodValidationPipe(ResolveConflictSchema))
  async resolveConflict(
    @Param("id") id: string,
    @Body() dto: ResolveConflictDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.changeRequestsService.resolveConflict(
      id,
      dto.changeItemId,
      dto.finalValue,
      adminId,
    );
  }
}
