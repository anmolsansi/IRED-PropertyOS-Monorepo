import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { requestContextService } from "../services/request-context.service";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req["requestId"] = requestId;
    req.headers["x-request-id"] = requestId;
    requestContextService.run({ requestId }, () => next());
  }
}
