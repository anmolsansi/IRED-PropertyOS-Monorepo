import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  name: process.env.APP_NAME || "IRED-PropertyOS",
  port: parseInt(process.env.PORT || process.env.APP_PORT || "4000", 10),
  env: process.env.APP_ENV || "development",
  url: process.env.APP_URL || "http://localhost:4000",
  frontendUrl: process.env.APP_FRONTEND_URL || "http://localhost:3000",

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10),
    length: parseInt(process.env.OTP_LENGTH || "6", 10),
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET || "propertyos-media",
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION || "us-east-1",
    publicUrl: process.env.S3_PUBLIC_URL,
  },

  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || "60000", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || "60", 10),
  },

  sms: {
    provider: process.env.SMS_PROVIDER || "console",
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
    senderId: process.env.SMS_SENDER_ID || "IRED",
  },

  push: {
    provider: process.env.PUSH_PROVIDER || "console",
    fcmServerKey: process.env.PUSH_FCM_SERVER_KEY,
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },

  logLevel: process.env.LOG_LEVEL || "log",

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
}));