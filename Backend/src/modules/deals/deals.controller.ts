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
import { DealsService } from "./deals.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateDealSchema,
  UpdateDealSchema,
  AddCommissionSchema,
  AddInvoiceSchema,
  DealQuerySchema,
  CreateDealDto,
  UpdateDealDto,
  AddCommissionDto,
  AddInvoiceDto,
  DealQueryDto,
} from "./dto/deals.schema";

@ApiTags("deals")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "deals", version: "1" })
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List deals" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of deals",
    schema: {
      example: {
        data: [
          {
            id: "d1e42c00-1234-4567-8901-abcdef123456",
            title: "Acme Corp — Express Towers Unit 501",
            dealValue: 1800000,
            status: "negotiation",
            client: { name: "Acme Corp" },
            building: { name: "Express Towers" },
            unit: { unitNumber: "501" },
            assignee: { fullName: "Rahul Verma" },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(DealQuerySchema))
  async findAll(
    @Query() query: DealQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.dealsService.findAll(query, scope);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get deal by ID" })
  @ApiResponse({
    status: 200,
    description: "Deal with commissions and invoices",
    schema: {
      example: {
        id: "d1e42c00-1234-4567-8901-abcdef123456",
        title: "Acme Corp — Express Towers Unit 501",
        dealValue: 1800000,
        status: "negotiation",
        commissions: [{ amount: 54000, rate: 3, status: "pending" }],
        invoices: [{ amount: 54000, status: "pending", dueDate: "2025-02-15" }],
      },
    },
  })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.dealsService.findOne(id, scope);
  }

  @Post()
  @ApiOperation({ summary: "Create a new deal" })
  @ApiResponse({
    status: 201,
    description: "Deal created",
    schema: {
      example: {
        id: "d1e42c00-1234-4567-8901-abcdef123456",
        title: "Acme Corp — Express Towers Unit 501",
        dealValue: 1800000,
        status: "negotiation",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateDealSchema))
  async create(@Body() dto: CreateDealDto, @CurrentUser("id") userId: string) {
    return this.dealsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a deal" })
  @UsePipes(new ZodValidationPipe(UpdateDealSchema))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.dealsService.update(id, dto, userId);
  }

  @Post(":id/commissions")
  @ApiOperation({ summary: "Add commission to a deal" })
  @UsePipes(new ZodValidationPipe(AddCommissionSchema))
  async addCommission(@Param("id") id: string, @Body() dto: AddCommissionDto) {
    return this.dealsService.addCommission(id, dto);
  }

  @Post(":id/invoices")
  @ApiOperation({ summary: "Add invoice to a deal" })
  @UsePipes(new ZodValidationPipe(AddInvoiceSchema))
  async addInvoice(@Param("id") id: string, @Body() dto: AddInvoiceDto) {
    return this.dealsService.addInvoice(id, dto);
  }

  @Patch("invoices/:invoiceId/pay")
  @ApiOperation({ summary: "Mark invoice as paid" })
  async markInvoicePaid(@Param("invoiceId") invoiceId: string) {
    return this.dealsService.markInvoicePaid(invoiceId);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft delete a deal (Admin only)" })
  async softDelete(@Param("id") id: string) {
    return this.dealsService.softDelete(id);
  }

  @Post(":id/restore")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Restore a soft-deleted deal (Admin only)" })
  async restore(@Param("id") id: string) {
    return this.dealsService.restore(id);
  }
}
