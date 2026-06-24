import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("IRED-PropertyOS"),
  APP_PORT: z.coerce.number().default(4000),
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:4000"),
  APP_FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_LENGTH: z.coerce.number().default(6),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().default("propertyos-media"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_PUBLIC_URL: z.string().url().optional(),

  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(60),

  SMS_PROVIDER: z.enum(["console", "twilio", "textlocal"]).default("console"),
  SMS_API_KEY: z.string().optional(),
  SMS_API_SECRET: z.string().optional(),
  SMS_SENDER_ID: z.string().default("IRED"),

  PUSH_PROVIDER: z.enum(["console", "fcm"]).default("console"),
  PUSH_FCM_SERVER_KEY: z.string().optional(),

  ENCRYPTION_KEY: z.string().optional(),

  LOG_LEVEL: z
    .enum(["error", "warn", "log", "debug", "verbose"])
    .default("log"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
