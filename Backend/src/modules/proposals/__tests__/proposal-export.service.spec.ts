import { Test, TestingModule } from "@nestjs/testing";
import { ProposalExportService } from "../proposal-export.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";
import { Role } from "../../../shared/decorators/roles.decorator";

describe("ProposalExportService", () => {
  let service: ProposalExportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      proposal: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      proposalItem: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalExportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProposalExportService>(ProposalExportService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("exportCsv", () => {
    it("should export CSV with default fields if no fields are selected", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: ["buildingName", "propertyType", "address", "city"] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building", propertyType: { name: "commercial_office" }, city: { name: "Mumbai" } },
        }
      ]);

      const csvContent = await service.exportCsv("prop-1", "user-1", Role.WORKER);
      
      expect(csvContent).toContain("Building Name,Property Type,Address,City");
      expect(csvContent).toContain("Test Building,commercial_office,,Mumbai");
    });

    it("should export CSV with specific selected fields", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: [] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building", city: { name: "Mumbai" } },
        }
      ]);

      const csvContent = await service.exportCsv("prop-1", "user-1", Role.WORKER, ["buildingName", "city"]);
      
      expect(csvContent).toContain("Building Name,City");
      expect(csvContent).toContain("Test Building,Mumbai");
      expect(csvContent).not.toContain("Property Type");
    });

    it("should throw ForbiddenException for restricted fields for WORKER role", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: [] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building" },
        }
      ]);

      // Should throw ForbiddenException when restricted field is requested
      await expect(service.exportCsv("prop-1", "user-1", Role.WORKER, ["buildingName", "internalNotes"]))
        .rejects.toThrow("You do not have permission to export restricted field");
    });

    it("should allow restricted fields for ADMIN role", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: [] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building", additionalFields: { ownerPhone: "1234567890" } },
        }
      ]);

      const csvContent = await service.exportCsv("prop-1", "user-1", Role.ADMIN, ["buildingName", "internalNotes"]);
      
      expect(csvContent).toContain("Building Name,Internal Notes");
      expect(csvContent).toContain("Test Building");
      expect(csvContent).toContain("1234567890");
    });

    it("should throw if proposal not found", async () => {
      prisma.proposal.findUnique.mockResolvedValue(null);
      await expect(service.exportCsv("missing", "user-1", Role.WORKER)).rejects.toThrow(NotFoundException);
    });
  });
});
