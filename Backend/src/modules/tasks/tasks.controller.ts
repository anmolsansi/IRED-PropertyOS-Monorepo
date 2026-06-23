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
import { TasksService } from "./tasks.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateFollowUpSchema,
  UpdateFollowUpSchema,
  TaskQuerySchema,
  CreateTaskDto,
  UpdateTaskDto,
  CreateFollowUpDto,
  UpdateFollowUpDto,
  TaskQueryDto,
} from "./dto/tasks.schema";

@ApiTags("tasks")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "tasks", version: "1" })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List tasks" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of tasks",
    schema: {
      example: {
        data: [
          {
            id: "t1e42c00-1234-4567-8901-abcdef123456",
            title: "Follow up with Acme Corp",
            type: "follow_up",
            status: "open",
            priority: "High",
            dueDate: "2025-01-20T00:00:00.000Z",
            assignee: { fullName: "Rahul Verma" },
            creator: { fullName: "System Admin" },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(TaskQuerySchema))
  async findAll(
    @Query() query: TaskQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.tasksService.findAll(query, scope);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task by ID" })
  @ApiResponse({
    status: 200,
    description: "Task with follow-ups",
    schema: {
      example: {
        id: "t1e42c00-1234-4567-8901-abcdef123456",
        title: "Follow up with Acme Corp",
        description: "Check if they need more options",
        type: "follow_up",
        status: "open",
        priority: "High",
        dueDate: "2025-01-20T00:00:00.000Z",
        followUps: [
          {
            id: "fu-1",
            title: "Called client",
            status: "completed",
            dueDate: "2025-01-18",
          },
        ],
      },
    },
  })
  async findOne(@Param("id") id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new task" })
  @ApiResponse({
    status: 201,
    description: "Task created",
    schema: {
      example: {
        id: "t1e42c00-1234-4567-8901-abcdef123456",
        title: "Follow up with Acme Corp",
        type: "follow_up",
        status: "open",
        priority: "High",
        dueDate: "2025-01-20T00:00:00.000Z",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateTaskSchema))
  async create(@Body() dto: CreateTaskDto, @CurrentUser("id") userId: string) {
    return this.tasksService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a task" })
  @UsePipes(new ZodValidationPipe(UpdateTaskSchema))
  async update(@Param("id") id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Post(":id/follow-ups")
  @ApiOperation({ summary: "Add follow-up to a task" })
  @UsePipes(new ZodValidationPipe(CreateFollowUpSchema))
  async addFollowUp(
    @Param("id") id: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.tasksService.addFollowUp(id, dto, userId);
  }

  @Get(":id/follow-ups")
  @ApiOperation({ summary: "List follow-ups for a task" })
  async getFollowUps(@Param("id") id: string) {
    return this.tasksService.getFollowUps(id);
  }

  @Patch("follow-ups/:followUpId")
  @ApiOperation({ summary: "Update a follow-up" })
  @UsePipes(new ZodValidationPipe(UpdateFollowUpSchema))
  async updateFollowUp(
    @Param("followUpId") followUpId: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.tasksService.updateFollowUp(followUpId, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a task (Admin only)" })
  async softDelete(@Param("id") id: string) {
    return this.tasksService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted task (Admin only)" })
  async restore(@Param("id") id: string) {
    return this.tasksService.restore(id);
  }
}
