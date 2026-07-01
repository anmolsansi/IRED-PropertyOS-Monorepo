import { Injectable, Logger, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PROPOSAL_EXPORT_FIELDS } from "./constants/proposal-export-fields";
import { ProposalStatus } from "@prisma/client";

@Injectable()
export class ProposalExportService {
  private readonly logger = new Logger(ProposalExportService.name);

  constructor(private prisma: PrismaService) {}

  async exportCsv(
    proposalId: string,
    userId: string,
    userRole: string,
    selectedFields?: string[],
  ): Promise<string> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { client: true },
    });

    if (!proposal) throw new NotFoundException("Proposal not found");

    const fieldsToExport = selectedFields || (proposal.fieldsConfig as any)?.selectedFields || [];
    if (!fieldsToExport || fieldsToExport.length === 0) {
      throw new Error("No fields selected for export");
    }

    // Validate fields and restrict admin-only fields for workers
    const validFields = [];
    for (const fieldKey of fieldsToExport) {
      const fieldDef = PROPOSAL_EXPORT_FIELDS.find((f) => f.key === fieldKey);
      if (!fieldDef) continue;
      
      if (fieldDef.restricted && userRole !== "ADMIN") {
        throw new ForbiddenException(`You do not have permission to export restricted field: ${fieldDef.label}`);
      }
      validFields.push(fieldDef);
    }

    if (validFields.length === 0) {
      throw new Error("No valid fields selected for export");
    }

    // Fetch active items
    const items = await this.prisma.proposalItem.findMany({
      where: { proposalId, removedAt: null },
      orderBy: { displayOrder: "asc" },
      include: {
        building: {
          include: {
            state: true,
            city: true,
            locality: true,
            propertyType: true,
            availabilityStatus: true,
            verificationStatus: true,
            source: true,
          }
        },
        floor: true,
        unit: {
          include: {
            furnishingStatus: true,
            availabilityStatus: true,
            propertyType: true,
            floor: true,
          }
        },
      }
    });

    // Build CSV Content
    const headers = validFields.map(f => f.label);
    const rows = [headers.join(",")];

    for (const item of items) {
      const b = item.building;
      const u = item.unit;
      const f = item.floor;

      const rowValues = validFields.map(field => {
        let val: any = "";
        
        switch (field.key) {
          case "buildingName": val = b?.name; break;
          case "buildingCode": val = b?.buildingCode; break;
          case "propertyType": val = b?.propertyType?.name || u?.propertyType?.name; break;
          case "source": val = b?.source?.name; break;
          case "starRating": val = b?.starRating; break;
          case "verificationStatus": val = b?.verificationStatus?.name; break;
          case "address": val = b?.fullAddress; break;
          case "state": val = b?.state?.name; break;
          case "city": val = b?.city?.name; break;
          case "locality": val = b?.locality?.name; break;
          case "pincode": val = b?.pincode; break;
          case "latitude": val = b?.latitude; break;
          case "longitude": val = b?.longitude; break;
          case "googleMapsUrl": val = b?.googleMapsUrl; break;
          
          case "carpetArea": val = u?.carpetArea; break;
          case "builtUpArea": val = u?.builtUpArea; break;
          case "chargeableArea": val = u?.chargeableArea; break;
          case "superBuiltUpArea": val = u?.superBuiltUpArea; break;
          case "availableArea": val = u?.chargeableArea || b?.totalBuildingArea; break;

          case "rentPerSqFt": val = u?.rentPerSqftMonth; break;
          case "monthlyRent": val = u?.monthlyRent; break;
          case "maintenanceCharges": val = u?.maintenanceCharges; break;
          case "securityDeposit": val = u?.securityDeposit; break;
          case "lockInPeriod": val = u?.lockInPeriodMonths; break;
          case "leaseTenure": val = u?.leaseTermMonths; break;

          case "floorNumber": val = f?.floorNumber || u?.floor?.floorNumber; break;
          case "unitNumber": val = u?.unitNumber; break;
          case "unitStatus": val = u?.availabilityStatus?.name; break;
          case "unitArea": val = u?.chargeableArea; break;

          case "availabilityStatus": val = u?.availabilityStatus?.name || b?.availabilityStatus?.name; break;
          case "availableFromDate": val = u?.availabilityDate; break;
          
          case "furnishingStatus": val = u?.furnishingStatus?.name; break;

          case "proposalItemNote": val = item.notes; break;
          case "publicNotes": val = b?.notes || u?.notes; break;
          case "internalNotes": val = b?.additionalFields ? JSON.stringify(b.additionalFields) : ""; break;
        }

        // CSV escaping
        if (val === null || val === undefined) {
          return "";
        }
        
        let strVal = String(val);
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          strVal = `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      });

      rows.push(rowValues.join(","));
    }

    // Update proposal status
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.exported,
        exportedAt: new Date(),
      }
    });

    return rows.join("\n");
  }
}
