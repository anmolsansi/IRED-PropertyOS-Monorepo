import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { OtpService } from "./otp.service";
import { MailService } from "../email/mail.service";
import { OtpPurpose, User } from "@prisma/client";

const TEST_LOGIN_DISABLED =
  process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Account is not active");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const otp = await this.otpService.generate(user.id, "EMAIL_VERIFICATION");

    await this.mailService.sendOtp(user.email, otp, "EMAIL_VERIFICATION");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`Login OTP sent to ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      requiresOtp: true,
      message: "OTP sent to your email. Please verify to continue.",
      ...(this.config.get<string>("app.env") !== "production"
        ? { devOtp: otp }
        : {}),
    };
  }

  async testLogin(email: string, password: string) {
    if (TEST_LOGIN_DISABLED) {
      throw new UnauthorizedException(
        "Test login is not available in production",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Account is not active");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: user.id,
        eventType: "login_success",
        entityType: "user",
        entityId: user.id,
        metadataJson: { method: "test_login" },
      },
    });

    this.logger.log(`Test login successful for ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async verifyEmailOtp(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Account is not active");
    }

    await this.otpService.verify(userId, "EMAIL_VERIFICATION", otp);

    if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(userId, tokens.refreshToken);

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "login_success",
        entityType: "user",
        entityId: userId,
        metadataJson: { method: "email_otp" },
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async resendEmailOtp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const otp = await this.otpService.generate(userId, "EMAIL_VERIFICATION");

    await this.mailService.sendOtp(user.email, otp, "EMAIL_VERIFICATION");

    return { message: "OTP resent to your email" };
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: string; email: string; jti: string };

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>("app.jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        revoked: false,
      },
    });

    if (!storedToken) {
      this.logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
      await this.revokeAllUserTokens(payload.sub);

      await this.prisma.auditEvent.create({
        data: {
          actorUserId: payload.sub,
          eventType: "token_reuse_detected",
          entityType: "user",
          entityId: payload.sub,
          metadataJson: { reason: "refresh_token_reuse" },
        },
      });

      throw new UnauthorizedException(
        "Refresh token reuse detected. All sessions revoked.",
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("User not found or inactive");
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "logout",
        entityType: "user",
        entityId: userId,
      },
    });

    return { message: "Logged out successfully" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return {
        message: "If an account exists with that email, an OTP has been sent.",
      };
    }

    const otp = await this.otpService.generate(user.id, "PASSWORD_RESET");

    await this.mailService.sendOtp(user.email, otp, "PASSWORD_RESET");

    return {
      message: "If an account exists with that email, an OTP has been sent.",
      userId: user.id,
    };
  }

  async resetPassword(userId: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.otpService.verify(userId, "PASSWORD_RESET", otp);

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.revokeAllUserTokens(userId);

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "password_reset",
        entityType: "user",
        entityId: userId,
      },
    });

    return { message: "Password reset successfully. Please login again." };
  }

  async sendMobileRecoveryOtp(mobileNumber: string) {
    const user = await this.prisma.user.findFirst({
      where: { mobileNumber },
    });

    if (!user) {
      return {
        message:
          "If an account exists with that mobile number, an OTP has been sent.",
      };
    }

    const otp = await this.otpService.generate(user.id, "MOBILE_RECOVERY");

    this.logger.log(`[DEV MODE] Mobile OTP for ${mobileNumber}: ${otp}`);

    return {
      message:
        "If an account exists with that mobile number, an OTP has been sent.",
      userId: user.id,
    };
  }

  async verifyMobileRecoveryOtp(mobileNumber: string, otp: string) {
    const user = await this.prisma.user.findFirst({
      where: { mobileNumber },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.otpService.verify(user.id, "MOBILE_RECOVERY", otp);

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async updateMe(userId: string, data: { fullName?: string; mobileNumber?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.mobileNumber !== undefined && { mobileNumber: data.mobileNumber }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        mobileNumber: true,
        role: true,
        status: true,
      },
    });

    return updated;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        mobileNumber: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        mobileVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        geographicAssignments: {
          where: { active: true },
          include: {
            state: true,
            city: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>("app.jwt.accessSecret"),
        expiresIn: this.config.get<string>("app.jwt.accessExpiry") || "15m",
      } as any),
      this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
        secret: this.config.get<string>("app.jwt.refreshSecret"),
        expiresIn: this.config.get<string>("app.jwt.refreshExpiry") || "7d",
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.config.get<string>("app.jwt.refreshSecret"),
    });

    const tokenHash = await argon2.hash(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        family: payload.jti,
        expiresAt: new Date(payload.exp * 1000),
      },
    });
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
