import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();
    const requestId = request.headers["x-request-id"] || request["requestId"] || "N/A";

    return next.handle().pipe(
      tap({
        next: (val) => {
          const response = ctx.getResponse();
          const statusCode = response.statusCode;
          const delay = Date.now() - now;
          this.logger.log(
            `[${requestId}] ${method} ${url} ${statusCode} - ${delay}ms`
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          const statusCode = error.status || 500;
          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} - ${delay}ms - ${error.message}`
          );
        },
      })
    );
  }
}
