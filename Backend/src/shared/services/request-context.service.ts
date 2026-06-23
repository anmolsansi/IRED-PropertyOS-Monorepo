import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId?: string;
  userId?: string;
  ip?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getContext(): RequestContext {
    return this.storage.getStore() || {};
  }

  getRequestId(): string | undefined {
    return this.getContext().requestId;
  }

  setRequestId(requestId: string): void {
    const ctx = this.getContext();
    ctx.requestId = requestId;
  }
}

export const requestContextService = new RequestContextService();
