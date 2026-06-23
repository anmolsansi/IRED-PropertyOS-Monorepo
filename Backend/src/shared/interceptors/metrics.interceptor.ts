import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MonitoringService } from "../../modules/monitoring/monitoring.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private monitoring: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const isError = context.switchToHttp().getResponse().statusCode >= 400;
        this.monitoring.recordRequest(duration, isError);
      }),
    );
  }
}
