import { Test, TestingModule } from "@nestjs/testing";
import { ImportsService } from "../imports.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";

describe("ImportsService", () => {
  let service: ImportsService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      import: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: "imp-1",
            status: "uploaded",
            rows: [],
            creator: null,
            processor: null,
          }),
        create: jest
          .fn()
          .mockResolvedValue({ id: "imp-1", status: "uploaded" }),
        update: jest.fn().mockResolvedValue({ id: "imp-1", status: "mapped" }),
      },
      importRow: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      building: { create: jest.fn().mockResolvedValue({ id: "b-1" }) },
      unit: { create: jest.fn().mockResolvedValue({ id: "u-1" }) },
    };

    notifications = { sendEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all imports", async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe("upload", () => {
    it("should create an import record", async () => {
      const result = await service.upload(
        {
          fileName: "test.csv",
          fileType: "text/csv",
          entityType: "building",
          rows: [{ rowNumber: 1, data: { name: "Test" } }],
        },
        "user-1",
      );
      expect(result).toHaveProperty("id", "imp-1");
      expect(prisma.import.create).toHaveBeenCalled();
      expect(prisma.importRow.createMany).toHaveBeenCalled();
    });
  });
});
