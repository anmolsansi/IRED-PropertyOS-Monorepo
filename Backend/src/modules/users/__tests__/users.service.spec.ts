import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../users.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { MailService } from "../../email/mail.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

describe("UsersService", () => {
  let service: UsersService;
  let prisma: any;
  let mailService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({
            id: "u-1",
            email: "test@test.com",
            role: "WORKER",
          }),
        update: jest.fn().mockResolvedValue({ id: "u-1" }),
      },
      workerGeographicAssignment: {
        createMany: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      unit: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({}),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mailService = { sendOtp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
    });
  });

  describe("findOne", () => {
    it("should return a user by id", async () => {
      const mock = { id: "u-1", email: "test@test.com" };
      prisma.user.findUnique.mockResolvedValue(mock);
      const result = await service.findOne("u-1");
      expect(result).toEqual(mock);
    });

    it("should throw NotFoundException", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne("u-1")).rejects.toThrow("User not found");
    });
  });

  describe("invite", () => {
    it("should create a new user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.invite({
        email: "new@test.com",
        fullName: "New User",
        role: "WORKER",
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("tempPassword");
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should throw if email already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        service.invite({
          email: "existing@test.com",
          fullName: "Test",
          role: "WORKER",
        }),
      ).rejects.toThrow("A user with this email already exists");
    });
  });

  describe("updateStatus", () => {
    it("should update user status", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u-1" });
      await service.updateStatus("u-1", "active");
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("should throw if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus("u-1", "active")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("reassignUnits", () => {
    it("should reassign units between workers", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "from-1" })
        .mockResolvedValueOnce({ id: "to-1" });
      const result = await service.reassignUnits("from-1", "to-1");
      expect(result).toHaveProperty("reassignCount", 3);
    });

    it("should throw if source worker not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.reassignUnits("from-1", "to-1")).rejects.toThrow(
        "Source worker not found",
      );
    });
  });

  describe("resetPassword", () => {
    it("should reset password and revoke tokens", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u-1" });
      const result = await service.resetPassword("u-1");
      expect(result).toHaveProperty("tempPassword");
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it("should throw if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword("u-1")).rejects.toThrow(
        "User not found",
      );
    });
  });
});
