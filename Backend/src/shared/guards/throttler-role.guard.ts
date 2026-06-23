import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";

interface ThrottleConfig {
  ttl: number;
  limit: number;
}

const ROLE_THROTTLE_KEY = "role_throttle";

const DEFAULT_LIMITS: Record<string, ThrottleConfig> = {
  ADMIN: { ttl: 60000, limit: 120 },
  WORKER: { ttl: 60000, limit: 60 },
  VIEWER: { ttl: 60000, limit: 30 },
};

const EPHEMERAL_LIMITS: Record<string, ThrottleConfig> = {
  login: { ttl: 60000, limit: 5 },
  "verify-email-otp": { ttl: 60000, limit: 5 },
  "forgot-password": { ttl: 60000, limit: 3 },
  "send-mobile-recovery-otp": { ttl: 60000, limit: 3 },
};

// In-memory store (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class ThrottlerRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const handler = context.getHandler();
    const className = context.getClass().name;

    // Determine endpoint key for ephemeral rate limits
    const endpointKey = this.getEndpointKey(request.url, request.method);

    // Check ephemeral limits (stricter for auth endpoints)
    const ephemeralLimit = EPHEMERAL_LIMITS[endpointKey];
    if (ephemeralLimit) {
      const key = `ephemeral:${endpointKey}:${request.ip}`;
      return this.checkLimit(key, ephemeralLimit);
    }

    // Apply role-based limits
    const role = user?.role || "VIEWER";
    const limits = DEFAULT_LIMITS[role] || DEFAULT_LIMITS.VIEWER;

    const key = `role:${role}:${user?.id || request.ip}`;
    return this.checkLimit(key, limits);
  }

  private getEndpointKey(url: string, method: string): string {
    const path = url.split("?")[0];
    const segments = path.split("/").filter(Boolean);
    // e.g., /api/v1/auth/login → auth/login
    const lastTwo = segments.slice(-2).join("/");
    return lastTwo;
  }

  private checkLimit(key: string, config: ThrottleConfig): boolean {
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + config.ttl });
      return true;
    }

    entry.count++;

    if (entry.count > config.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: 429,
          message: "Too many requests",
          retryAfter,
        },
        429,
      );
    }

    return true;
  }
}
