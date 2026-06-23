import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";

export const ORG_ISOLATED_KEY = "org_isolated";

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isOrgIsolated = this.reflector.getAllAndOverride<boolean>(
      ORG_ISOLATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isOrgIsolated) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Admins can see all orgs (platform-level access)
    if (user.role === "ADMIN") return true;

    // Workers must have an organization
    if (!user.organizationId) return false;

    // Attach orgId to request for use in services
    request.orgId = user.organizationId;
    return true;
  }
}
