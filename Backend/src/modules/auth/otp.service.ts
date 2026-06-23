import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { randomInt } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { OtpPurpose } from "@prisma/client";

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MIN = 10;
  private readonly OTP_EXPIRY_RESET_MIN = 15;
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string, purpose: OtpPurpose): Promise<string> {
    const otp = randomInt(0, 1_000_000)
      .toString()
      .padStart(this.OTP_LENGTH, "0");

    const codeHash = await argon2.hash(otp);

    const expiryMin =
      purpose === "PASSWORD_RESET"
        ? this.OTP_EXPIRY_RESET_MIN
        : this.OTP_EXPIRY_MIN;

    await this.prisma.otpRecord.updateMany({
      where: { userId, purpose, consumed: false },
      data: { consumed: true },
    });

    await this.prisma.otpRecord.create({
      data: {
        userId,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + expiryMin * 60 * 1000),
      },
    });

    this.logger.debug(
      `OTP generated for user ${userId} (${purpose}), expires in ${expiryMin}m`,
    );

    return otp;
  }

  async verify(
    userId: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<boolean> {
    const record = await this.prisma.otpRecord.findFirst({
      where: { userId, purpose, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new BadRequestException(
        "No active OTP found. Please request a new one.",
      );
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.otpRecord.update({
        where: { id: record.id },
        data: { consumed: true },
      });
      throw new BadRequestException(
        "OTP has expired. Please request a new one.",
      );
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      await this.prisma.otpRecord.update({
        where: { id: record.id },
        data: { consumed: true },
      });
      throw new BadRequestException(
        "Too many attempts. Please request a new OTP.",
      );
    }

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = await argon2.verify(record.codeHash, code);

    if (!isValid) {
      throw new BadRequestException("Invalid OTP code.");
    }

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    return true;
  }
}
