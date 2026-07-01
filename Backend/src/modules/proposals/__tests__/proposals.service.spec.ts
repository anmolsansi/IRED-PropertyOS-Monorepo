import { Test, TestingModule } from "@nestjs/testing";
import { ProposalsService } from "../proposals.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { ProposalStatus } from "@prisma/client";

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
      building: {
        findUnique: jest.fn(),
      },
      proposal: {
        create: jest.fn(),
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      proposalItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { displayOrder: null } }),
      },
      unit: {
        findMany: jest.fn().mockResolvedValue([]),
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
      prisma.proposal.create.mockResolvedValue({
        id: "prop-1",
        clientId: "cl-1",
        status: ProposalStatus.draft,
        createdAt: new Date(),
      });

      const result = await service.create(
        { clientId: "cl-1" },
        "user-1",
      );

      expect(prisma.proposal.create).toHaveBeenCalled();
      expect(result).toHaveProperty("id", "prop-1");
      expect(result).toHaveProperty("status", ProposalStatus.draft);
    });

    it("should throw if client not found", async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ clientId: "cl-1" }, "user-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated proposals with item count", async () => {
      prisma.proposal.findMany.mockResolvedValue([
        { id: "prop-1", _count: { items: 5 } }
      ]);
      prisma.proposal.count.mockResolvedValue(1);
      
      const result = await service.findAll({});
      expect(result).toHaveProperty("data");
      expect(result.data[0]).toHaveProperty("itemCount", 5);
      expect(result).toHaveProperty("meta");
    });
  });

  describe("findOne", () => {
    it("should return a proposal by id", async () => {
      prisma.proposal.findUnique.mockResolvedValue({
        id: "prop-1",
        client: {},
        _count: { items: 2 }
      });
      const result = await service.findOne("prop-1");
      expect(result).toHaveProperty("id", "prop-1");
      expect(result).toHaveProperty("itemCount", 2);
    });

    it("should throw if not found", async () => {
      prisma.proposal.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("addItem", () => {
    beforeEach(() => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", _count: { items: 0 } });
      prisma.building.findUnique.mockResolvedValue({ id: "bld-1" });
    });

    it("should add a new item to the proposal", async () => {
      prisma.proposalItem.findFirst.mockResolvedValue(null);
      prisma.proposalItem.create.mockResolvedValue({ id: "item-1" });

      const result = await service.addItem("prop-1", { entityType: "building", buildingId: "bld-1" }, "user-1");
      
      expect(prisma.proposalItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposalId: "prop-1",
          entityType: "building",
          buildingId: "bld-1",
        })
      });
      expect(result.id).toEqual("item-1");
    });

    it("should throw ConflictException if item already added", async () => {
      prisma.proposalItem.findFirst.mockResolvedValue({ id: "item-1", removedAt: null });

      await expect(
        service.addItem("prop-1", { entityType: "building", buildingId: "bld-1" }, "user-1")
      ).rejects.toThrow(ConflictException);
    });

    it("should restore a soft-deleted item", async () => {
      prisma.proposalItem.findFirst.mockResolvedValue({ id: "item-1", removedAt: new Date() });
      prisma.proposalItem.update.mockResolvedValue({ id: "item-1", removedAt: null });

      const result = await service.addItem("prop-1", { entityType: "building", buildingId: "bld-1" }, "user-1");
      
      expect(prisma.proposalItem.update).toHaveBeenCalled();
      expect(result.id).toEqual("item-1");
    });
  });

  describe("getItems", () => {
    it("should return paginated items for a proposal", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", _count: { items: 1 } });
      prisma.proposalItem.findMany.mockResolvedValue([{ id: "item-1" }]);
      prisma.proposalItem.count.mockResolvedValue(1);

      const result = await service.getItems("prop-1", { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe("removeItem", () => {
    it("should soft delete an item", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", _count: { items: 1 } });
      prisma.proposalItem.findUnique.mockResolvedValue({ id: "item-1", proposalId: "prop-1" });
      prisma.proposalItem.update.mockResolvedValue({ id: "item-1" });

      await service.removeItem("prop-1", "item-1");
      expect(prisma.proposalItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { removedAt: expect.any(Date) }
      });
    });
  });

  describe("updateFieldsConfig", () => {
    it("should update selected fields", async () => {
      prisma.proposal.findUnique.mockResolvedValue({ id: "prop-1", _count: { items: 1 } });
      prisma.proposal.update.mockResolvedValue({ id: "prop-1" });

      await service.updateFieldsConfig("prop-1", { selectedFields: ["buildingName"] }, "ADMIN");
      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: "prop-1" },
        data: { fieldsConfig: { selectedFields: ["buildingName"] } }
      });
    });
  });
});
