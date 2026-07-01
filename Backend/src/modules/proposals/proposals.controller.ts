import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ProposalExportService } from "./proposal-export.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { Roles, Role } from "../../shared/decorators/roles.decorator";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  CreateProposalSchema,
  CreateProposalDto,
  UpdateProposalSchema,
  UpdateProposalDto,
  AddProposalItemSchema,
  AddProposalItemDto,
  UpdateProposalFieldsSchema,
  UpdateProposalFieldsDto,
  ExportProposalSchema,
  ExportProposalDto,
} from "./dto/proposals.schema";
import { PROPOSAL_EXPORT_FIELDS } from "./constants/proposal-export-fields";

@ApiTags("proposals")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "proposals", version: "1" })
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly exportService: ProposalExportService,
  ) {}

  @Get()
  @GeographyScope()
  @ApiOperation({ summary: "List all proposals" })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("clientId") clientId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("createdBy") createdBy?: string,
    @CurrentUser("geographicScope") scope?: any,
  ) {
    return this.proposalsService.findAll(
      { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, clientId, status, search, createdBy },
      scope,
    );
  }

  @Get("export-fields")
  @ApiOperation({ summary: "Get all available export fields" })
  getExportFields(@CurrentUser("role") role: string) {
    // If worker, only return non-restricted fields. If admin, return all.
    return PROPOSAL_EXPORT_FIELDS.filter(f => role === Role.ADMIN || !f.restricted);
  }

  @Get(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Get proposal by ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.findOne(id, scope);
  }

  @Post()
  @ApiOperation({ summary: "Create a proposal for a client" })
  @UsePipes(new ZodValidationPipe(CreateProposalSchema))
  async create(
    @Body() dto: CreateProposalDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.proposalsService.create(dto, userId);
  }

  @Patch(":id")
  @GeographyScope()
  @ApiOperation({ summary: "Update proposal details" })
  @UsePipes(new ZodValidationPipe(UpdateProposalSchema))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.update(id, dto, scope);
  }

  @Post(":id/items")
  @GeographyScope()
  @ApiOperation({ summary: "Add an item to the proposal" })
  @UsePipes(new ZodValidationPipe(AddProposalItemSchema))
  async addItem(
    @Param("id") id: string,
    @Body() dto: AddProposalItemDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.addItem(id, dto, userId, scope);
  }

  @Get(":id/items")
  @GeographyScope()
  @ApiOperation({ summary: "List proposal items" })
  async getItems(
    @Param("id") id: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @CurrentUser("geographicScope") scope?: any,
  ) {
    return this.proposalsService.getItems(id, { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, search }, scope);
  }

  @Delete(":id/items/:itemId")
  @GeographyScope()
  @ApiOperation({ summary: "Remove an item from the proposal" })
  async removeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.removeItem(id, itemId, scope);
  }

  @Patch(":id/fields")
  @GeographyScope()
  @ApiOperation({ summary: "Update selected fields for export" })
  @UsePipes(new ZodValidationPipe(UpdateProposalFieldsSchema))
  async updateFieldsConfig(
    @Param("id") id: string,
    @Body() dto: UpdateProposalFieldsDto,
    @CurrentUser("role") role: string,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.proposalsService.updateFieldsConfig(id, dto, role, scope);
  }

  @Post(":id/export")
  @ApiOperation({ summary: "Export proposal to CSV" })
  @UsePipes(new ZodValidationPipe(ExportProposalSchema))
  async exportCsv(
    @Param("id") id: string,
    @Body() dto: ExportProposalDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
    @Res() res: Response,
  ) {
    const csvContent = await this.exportService.exportCsv(id, userId, role, dto.selectedFields);
    const fileName = `proposal-${id}.csv`;
    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });
    res.send(csvContent);
  }

  // Legacy PDF support
  @Post(":id/generate-pdf")
  @ApiOperation({ summary: "Generate PDF for a proposal" })
  async generatePdf(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.proposalsService.generatePdf(id);
    const fileName = `proposal-${id}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });
    res.end(buffer);
  }
}
