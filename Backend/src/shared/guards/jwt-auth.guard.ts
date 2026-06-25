import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
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
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      throw new UnauthorizedException("Missing Clerk session token");
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
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
    } catch {
      throw new UnauthorizedException("Invalid Clerk session token");
    }

    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(verifiedToken.sub);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new UnauthorizedException("Clerk user has no email address");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: primaryEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        organizationId: true,
      },
    });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("User is not active in IRED PropertyOS");
    }

    request.user = user;
    return true;
  }
}
