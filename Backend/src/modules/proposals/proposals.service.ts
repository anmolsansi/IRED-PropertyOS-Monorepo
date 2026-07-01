import { Injectable, NotFoundException, ForbiddenException, Logger, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ProposalStatus, ProposalEntityType } from "@prisma/client";
import PDFDocument from "pdfkit";
import { buildProposalGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";
import { CreateProposalDto, UpdateProposalDto, AddProposalItemDto, UpdateProposalFieldsDto } from "./dto/proposals.schema";
import { DEFAULT_SELECTED_FIELDS } from "./constants/proposal-export-fields";

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(data: CreateProposalDto, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) throw new NotFoundException("Client not found");

    const proposal = await this.prisma.proposal.create({
      data: {
        clientId: data.clientId,
        requirementId: data.requirementId,
        title: data.title || `${client.name} - Property Proposal - ${new Date().toLocaleDateString()}`,
        notes: data.notes,
        createdBy: userId,
        status: ProposalStatus.draft,
        fieldsConfig: { selectedFields: DEFAULT_SELECTED_FIELDS },
      },
      include: {
        client: true,
      },
    });

    this.logger.log(`Proposal ${proposal.id} created for client ${client.name}`);
    return proposal;
  }

  async findAll(
    query: { page?: number; limit?: number; clientId?: string; status?: string; search?: string; createdBy?: string },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, clientId, status, search, createdBy } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildProposalGeographyWhere(geographicScope);

    const where: any = {
      ...(clientId && { clientId }),
      ...(status && { status: status as ProposalStatus }),
    };

    if (geographicScope) {
       // Worker sees proposals they created OR proposals with items in their geography
       where.OR = [
         { createdBy: (geographicScope as any).userId },
         ...(geoWhere.OR || []),
       ].filter(Boolean);
       
       if (where.OR.length === 0) {
         delete where.OR; // fallback if no OR conditions
       }
    } else if (createdBy) {
      where.createdBy = createdBy;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: true,
          creator: { select: { id: true, fullName: true } },
          _count: { select: { items: { where: { removedAt: null } } } }
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    const transformedData = data.map(p => ({
      ...p,
      itemCount: p._count.items,
      _count: undefined,
    }));

    return {
      data: transformedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        client: true,
        creator: { select: { id: true, fullName: true } },
        _count: { select: { items: { where: { removedAt: null } } } }
      },
    });
    
    if (!proposal) throw new NotFoundException("Proposal not found");

    if (geographicScope && proposal.createdBy !== (geographicScope as any).userId) {
      // Must have items in assigned geography
      const items = await this.prisma.proposalItem.findMany({
        where: { proposalId: id, buildingId: { not: null } },
        select: { buildingId: true },
      });
      const buildingIds = [...new Set(items.map((i) => i.buildingId).filter(Boolean))];
      if (buildingIds.length > 0) {
        const buildings = await this.prisma.building.findMany({
          where: { id: { in: buildingIds as string[] } },
          select: { id: true, stateId: true, cityId: true, localityId: true },
        });
        
        let hasAccess = false;
        for (const b of buildings) {
          try {
            await verifyEntityGeography(this.prisma, geographicScope, b, "Proposal");
            hasAccess = true;
            break;
          } catch {
            continue;
          }
        }
        if (!hasAccess) {
          throw new ForbiddenException("Proposal not found in your assigned geography");
        }
      } else {
        throw new ForbiddenException("Proposal not found in your assigned geography");
      }
    }
    
    return {
      ...proposal,
      itemCount: proposal._count.items,
      _count: undefined,
    };
  }

  async update(id: string, data: UpdateProposalDto, geographicScope?: GeographicScope) {
    await this.findOne(id, geographicScope); // Verify access
    return this.prisma.proposal.update({
      where: { id },
      data,
    });
  }

  // --- Proposal Items ---

  async addItem(proposalId: string, data: AddProposalItemDto, userId: string, geographicScope?: GeographicScope) {
    await this.findOne(proposalId, geographicScope); // Verify access to proposal

    if (data.entityType === "building" && data.buildingId) {
      const building = await this.prisma.building.findUnique({ where: { id: data.buildingId }, select: { id: true, stateId: true, cityId: true, localityId: true } });
      if (!building) throw new NotFoundException("Building not found");
      if (geographicScope) await verifyEntityGeography(this.prisma, geographicScope, building, "Building");
    }

    const existingItem = await this.prisma.proposalItem.findUnique({
      where: {
        proposalId_entityType_buildingId_floorId_unitId: {
          proposalId,
          entityType: data.entityType as ProposalEntityType,
          buildingId: data.buildingId || null,
          floorId: data.floorId || null,
          unitId: data.unitId || null,
        }
      }
    });

    if (existingItem) {
      if (existingItem.removedAt === null) {
        throw new ConflictException("This property is already added to this proposal.");
      } else {
        // Restore soft-deleted item
        return this.prisma.proposalItem.update({
          where: { id: existingItem.id },
          data: { removedAt: null, addedBy: userId, addedAt: new Date() }
        });
      }
    }

    // Get max display order
    const maxOrderRes = await this.prisma.proposalItem.aggregate({
      where: { proposalId },
      _max: { displayOrder: true }
    });
    const displayOrder = (maxOrderRes._max.displayOrder || 0) + 1;

    return this.prisma.proposalItem.create({
      data: {
        proposalId,
        entityType: data.entityType as ProposalEntityType,
        buildingId: data.buildingId,
        floorId: data.floorId,
        unitId: data.unitId,
        notes: data.notes,
        addedBy: userId,
        displayOrder,
      }
    });
  }

  async getItems(proposalId: string, query: { page?: number; limit?: number; search?: string }, geographicScope?: GeographicScope) {
    await this.findOne(proposalId, geographicScope); // Verify access
    
    const { page = 1, limit = 50, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { proposalId, removedAt: null };

    if (search) {
      where.OR = [
        { building: { name: { contains: search, mode: "insensitive" } } },
        { unit: { unitCode: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proposalItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { displayOrder: "asc" },
        include: {
          building: true,
          floor: true,
          unit: true,
        }
      }),
      this.prisma.proposalItem.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async removeItem(proposalId: string, itemId: string, geographicScope?: GeographicScope) {
    await this.findOne(proposalId, geographicScope); // Verify access
    
    const item = await this.prisma.proposalItem.findUnique({ where: { id: itemId } });
    if (!item || item.proposalId !== proposalId) {
      throw new NotFoundException("Proposal item not found");
    }

    await this.prisma.proposalItem.update({
      where: { id: itemId },
      data: { removedAt: new Date() }
    });
    return { success: true };
  }

  // --- Field Config ---

  async updateFieldsConfig(proposalId: string, data: UpdateProposalFieldsDto, userRole: string, geographicScope?: GeographicScope) {
    await this.findOne(proposalId, geographicScope);

    // Backend validation for restricted fields would normally go here (or in export service), 
    // we just store the config but could validate here too.
    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        fieldsConfig: { selectedFields: data.selectedFields }
      }
    });
  }

  // Legacy PDF method for backward compatibility
  async generatePdf(proposalId: string): Promise<Buffer> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { client: true },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");

    const unitIds = (proposal.unitIds as string[]) || [];
    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      include: {
        building: true,
        floor: true,
        propertyType: true,
        furnishingStatus: true,
      },
    });

    return this.renderPdf(proposal.client, units, proposal.notes || undefined);
  }

  private renderPdf(client: any, units: any[], notes?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end(); // stubbed out for brevity as requested not in MVP
    });
  }
}
