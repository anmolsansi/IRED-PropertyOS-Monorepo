import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ProposalStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import { buildProposalGeographyWhere, GeographicScope } from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(
    data: {
      clientId: string;
      requirementId?: string;
      unitIds: string[];
      notes?: string;
    },
    userId: string,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) throw new NotFoundException("Client not found");

    const units = await this.prisma.unit.findMany({
      where: { id: { in: data.unitIds } },
    });
    if (units.length === 0) throw new NotFoundException("No valid units found");

    const proposal = await this.prisma.proposal.create({
      data: {
        clientId: data.clientId,
        requirementId: data.requirementId,
        unitIds: data.unitIds,
        notes: data.notes,
        createdBy: userId,
        status: ProposalStatus.draft,
      },
      include: {
        client: true,
      },
    });

    this.logger.log(
      `Proposal ${proposal.id} created for client ${client.name} with ${units.length} units`,
    );
    return proposal;
  }

  async findAll(
    query: { page?: number; limit?: number; clientId?: string },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, clientId } = query;
    const skip = (page - 1) * limit;

    const geoWhere = buildProposalGeographyWhere(geographicScope);

    const where = {
      ...geoWhere,
      ...(clientId && { clientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: true,
          creator: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        client: true,
        creator: { select: { id: true, fullName: true } },
      },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    // Proposals are scoped through their units' buildings
    if (geographicScope) {
      const unitIds = (proposal.unitIds as string[]) || [];
      if (unitIds.length > 0) {
        const units = await this.prisma.unit.findMany({
          where: { id: { in: unitIds } },
          select: { buildingId: true },
        });
        const buildingIds = [...new Set(units.map((u) => u.buildingId).filter(Boolean))];
        if (buildingIds.length > 0) {
          const buildings = await this.prisma.building.findMany({
            where: { id: { in: buildingIds as string[] } },
            select: { id: true, stateId: true, cityId: true, localityId: true },
          });
          for (const b of buildings) {
            try {
              await verifyEntityGeography(this.prisma, geographicScope, b, "Proposal");
              return proposal;
            } catch {
              continue;
            }
          }
          throw new ForbiddenException("Proposal not found in your assigned geography");
        }
      }
    }
    return proposal;
  }

  async updateStatus(id: string, status: ProposalStatus) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException("Proposal not found");

    return this.prisma.proposal.update({
      where: { id },
      data: { status },
    });
  }

  async generatePdf(proposalId: string): Promise<Buffer> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { client: true },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");

    const unitIds = proposal.unitIds as string[];
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

  async generatePdfFromData(proposalData: {
    client: any;
    units: any[];
    notes?: string;
  }): Promise<Buffer> {
    return this.renderPdf(
      proposalData.client,
      proposalData.units,
      proposalData.notes,
    );
  }

  private renderPdf(
    client: any,
    units: any[],
    notes?: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("IRED PropertyOS", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("Commercial Property Proposal", { align: "center" });
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("Client Information");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(11);
      doc.text(`Name: ${client.name}`);
      if (client.company) doc.text(`Company: ${client.company}`);
      if (client.email) doc.text(`Email: ${client.email}`);
      if (client.mobileNumber) doc.text(`Mobile: ${client.mobileNumber}`);
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("Property Details");
      doc.moveDown(0.3);

      for (const unit of units) {
        doc.font("Helvetica-Bold").fontSize(11);
        doc.text(`${unit.building?.name || "N/A"} — Unit ${unit.unitNumber}`);
        doc.font("Helvetica").fontSize(10);
        doc.text(`  Code: ${unit.unitCode}`);
        if (unit.floor)
          doc.text(
            `  Floor: ${unit.floor.floorName || unit.floor.floorNumber}`,
          );
        if (unit.propertyType) doc.text(`  Type: ${unit.propertyType.name}`);
        if (unit.carpetArea)
          doc.text(`  Carpet Area: ${unit.carpetArea} sq ft`);
        if (unit.monthlyRent)
          doc.text(
            `  Monthly Rent: ₹${unit.monthlyRent.toLocaleString("en-IN")}`,
          );
        if (unit.furnishingStatus)
          doc.text(`  Furnishing: ${unit.furnishingStatus.name}`);
        if (unit.securityDeposit)
          doc.text(
            `  Security Deposit: ₹${unit.securityDeposit.toLocaleString("en-IN")}`,
          );
        doc.moveDown(0.5);
      }

      if (notes) {
        doc.moveDown(0.5);
        doc.fontSize(12).font("Helvetica-Bold").text("Notes");
        doc.font("Helvetica").fontSize(11).text(notes);
      }

      doc.moveDown(2);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, {
          align: "right",
        });
      doc.text("IRED PropertyOS — Commercial Real Estate Operations Platform", {
        align: "right",
      });

      doc.end();
    });
  }
}
