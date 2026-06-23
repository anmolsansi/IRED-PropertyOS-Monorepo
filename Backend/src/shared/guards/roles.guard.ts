import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role, ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.debug(
      `RolesGuard: requiredRoles=${JSON.stringify(requiredRoles)}, user=${JSON.stringify(user ? { id: user.id, role: user.role, email: user.email } : null)}`,
    );

    if (!user) {
      this.logger.debug("RolesGuard: no user found on request");
      return false;
    }

    const allowed = requiredRoles.includes(user.role);
    this.logger.debug(`RolesGuard: user.role=${user.role}, allowed=${allowed}`);
    return allowed;
  }
}
