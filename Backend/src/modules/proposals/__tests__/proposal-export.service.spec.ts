import { Test, TestingModule } from "@nestjs/testing";
import { ProposalExportService } from "../proposal-export.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";
import { Role } from "../../../shared/decorators/roles.decorator";
import { MediaService } from "../../media/media.service";

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
        {
          provide: MediaService,
          useValue: { buildPublicUrl: jest.fn((key: string) => `mock-url/${key}`) },
        },
      ],
    }).compile();

    service = module.get<ProposalExportService>(ProposalExportService);
    
    // Mock global fetch for image downloads
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("exportExcel", () => {
    it("should export Excel buffer with default fields if no fields are selected", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: ["buildingName", "propertyType", "address", "city"] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building", propertyType: { name: "commercial_office" }, city: { name: "Mumbai" } },
        }
      ]);

      const buffer = await service.exportExcel("prop-1", "user-1", Role.WORKER);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should throw ForbiddenException for restricted fields for WORKER role", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: [] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building" },
        }
      ]);

      // Should throw ForbiddenException when restricted field is requested
      await expect(service.exportExcel("prop-1", "user-1", Role.WORKER, ["buildingName", "internalNotes"]))
        .rejects.toThrow("You do not have permission to export restricted field");
    });

    it("should allow restricted fields for ADMIN role", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", fieldsConfig: { selectedFields: [] } });
      prisma.proposalItem.findMany.mockResolvedValue([
        {
          building: { name: "Test Building", additionalFields: { ownerPhone: "1234567890" } },
        }
      ]);

      const buffer = await service.exportExcel("prop-1", "user-1", Role.ADMIN, ["buildingName", "internalNotes"]);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should throw if proposal not found", async () => {
      prisma.proposal.findUnique.mockResolvedValue(null);
      await expect(service.exportExcel("missing", "user-1", Role.WORKER)).rejects.toThrow(NotFoundException);
    });
  });
});
