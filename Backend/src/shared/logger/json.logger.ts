import { LoggerService, Logger } from "@nestjs/common";
import { requestContextService } from "../services/request-context.service";

export function createLoggerFactory(env: string): () => LoggerService {
  return () => {
    if (env === "production") {
      return new JsonLogger();
    }
    return new Logger();
  };
}

class JsonLogger implements LoggerService {
  private formatMessage(level: string, message: string, context?: string) {
    const requestId = requestContextService.getRequestId();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || undefined,
      requestId: requestId || undefined,
    });
  }

  log(message: string, context?: string) {
    console.log(this.formatMessage("info", message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(
      this.formatMessage("error", message, context),
      trace ? { trace } : undefined,
    );
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage("warn", message, context));
  }

  debug(message: string, context?: string) {
    console.debug(this.formatMessage("debug", message, context));
  }

  verbose(message: string, context?: string) {
    console.log(this.formatMessage("verbose", message, context));
  }
}
