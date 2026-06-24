import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { Role } from "../decorators/roles.decorator";

export const GEOGRAPHY_SCOPE_KEY = "geography_scope";

@Injectable()
export class GeographyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresGeoCheck = this.reflector.getAllAndOverride<boolean>(
      GEOGRAPHY_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresGeoCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const assignments = await this.prisma.workerGeographicAssignment.findMany({
      where: {
        userId: user.id,
        active: true,
      },
    });

    const geographicScope = {
      denyAll: assignments.length === 0,
      stateIds: assignments
        .filter((a) => a.assignmentType === "state")
        .map((a) => a.stateId)
        .filter(Boolean),
      cityIds: assignments
        .filter((a) => a.assignmentType === "city")
        .map((a) => a.cityId)
        .filter(Boolean),
      localityIds: assignments
        .filter((a) => a.assignmentType === "locality")
        .map((a) => a.localityId)
        .filter(Boolean),
    };

    request.user = request.user || {};
    request.user.geographicScope = geographicScope;

    return true;
  }
}
