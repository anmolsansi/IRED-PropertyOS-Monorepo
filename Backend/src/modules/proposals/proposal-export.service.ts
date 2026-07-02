import { Injectable, Logger, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PROPOSAL_EXPORT_FIELDS } from "./constants/proposal-export-fields";
import { ProposalStatus } from "@prisma/client";
import { MediaService } from "../media/media.service";
import * as exceljs from "exceljs";

@Injectable()
export class ProposalExportService {
  private readonly logger = new Logger(ProposalExportService.name);

  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async exportExcel(
    proposalId: string,
    userId: string,
    userRole: string,
    selectedFields?: string[],
  ): Promise<Buffer> {
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
            media: true,
          }
        },
        floor: true,
        unit: {
          include: {
            furnishingStatus: true,
            availabilityStatus: true,
            propertyType: true,
            floor: true,
            media: true,
          }
        },
      }
    });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Proposal");

    // Build headers
    const headers = validFields.map(f => f.label);
    worksheet.addRow(headers);
    
    // Auto-fit headers (simple bold)
    worksheet.getRow(1).font = { bold: true };

    for (let rowIndex = 0; rowIndex < items.length; rowIndex++) {
      const item = items[rowIndex];
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

        return val ?? "";
      });

      const excelRow = worksheet.addRow(rowValues);
      const currentRowNum = excelRow.number;

      // Handle Images
      const images: string[] = [];
      if (b?.media) {
        images.push(...b.media.map(m => this.mediaService.buildPublicUrl(m.storageKey)));
      }
      if (u?.media) {
        images.push(...u.media.map(m => this.mediaService.buildPublicUrl(m.storageKey)));
      }
      
      if (images.length > 0) {
        // Set a custom row height so images fit (100 is approx 133 pixels)
        worksheet.getRow(currentRowNum).height = 100;

        let currentImageCol = validFields.length;
        
        for (let i = 0; i < images.length; i++) {
          const imgUrl = images[i];
          const imgColNum = currentImageCol + i + 1;
          
          // Ensure column is wide enough
          const col = worksheet.getColumn(imgColNum);
          if (!col.width || col.width < 25) {
             col.width = 25; // approx 175 pixels
          }
          // Set header if missing
          if (!worksheet.getCell(1, imgColNum).value) {
            worksheet.getCell(1, imgColNum).value = `Image ${i + 1}`;
            worksheet.getCell(1, imgColNum).font = { bold: true };
          }
          
          try {
            const response = await fetch(imgUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              const imageId = workbook.addImage({
                buffer: buffer as any,
                extension: imgUrl.toLowerCase().includes('.png') ? 'png' : 'jpeg',
              });
              
              worksheet.addImage(imageId, {
                tl: { col: imgColNum - 1, row: currentRowNum - 1 },
                ext: { width: 130, height: 130 },
              });
            } else {
               worksheet.getCell(currentRowNum, imgColNum).value = "Image Fetch Failed";
            }
          } catch (err: any) {
            this.logger.warn(`Failed to fetch image ${imgUrl}: ${err.message}`);
            worksheet.getCell(currentRowNum, imgColNum).value = "Error Loading";
          }
        }
      }
    }

    // Update proposal status
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.exported,
        exportedAt: new Date(),
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
