import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../users.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { MailService } from "../../email/mail.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

const clerkClientMock = {
  users: {
    getUserList: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
};

jest.mock("@clerk/backend", () => ({
  createClerkClient: jest.fn(() => clerkClientMock),
}));

describe("UsersService", () => {
  let service: UsersService;
  let prisma: any;
  let mailService: any;
  const originalAuthProvider = process.env.AUTH_PROVIDER;
  const originalClerkSecretKey = process.env.CLERK_SECRET_KEY;

  beforeEach(async () => {
    delete process.env.AUTH_PROVIDER;
    delete process.env.CLERK_SECRET_KEY;
    jest.clearAllMocks();
    clerkClientMock.users.getUserList.mockResolvedValue({ data: [] });
    clerkClientMock.users.createUser.mockResolvedValue({ id: "clerk-u-1" });
    clerkClientMock.users.updateUser.mockResolvedValue({ id: "clerk-u-1" });
    clerkClientMock.users.deleteUser.mockResolvedValue({ id: "clerk-u-1" });

    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
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

  afterAll(() => {
    if (originalAuthProvider === undefined) {
      delete process.env.AUTH_PROVIDER;
    } else {
      process.env.AUTH_PROVIDER = originalAuthProvider;
    }
    if (originalClerkSecretKey === undefined) {
      delete process.env.CLERK_SECRET_KEY;
    } else {
      process.env.CLERK_SECRET_KEY = originalClerkSecretKey;
    }
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

    it("should create a Clerk user when Clerk auth is enabled", async () => {
      process.env.AUTH_PROVIDER = "clerk";
      process.env.CLERK_SECRET_KEY = "sk_test_123";
      prisma.user.findUnique.mockResolvedValue(null);

      await service.invite({
        email: "new@test.com",
        fullName: "New User",
        role: "WORKER",
      });

      expect(clerkClientMock.users.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: ["new@test.com"],
          password: expect.any(String),
          firstName: "New",
          lastName: "User",
        }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "new@test.com",
          clerkUserId: "clerk-u-1",
        }),
      });
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

    it("should update Clerk password when Clerk auth is enabled", async () => {
      process.env.AUTH_PROVIDER = "clerk";
      process.env.CLERK_SECRET_KEY = "sk_test_123";
      prisma.user.findUnique.mockResolvedValue({
        id: "u-1",
        email: "new@test.com",
        clerkUserId: "clerk-u-1",
      });

      await service.resetPassword("u-1");

      expect(clerkClientMock.users.updateUser).toHaveBeenCalledWith(
        "clerk-u-1",
        expect.objectContaining({
          password: expect.any(String),
          skipPasswordChecks: true,
          signOutOfOtherSessions: true,
        }),
      );
    });

    it("should throw if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword("u-1")).rejects.toThrow(
        "User not found",
      );
    });
  });
});
