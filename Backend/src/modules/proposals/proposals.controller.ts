import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Response } from "express";
import { ProposalsService } from "./proposals.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateProposalSchema,
  CreateProposalDto,
} from "./dto/proposals.schema";

@ApiTags("proposals")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "proposals", version: "1" })
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List all proposals" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of proposals",
    schema: {
      example: {
        data: [
          {
            id: "p1e42c00-1234-4567-8901-abcdef123456",
            title: null,
            status: "draft",
            unitIds: ["unit-id-1", "unit-id-2"],
            client: { name: "Acme Corp" },
            creator: { fullName: "System Admin" },
            createdAt: "2025-01-15T10:30:00.000Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("clientId") clientId?: string,
    @CurrentUser("geographicScope") scope?: any,
  ) {
    return this.proposalsService.findAll({ page, limit, clientId }, scope);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get proposal by ID" })
  @ApiResponse({
    status: 200,
    description: "Proposal with client details",
    schema: {
      example: {
        id: "p1e42c00-1234-4567-8901-abcdef123456",
        title: null,
        status: "draft",
        unitIds: ["unit-id-1", "unit-id-2"],
        notes: "Preferred locations: BKC, Lower Parel",
        client: {
          id: "client-id",
          name: "Acme Corp",
          company: "Acme Corporation Pvt Ltd",
          email: "contact@acme.com",
        },
        creator: { id: "user-id", fullName: "System Admin" },
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.findOne(id, scope);
  }

  @Post()
  @ApiOperation({ summary: "Create a proposal for a client" })
  @ApiResponse({
    status: 201,
    description: "Proposal created",
    schema: {
      example: {
        id: "p1e42c00-1234-4567-8901-abcdef123456",
        clientId: "client-id",
        unitIds: ["unit-id-1", "unit-id-2"],
        status: "draft",
        createdBy: "user-id",
        createdAt: "2025-01-15T10:30:00.000Z",
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateProposalSchema))
  async create(
    @Body() dto: CreateProposalDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.proposalsService.create(dto, userId);
  }

  @Post(":id/generate-pdf")
  @ApiOperation({ summary: "Generate PDF for a proposal" })
  @ApiResponse({ status: 200, description: "PDF file download" })
  async generatePdf(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.proposalsService.generatePdf(id);
    const fileName = `proposal-${id}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });
    res.end(buffer);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update proposal status (Admin only)" })
  @ApiResponse({ status: 200, description: "Proposal status updated" })
  async updateStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.proposalsService.updateStatus(id, status as any);
  }
}
