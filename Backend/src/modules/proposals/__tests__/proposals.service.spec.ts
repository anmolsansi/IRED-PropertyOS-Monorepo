import { Test, TestingModule } from "@nestjs/testing";
import { ProposalsService } from "../proposals.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";

jest.mock("pdfkit", () => {
  const MockDocument = jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation(function (
      this: any,
      event: string,
      cb: any,
    ) {
      if (event === "data") this._dataCb = cb;
      if (event === "end") this._endCb = cb;
      if (event === "error") this._errorCb = cb;
      return this;
    }),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn().mockImplementation(function (this: any) {
      const chunk = Buffer.from("pdf-content");
      if (this._dataCb) this._dataCb(chunk);
      if (this._endCb) this._endCb();
    }),
  }));
  return { default: MockDocument, __esModule: true };
});

describe("ProposalsService", () => {
  let service: ProposalsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      client: {
        findUnique: jest.fn(),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      proposal: {
        create: jest.fn(),
        findMany: jest
          .fn()
          .mockResolvedValue({
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          }),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a proposal in the database", async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: "cl-1",
        name: "Test Client",
      });
      prisma.unit.findMany.mockResolvedValue([
        { id: "u-1", unitNumber: "101" },
      ]);
      prisma.proposal.create.mockResolvedValue({
        id: "prop-1",
        clientId: "cl-1",
        unitIds: ["u-1"],
        status: "draft",
        createdAt: new Date(),
      });

      const result = await service.create(
        { clientId: "cl-1", unitIds: ["u-1"] },
        "user-1",
      );

      expect(prisma.proposal.create).toHaveBeenCalled();
      expect(result).toHaveProperty("id", "prop-1");
      expect(result).toHaveProperty("status", "draft");
    });

    it("should throw if client not found", async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ clientId: "cl-1", unitIds: ["u-1"] }, "user-1"),
      ).rejects.toThrow("Client not found");
    });

    it("should throw if no valid units found", async () => {
      prisma.client.findUnique.mockResolvedValue({ id: "cl-1", name: "Test" });
      prisma.unit.findMany.mockResolvedValue([]);
      await expect(
        service.create({ clientId: "cl-1", unitIds: ["u-1"] }, "user-1"),
      ).rejects.toThrow("No valid units found");
    });
  });

  describe("findAll", () => {
    it("should return paginated proposals", async () => {
      prisma.proposal.findMany.mockResolvedValue([]);
      prisma.proposal.count.mockResolvedValue(0);
      const result = await service.findAll({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });
  });

  describe("findOne", () => {
    it("should return a proposal by id", async () => {
      prisma.proposal.findUnique.mockResolvedValue({
        id: "prop-1",
        client: {},
      });
      const result = await service.findOne("prop-1");
      expect(result).toHaveProperty("id", "prop-1");
    });

    it("should throw if not found", async () => {
      prisma.proposal.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(
        "Proposal not found",
      );
    });
  });

  describe("generatePdf", () => {
    it("should generate a PDF buffer from proposal id", async () => {
      prisma.proposal.findUnique.mockResolvedValue({
        id: "prop-1",
        client: { name: "Test", company: "Co" },
        unitIds: ["u-1"],
        notes: null,
      });
      prisma.unit.findMany.mockResolvedValue([
        { unitNumber: "101", unitCode: "U-101", building: { name: "Tower A" } },
      ]);
      const result = await service.generatePdf("prop-1");
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generatePdfFromData", () => {
    it("should generate a PDF buffer from data", async () => {
      const result = await service.generatePdfFromData({
        client: { name: "Test", company: "Co" },
        units: [{ unitNumber: "101", building: { name: "Tower A" } }],
      });
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
