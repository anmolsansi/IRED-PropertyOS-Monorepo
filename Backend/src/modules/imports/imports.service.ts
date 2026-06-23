import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ImportStatus } from "@prisma/client";

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.import.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { rows: true } },
      },
    });
  }

  async findOne(id: string) {
    const imp = await this.prisma.import.findUnique({
      where: { id },
      include: {
        rows: { orderBy: { rowNumber: "asc" } },
        creator: { select: { id: true, fullName: true } },
        processor: { select: { id: true, fullName: true } },
      },
    });
    if (!imp) throw new NotFoundException("Import not found");
    return imp;
  }

  async upload(
    data: {
      fileName: string;
      fileType: string;
      entityType: string;
      rows: ParsedRow[];
    },
    userId: string,
  ) {
    const validEntityTypes = ["building", "floor", "unit", "contact"];
    if (!validEntityTypes.includes(data.entityType)) {
      throw new BadRequestException(
        `Invalid entity type. Must be one of: ${validEntityTypes.join(", ")}`,
      );
    }

    const imp = await this.prisma.import.create({
      data: {
        fileName: data.fileName,
        fileType: data.fileType,
        entityType: data.entityType,
        createdBy: userId,
        status: ImportStatus.uploaded,
      },
    });

    if (data.rows && data.rows.length > 0) {
      await this.prisma.importRow.createMany({
        data: data.rows.map((row) => ({
          importId: imp.id,
          rowNumber: row.rowNumber,
          sourceData: row.data,
          status: "pending",
        })),
      });
    }

    return this.findOne(imp.id);
  }

  async mapColumns(id: string, mapping: Record<string, string>) {
    const imp = await this.prisma.import.findUnique({
      where: { id },
      include: { rows: true },
    });
    if (!imp) throw new NotFoundException("Import not found");
    if (imp.status !== ImportStatus.uploaded) {
      throw new BadRequestException("Import is not in uploaded status");
    }

    for (const row of imp.rows) {
      const sourceData = row.sourceData as Record<string, any>;
      const mappedData: Record<string, any> = {};

      for (const [systemField, sourceColumn] of Object.entries(mapping)) {
        if (sourceColumn && sourceData[sourceColumn] !== undefined) {
          mappedData[systemField] = sourceData[sourceColumn];
        }
      }

      await this.prisma.importRow.update({
        where: { id: row.id },
        data: { mappedData },
      });
    }

    return this.prisma.import.update({
      where: { id },
      data: { columnMapping: mapping, status: ImportStatus.mapped },
    });
  }

  async validate(id: string) {
    const imp = await this.prisma.import.findUnique({
      where: { id },
      include: { rows: true },
    });
    if (!imp) throw new NotFoundException("Import not found");
    if (imp.status !== ImportStatus.mapped) {
      throw new BadRequestException("Import must be mapped first");
    }

    const validationRules = this.getValidationRules(imp.entityType);
    let errorCount = 0;

    for (const row of imp.rows) {
      const mappedData = (row.mappedData as Record<string, any>) || {};
      const errors: string[] = [];

      for (const [field, rules] of Object.entries(validationRules)) {
        const value = mappedData[field];

        if (
          rules.required &&
          (value === undefined || value === null || value === "")
        ) {
          errors.push(`${field} is required`);
        }

        if (value !== undefined && value !== null && value !== "") {
          if (rules.type === "number" && isNaN(Number(value))) {
            errors.push(`${field} must be a number`);
          }
          if (rules.minLength && String(value).length < rules.minLength) {
            errors.push(
              `${field} must be at least ${rules.minLength} characters`,
            );
          }
        }
      }

      if (errors.length > 0) {
        errorCount++;
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: { status: "failed", errors },
        });
      } else {
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: { status: "validated" },
        });
      }
    }

    return this.prisma.import.update({
      where: { id },
      data: {
        status: errorCount > 0 ? ImportStatus.failed : ImportStatus.validated,
        validationErrors:
          errorCount > 0
            ? ({
                totalErrors: errorCount,
                totalRows: imp.rows.length,
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
  }

  async confirm(id: string, userId: string) {
    const imp = await this.prisma.import.findUnique({
      where: { id },
      include: { rows: true },
    });
    if (!imp) throw new NotFoundException("Import not found");
    if (imp.status !== ImportStatus.validated) {
      throw new BadRequestException("Import must be validated first");
    }

    const validRows = imp.rows.filter((r) => r.status === "validated");
    let imported = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        const mappedData = (row.mappedData as Record<string, any>) || {};
        await this.createEntity(imp.entityType, mappedData, userId);
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: { status: "completed" },
        });
        imported++;
      } catch (error) {
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: {
            status: "failed",
            errors: [(error as Error).message],
          },
        });
        failed++;
      }
    }

    return this.prisma.import.update({
      where: { id },
      data: {
        status: ImportStatus.completed,
        processedBy: userId,
        importStats: { imported, failed, total: validRows.length },
      },
    });
  }

  private async createEntity(
    entityType: string,
    data: Record<string, any>,
    userId: string,
  ) {
    switch (entityType) {
      case "building":
        return (this.prisma.building as any).create({
          data: { ...data, createdBy: userId, updatedBy: userId },
        });
      case "floor":
        return (this.prisma.floor as any).create({
          data: { ...data, createdBy: userId, updatedBy: userId },
        });
      case "unit":
        return (this.prisma.unit as any).create({
          data: { ...data, createdBy: userId, updatedBy: userId },
        });
      case "contact":
        return (this.prisma.contact as any).create({
          data: { ...data, createdBy: userId },
        });
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getValidationRules(entityType: string): Record<string, any> {
    const rules: Record<string, Record<string, any>> = {
      building: {
        name: { required: true, minLength: 2 },
        buildingCode: { required: true },
      },
      floor: {
        floorCode: { required: true },
        buildingId: { required: true },
        floorNumber: { required: true, type: "number" },
      },
      unit: {
        unitCode: { required: true },
        buildingId: { required: true },
        unitNumber: { required: true },
      },
      contact: {
        fullName: { required: true, minLength: 2 },
      },
    };
    return rules[entityType] || {};
  }
}
