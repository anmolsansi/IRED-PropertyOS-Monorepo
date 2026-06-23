import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const VerifyEmailOtpSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const ResendEmailOtpSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
});

export const SendMobileRecoveryOtpSchema = z.object({
  mobileNumber: z.string().min(10, "Invalid mobile number"),
});

export const VerifyMobileRecoveryOtpSchema = z.object({
  mobileNumber: z.string().min(10, "Invalid mobile number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type VerifyEmailOtpDto = z.infer<typeof VerifyEmailOtpSchema>;
export type ResendEmailOtpDto = z.infer<typeof ResendEmailOtpSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type SendMobileRecoveryOtpDto = z.infer<
  typeof SendMobileRecoveryOtpSchema
>;
export type VerifyMobileRecoveryOtpDto = z.infer<
  typeof VerifyMobileRecoveryOtpSchema
>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required").optional(),
  mobileNumber: z.string().min(10, "Invalid mobile number").optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
