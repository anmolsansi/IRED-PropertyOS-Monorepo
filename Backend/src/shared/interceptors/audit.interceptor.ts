import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../../prisma/prisma.service";

const ENTITY_MAP: Record<string, string> = {
  buildings: "building",
  floors: "floor",
  units: "unit",
  contacts: "contact",
  clients: "client",
  deals: "deal",
  tasks: "task",
  "site-visits": "site_visit",
  proposals: "proposal",
  "change-requests": "change_request",
  users: "user",
  imports: "import",
  media: "media",
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers, params } = request;
    const user = request.user;
    const userAgent = headers["user-agent"] || "";
    const requestId = request["requestId"] || headers["x-request-id"] || null;

    const entityContext = this.extractEntityContext(url, params);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          if (this.shouldSkipLogging(method, url, statusCode)) return;

          this.logEvent({
            actorUserId: user?.id,
            eventType: `${method} ${url}`,
            entityType: entityContext.entityType,
            entityId: entityContext.entityId,
            metadata: {
              method,
              url,
              duration,
              statusCode,
              requestId,
            },
            ipAddress: ip,
            userAgent,
          }).catch(() => {});
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logEvent({
            actorUserId: user?.id,
            eventType: `${method} ${url}_error`,
            entityType: entityContext.entityType,
            entityId: entityContext.entityId,
            metadata: {
              method,
              url,
              duration,
              error: error.message,
              requestId,
            },
            ipAddress: ip,
            userAgent,
          }).catch(() => {});
        },
      }),
    );
  }

  private extractEntityContext(
    url: string,
    params: Record<string, string>,
  ): { entityType: string; entityId: string | null } {
    const segments = url.split("/").filter(Boolean);

    for (const segment of segments) {
      const mapped = ENTITY_MAP[segment];
      if (mapped) {
        const entityId =
          params?.id || params?.[`${singularize(mapped)}Id`] || null;
        return { entityType: mapped, entityId };
      }
    }

    return { entityType: "system", entityId: null };
  }

  private shouldSkipLogging(
    method: string,
    url: string,
    statusCode: number,
  ): boolean {
    if (url.includes("/health") || url.includes("/docs")) return true;
    if (method === "GET" && statusCode < 400) return true;
    return false;
  }

  private async logEvent(data: {
    actorUserId?: string;
    eventType: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
    ipAddress?: string;
    userAgent: string;
  }) {
    try {
      await this.prisma.auditEvent.create({
        data: {
          actorUserId: data.actorUserId || null,
          eventType: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          metadataJson: data.metadata as unknown as Record<string, string>,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent,
        },
      });
    } catch {
      // Silently fail - audit logging should never break the request
    }
  }
}

function singularize(word: string): string {
  if (word.endsWith("visits")) return "visit";
  if (word.endsWith("quests")) return "quest";
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}
