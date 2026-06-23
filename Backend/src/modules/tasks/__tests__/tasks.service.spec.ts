import { Test, TestingModule } from "@nestjs/testing";
import { TasksService } from "../tasks.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("TasksService", () => {
  let service: TasksService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "t-1", title: "Test Task" }),
        update: jest.fn().mockResolvedValue({}),
      },
      followUp: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });
  });

  describe("create", () => {
    it("should create a task", async () => {
      const result = await service.create({ title: "Test Task" }, "user-1");
      expect(result).toHaveProperty("id", "t-1");
    });
  });

  describe("update", () => {
    it("should throw if not found", async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(
        service.update("nonexistent", { status: "completed" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw on invalid transition", async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: "t-1",
        status: "completed",
      });
      await expect(service.update("t-1", { status: "open" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should allow valid transition", async () => {
      prisma.task.findUnique.mockResolvedValue({ id: "t-1", status: "open" });
      await service.update("t-1", { status: "in_progress" });
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });

  describe("addFollowUp", () => {
    it("should throw if task not found", async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(
        service.addFollowUp("nonexistent", {}, "user-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
