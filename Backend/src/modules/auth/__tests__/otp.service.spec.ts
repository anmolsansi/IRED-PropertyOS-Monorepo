import { Test, TestingModule } from "@nestjs/testing";
import { OtpService } from "../otp.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";
import { OtpPurpose } from "@prisma/client";

describe("OtpService", () => {
  let service: OtpService;
  let prisma: {
    otpRecord: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      otpRecord: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("should generate a 6-digit OTP", async () => {
      const otp = await service.generate(
        "user-1",
        OtpPurpose.EMAIL_VERIFICATION,
      );
      expect(otp).toMatch(/^\d{6}$/);
      expect(prisma.otpRecord.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          purpose: "EMAIL_VERIFICATION",
          consumed: false,
        },
        data: { consumed: true },
      });
      expect(prisma.otpRecord.create).toHaveBeenCalled();
    });

    it("should use longer expiry for PASSWORD_RESET", async () => {
      const otp = await service.generate("user-1", OtpPurpose.PASSWORD_RESET);
      expect(otp).toMatch(/^\d{6}$/);
      const createCall = prisma.otpRecord.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const diff = expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(14 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(15 * 60 * 1000);
    });
  });

  describe("verify", () => {
    it("should throw if no active OTP found", async () => {
      prisma.otpRecord.findFirst.mockResolvedValue(null);
      await expect(
        service.verify("user-1", OtpPurpose.EMAIL_VERIFICATION, "123456"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw if OTP expired", async () => {
      prisma.otpRecord.findFirst.mockResolvedValue({
        id: "otp-1",
        codeHash: "hash",
        expiresAt: new Date(Date.now() - 10000),
        attempts: 0,
      });
      await expect(
        service.verify("user-1", OtpPurpose.EMAIL_VERIFICATION, "123456"),
      ).rejects.toThrow("OTP has expired");
    });

    it("should throw if max attempts exceeded", async () => {
      prisma.otpRecord.findFirst.mockResolvedValue({
        id: "otp-1",
        codeHash: "hash",
        expiresAt: new Date(Date.now() + 60000),
        attempts: 5,
      });
      await expect(
        service.verify("user-1", OtpPurpose.EMAIL_VERIFICATION, "123456"),
      ).rejects.toThrow("Too many attempts");
    });
  });
});
