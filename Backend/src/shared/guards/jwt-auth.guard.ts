import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { UserRole, UserStatus } from "@prisma/client";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_MASTER_ADMIN_EMAIL = "anmolsansi@gmail.com";

function getMasterAdminEmail() {
  return (
    process.env.MASTER_ADMIN_EMAIL || DEFAULT_MASTER_ADMIN_EMAIL
  ).toLowerCase();
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (process.env.AUTH_PROVIDER === "clerk") {
      return this.canActivateWithClerk(context);
    }

    return super.canActivate(context);
  }

  private async canActivateWithClerk(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const requestPath = request.originalUrl || request.url || "unknown";
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      this.logger.warn(`Clerk auth rejected: missing bearer token path=${requestPath}`);
      throw new UnauthorizedException("Missing Clerk session token");
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      this.logger.error("Clerk auth rejected: CLERK_SECRET_KEY is not configured");
      throw new UnauthorizedException("Clerk is not configured");
    }

    const authorizedParties = (
      process.env.CLERK_AUTHORIZED_PARTIES ||
      process.env.APP_FRONTEND_URL ||
      ""
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    let verifiedToken: { sub: string };

    try {
      verifiedToken = (await verifyToken(token, {
        secretKey,
        authorizedParties:
          authorizedParties.length > 0 ? authorizedParties : undefined,
      })) as { sub: string };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      this.logger.warn(
        `Clerk auth rejected: invalid session token path=${requestPath} authorizedParties=${authorizedParties.join("|") || "none"} error=${message}`,
      );
      throw new UnauthorizedException("Invalid Clerk session token");
    }

    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(verifiedToken.sub).catch((error) => {
      const message = error instanceof Error ? error.message : "unknown";
      this.logger.warn(
        `Clerk auth rejected: unable to load Clerk user path=${requestPath} clerkUserId=${verifiedToken.sub} error=${message}`,
      );
      throw new UnauthorizedException("Unable to load Clerk user");
    });
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      this.logger.warn(
        `Clerk auth rejected: Clerk user has no email path=${requestPath} clerkUserId=${verifiedToken.sub}`,
      );
      throw new UnauthorizedException("Clerk user has no email address");
    }

    const normalizedEmail = primaryEmail.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        organizationId: true,
      },
    });

    if (!user) {
      if (normalizedEmail === getMasterAdminEmail()) {
        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            fullName: clerkUser.fullName || "Master Admin",
            passwordHash: "clerk-managed",
            role: UserRole.ADMIN,
            status: UserStatus.active,
            emailVerifiedAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            organizationId: true,
          },
        });
        this.logger.warn(
          `Clerk auth auto-provisioned master admin path=${requestPath} email=${normalizedEmail} userId=${user.id}`,
        );
      } else {
        this.logger.warn(
          `Clerk auth rejected: no matching PropertyOS user path=${requestPath} email=${normalizedEmail}`,
        );
        throw new UnauthorizedException(
          "No active PropertyOS user exists for this Clerk account",
        );
      }
    }

    if (
      user.status !== UserStatus.active &&
      normalizedEmail === getMasterAdminEmail()
    ) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.ADMIN,
          status: UserStatus.active,
          deactivatedAt: null,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          organizationId: true,
        },
      });
      this.logger.warn(
        `Clerk auth reactivated master admin path=${requestPath} email=${normalizedEmail} userId=${user.id}`,
      );
    }

    if (user.status !== UserStatus.active) {
      this.logger.warn(
        `Clerk auth rejected: inactive PropertyOS user path=${requestPath} email=${normalizedEmail} status=${user.status}`,
      );
      throw new UnauthorizedException("PropertyOS user is inactive");
    }

    request.user = user;
    this.logger.debug(
      `Clerk auth accepted path=${requestPath} userId=${user.id} email=${user.email} role=${user.role}`,
    );
    return true;
  }
}
