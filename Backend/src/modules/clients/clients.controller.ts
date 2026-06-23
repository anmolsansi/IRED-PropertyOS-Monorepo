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
import { ClientsService } from "./clients.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateClientSchema,
  UpdateClientSchema,
  AddClientContactSchema,
  CreateRequirementSchema,
  UpdateRequirementSchema,
  AddShortlistSchema,
  UpdateShortlistSchema,
  ClientQuerySchema,
  CreateClientDto,
  UpdateClientDto,
  AddClientContactDto,
  CreateRequirementDto,
  UpdateRequirementDto,
  AddShortlistDto,
  UpdateShortlistDto,
  ClientQueryDto,
} from "./dto/clients.schema";

@ApiTags("clients")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "clients", version: "1" })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: "List clients" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of clients",
    schema: {
      example: {
        data: [
          {
            id: "c1e42c00-1234-4567-8901-abcdef123456",
            name: "Acme Corp",
            company: "Acme Corporation Pvt Ltd",
            email: "contact@acme.com",
            mobileNumber: "9876543210",
            contacts: [{ fullName: "Priya Sharma", role: "Decision Maker" }],
            requirements: [
              { title: "Office space in BKC", minArea: 2000, maxArea: 5000 },
            ],
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(ClientQuerySchema))
  async findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get client by ID" })
  @ApiResponse({
    status: 200,
    description: "Client with contacts, requirements, and shortlists",
    schema: {
      example: {
        id: "c1e42c00-1234-4567-8901-abcdef123456",
        name: "Acme Corp",
        company: "Acme Corporation Pvt Ltd",
        email: "contact@acme.com",
        mobileNumber: "9876543210",
        contacts: [
          {
            id: "ct-1",
            fullName: "Priya Sharma",
            mobileNumber: "9876543211",
            role: "Decision Maker",
          },
        ],
        requirements: [
          {
            id: "req-1",
            title: "Office space in BKC",
            minArea: 2000,
            maxArea: 5000,
            minBudget: 500000,
            maxBudget: 1500000,
            status: "active",
          },
        ],
      },
    },
  })
  async findOne(@Param("id") id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new client" })
  @ApiResponse({
    status: 201,
    description: "Client created successfully",
    schema: {
      example: {
        id: "c1e42c00-1234-4567-8901-abcdef123456",
        name: "Acme Corp",
        company: "Acme Corporation Pvt Ltd",
        email: "contact@acme.com",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateClientSchema))
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.clientsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a client" })
  @UsePipes(new ZodValidationPipe(UpdateClientSchema))
  async update(@Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Post(":id/contacts")
  @ApiOperation({ summary: "Add a contact to a client" })
  @UsePipes(new ZodValidationPipe(AddClientContactSchema))
  async addContact(@Param("id") id: string, @Body() dto: AddClientContactDto) {
    return this.clientsService.addContact(id, dto);
  }

  @Delete(":clientId/contacts/:contactId")
  @ApiOperation({ summary: "Remove a contact from a client" })
  async removeContact(@Param("contactId") contactId: string) {
    return this.clientsService.removeContact(contactId);
  }

  @Post(":id/requirements")
  @ApiOperation({ summary: "Create a requirement for a client" })
  @ApiResponse({
    status: 201,
    description: "Requirement created",
    schema: {
      example: {
        id: "req-1",
        clientId: "c1e42c00-1234-4567-8901-abcdef123456",
        title: "Office space in BKC",
        minArea: 2000,
        maxArea: 5000,
        minBudget: 500000,
        maxBudget: 1500000,
        preferredLocations: ["BKC", "Lower Parel"],
        status: "active",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateRequirementSchema))
  async createRequirement(
    @Param("id") id: string,
    @Body() dto: CreateRequirementDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.clientsService.createRequirement(id, dto, userId);
  }

  @Patch("requirements/:reqId")
  @ApiOperation({ summary: "Update a requirement" })
  @UsePipes(new ZodValidationPipe(UpdateRequirementSchema))
  async updateRequirement(
    @Param("reqId") reqId: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.clientsService.updateRequirement(reqId, dto);
  }

  @Post("requirements/:reqId/shortlists")
  @ApiOperation({ summary: "Add a shortlist to a requirement" })
  @UsePipes(new ZodValidationPipe(AddShortlistSchema))
  async addShortlist(
    @Param("reqId") reqId: string,
    @Body() dto: AddShortlistDto,
  ) {
    return this.clientsService.addShortlist(reqId, dto);
  }

  @Patch("shortlists/:shortlistId")
  @ApiOperation({ summary: "Update a shortlist status" })
  @UsePipes(new ZodValidationPipe(UpdateShortlistSchema))
  async updateShortlist(
    @Param("shortlistId") shortlistId: string,
    @Body() dto: UpdateShortlistDto,
  ) {
    return this.clientsService.updateShortlist(shortlistId, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a client (Admin only)" })
  async softDelete(@Param("id") id: string) {
    return this.clientsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted client (Admin only)" })
  async restore(@Param("id") id: string) {
    return this.clientsService.restore(id);
  }
}
