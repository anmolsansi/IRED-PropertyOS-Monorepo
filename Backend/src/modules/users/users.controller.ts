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
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  InviteUserSchema,
  UpdateUserStatusSchema,
  UpdateUserSchema,
  AssignGeographicScopeSchema,
  ReassignUnitsSchema,
  UserQuerySchema,
  InviteUserDto,
  UpdateUserStatusDto,
  UpdateUserDto,
  AssignGeographicScopeDto,
  ReassignUnitsDto,
  UserQueryDto,
} from "./dto/users.schema";

@ApiTags("users")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "List all users (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Paginated user list",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            fullName: "John Doe",
            email: "john@example.com",
            role: "WORKER",
            status: "active",
          },
        ],
        pagination: { page: 1, limit: 20, total: 15, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(UserQuerySchema))
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, description: "User details" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post("invite")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Invite a new worker (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "User invited",
    schema: {
      example: {
        id: "uuid",
        fullName: "New Worker",
        email: "worker@example.com",
        role: "WORKER",
        status: "active",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(InviteUserSchema))
  async invite(@Body() dto: InviteUserDto) {
    return this.usersService.invite(dto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update user details (Admin only)" })
  @ApiResponse({ status: 200, description: "User updated" })
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update user status (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "User status updated",
    schema: { example: { id: "uuid", status: "inactive" } },
  })
  @UsePipes(new ZodValidationPipe(UpdateUserStatusSchema))
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.status);
  }

  @Post(":id/geographic-assignments")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Assign geographic scope to a worker (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Geographic assignments created",
    schema: { example: { count: 3 } },
  })
  @UsePipes(new ZodValidationPipe(AssignGeographicScopeSchema))
  async assignGeographicScope(
    @Param("id") id: string,
    @Body() dto: AssignGeographicScopeDto,
  ) {
    return this.usersService.assignGeographicScope(id, dto.assignments);
  }

  @Post("reassign-units")
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Reassign units from one worker to another (Admin only)",
  })
  @ApiResponse({
    status: 200,
    description: "Units reassigned",
    schema: { example: { reassigned: 12 } },
  })
  @UsePipes(new ZodValidationPipe(ReassignUnitsSchema))
  async reassignUnits(@Body() dto: ReassignUnitsDto) {
    return this.usersService.reassignUnits(dto.fromWorkerId, dto.toWorkerId);
  }

  @Post(":id/reset-password")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Reset user password (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Password reset",
    schema: { example: { message: "Password reset email sent" } },
  })
  async resetPassword(@Param("id") id: string) {
    return this.usersService.resetPassword(id);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Deactivate user (Admin only)" })
  @ApiResponse({ status: 200, description: "User deactivated" })
  async deactivate(@Param("id") id: string) {
    return this.usersService.updateStatus(id, "inactive");
  }
}
