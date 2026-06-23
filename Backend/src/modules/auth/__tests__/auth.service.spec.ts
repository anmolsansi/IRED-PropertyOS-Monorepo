import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { OtpService } from "../otp.service";
import { MailService } from "../../email/mail.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: any;
  let otpService: any;
  let mailService: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      refreshToken: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      workerGeographicAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    otpService = {
      generate: jest.fn().mockResolvedValue("123456"),
      verify: jest.fn().mockResolvedValue(true),
    };

    mailService = {
      sendOtp: jest.fn().mockResolvedValue({}),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue("mock-token"),
      verify: jest
        .fn()
        .mockReturnValue({
          sub: "user-1",
          email: "test@test.com",
          jti: "jti-1",
          exp: 9999999999,
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: OtpService, useValue: otpService },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                "app.jwt.accessSecret": "test-access-secret",
                "app.jwt.refreshSecret": "test-refresh-secret",
                "app.jwt.accessExpiry": "15m",
                "app.jwt.refreshExpiry": "7d",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("should throw if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login("test@test.com", "password")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw if user is inactive", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "1",
        status: "inactive",
        passwordHash: "hash",
      });
      await expect(service.login("test@test.com", "password")).rejects.toThrow(
        "Account is not active",
      );
    });

    it("should throw if password invalid", async () => {
      const hash = await argon2.hash("correct-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "1",
        status: "active",
        passwordHash: hash,
        email: "test@test.com",
      });
      await expect(service.login("test@test.com", "wrong")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should return userId and requiresOtp on success", async () => {
      const hash = await argon2.hash("correct-password");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        status: "active",
        passwordHash: hash,
        email: "test@test.com",
      });
      const result = await service.login("test@test.com", "correct-password");
      expect(result).toHaveProperty("userId", "user-1");
      expect(result).toHaveProperty("requiresOtp", true);
      expect(otpService.generate).toHaveBeenCalledWith(
        "user-1",
        "EMAIL_VERIFICATION",
      );
      expect(mailService.sendOtp).toHaveBeenCalled();
    });
  });

  describe("getMe", () => {
    it("should throw if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return user profile", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@test.com",
        fullName: "Test User",
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getMe("user-1");
      expect(result).toEqual(mockUser);
    });
  });

  describe("forgotPassword", () => {
    it("should always return success message (prevent enumeration)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword("nonexistent@test.com");
      expect(result.message).toContain("If an account exists");
    });
  });
});
