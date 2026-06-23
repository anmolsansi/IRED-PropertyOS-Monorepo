import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  LoginSchema,
  VerifyEmailOtpSchema,
  ResendEmailOtpSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SendMobileRecoveryOtpSchema,
  VerifyMobileRecoveryOtpSchema,
  UpdateProfileSchema,
  LoginDto,
  VerifyEmailOtpDto,
  ResendEmailOtpDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMobileRecoveryOtpDto,
  VerifyMobileRecoveryOtpDto,
  UpdateProfileDto,
} from "./dto/auth.schema";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "OTP sent to email",
    schema: {
      example: {
        userId: "uuid",
        email: "user@example.com",
        requiresOtp: true,
        message: "OTP sent to your email. Please verify to continue.",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("test-login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Test login (non-production only)" })
  @ApiResponse({
    status: 200,
    description: "Real tokens issued",
    schema: {
      example: {
        accessToken: "jwt...",
        refreshToken: "jwt...",
        user: {
          id: "uuid",
          email: "user@example.com",
          fullName: "John Doe",
          role: "ADMIN",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials or production" })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async testLogin(@Body() dto: LoginDto) {
    return this.authService.testLogin(dto.email, dto.password);
  }

  @Post("verify-email-otp")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Verify email OTP and get tokens" })
  @ApiResponse({
    status: 200,
    description: "Tokens issued",
    schema: {
      example: {
        accessToken: "jwt...",
        refreshToken: "jwt...",
        user: {
          id: "uuid",
          email: "user@example.com",
          fullName: "John",
          role: "WORKER",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid or expired OTP" })
  @UsePipes(new ZodValidationPipe(VerifyEmailOtpSchema))
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto.userId, dto.otp);
  }

  @Post("resend-email-otp")
  @ApiOperation({ summary: "Resend email OTP" })
  @ApiResponse({
    status: 200,
    description: "OTP resent",
    schema: { example: { message: "OTP resent to your email" } },
  })
  @UsePipes(new ZodValidationPipe(ResendEmailOtpSchema))
  async resendEmailOtp(@Body() dto: ResendEmailOtpDto) {
    return this.authService.resendEmailOtp(dto.userId);
  }

  @Post("refresh-token")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "New access token",
    schema: { example: { accessToken: "jwt...", refreshToken: "jwt..." } },
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Logout and revoke all refresh tokens" })
  @ApiResponse({
    status: 200,
    description: "Logged out",
    schema: { example: { message: "Logged out successfully" } },
  })
  async logout(@CurrentUser("id") userId: string) {
    return this.authService.logout(userId);
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Request password reset OTP" })
  @ApiResponse({
    status: 200,
    description: "Reset OTP sent",
    schema: { example: { message: "Password reset OTP sent to your email" } },
  })
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset password with OTP" })
  @ApiResponse({
    status: 200,
    description: "Password reset",
    schema: { example: { message: "Password reset successfully" } },
  })
  @ApiResponse({ status: 401, description: "Invalid OTP" })
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.userId, dto.otp, dto.newPassword);
  }

  @Post("send-mobile-recovery-otp")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Send OTP to mobile for recovery" })
  @ApiResponse({
    status: 200,
    description: "OTP sent to mobile",
    schema: { example: { message: "OTP sent to your mobile number" } },
  })
  @UsePipes(new ZodValidationPipe(SendMobileRecoveryOtpSchema))
  async sendMobileRecoveryOtp(@Body() dto: SendMobileRecoveryOtpDto) {
    return this.authService.sendMobileRecoveryOtp(dto.mobileNumber);
  }

  @Post("verify-mobile-recovery-otp")
  @ApiOperation({ summary: "Verify mobile recovery OTP" })
  @ApiResponse({
    status: 200,
    description: "Mobile verified",
    schema: { example: { accessToken: "jwt...", refreshToken: "jwt..." } },
  })
  @ApiResponse({ status: 401, description: "Invalid OTP" })
  @UsePipes(new ZodValidationPipe(VerifyMobileRecoveryOtpSchema))
  async verifyMobileRecoveryOtp(@Body() dto: VerifyMobileRecoveryOtpDto) {
    return this.authService.verifyMobileRecoveryOtp(dto.mobileNumber, dto.otp);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Current user",
    schema: {
      example: {
        id: "uuid",
        email: "user@example.com",
        fullName: "John Doe",
        role: "WORKER",
        status: "active",
        organizationId: "uuid",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMe(@CurrentUser("id") userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Update current user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile updated",
    schema: {
      example: {
        id: "uuid",
        email: "user@example.com",
        fullName: "John Doe",
        mobileNumber: "+919876543210",
        role: "WORKER",
        status: "active",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateMe(@CurrentUser("id") userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(userId, dto);
  }
}
