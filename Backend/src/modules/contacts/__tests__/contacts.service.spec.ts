import { Test, TestingModule } from "@nestjs/testing";
import { ContactsService } from "../contacts.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("ContactsService", () => {
  let service: ContactsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      contact: {
        findUnique: jest.fn(),
        create: jest
          .fn()
          .mockResolvedValue({ id: "c-1", fullName: "Test Contact" }),
        update: jest.fn().mockResolvedValue({ id: "c-1", fullName: "Updated" }),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      changeRequest: {
        create: jest.fn().mockResolvedValue({ id: "cr-1", changeItems: [] }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findOne", () => {
    it("should return a contact by id", async () => {
      const mock = { id: "c-1", fullName: "Test" };
      prisma.contact.findUnique.mockResolvedValue(mock);
      const result = await service.findOne("c-1");
      expect(result).toEqual(mock);
    });
  });

  describe("create", () => {
    it("should create a contact", async () => {
      const result = await service.create({ fullName: "John" }, "user-1");
      expect(result).toHaveProperty("id", "c-1");
      expect(prisma.contact.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update directly for admin", async () => {
      prisma.contact.findUnique.mockResolvedValue({
        id: "c-1",
        fullName: "Original",
      });
      const result = await service.update(
        "c-1",
        { fullName: "Updated" },
        "admin-1",
        true,
      );
      expect(result).toHaveProperty("fullName", "Updated");
    });

    it("should throw NotFoundException for non-existent contact", async () => {
      prisma.contact.findUnique.mockResolvedValue(null);
      await expect(service.update("c-1", {}, "user-1", true)).rejects.toThrow(
        "Contact not found",
      );
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt", async () => {
      await service.softDelete("c-1");
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("restore", () => {
    it("should clear deletedAt", async () => {
      await service.restore("c-1");
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { deletedAt: null },
      });
    });
  });

  describe("logView", () => {
    it("should create audit event", async () => {
      const result = await service.logView("c-1", "user-1");
      expect(result).toEqual({ success: true });
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });
  });
});
