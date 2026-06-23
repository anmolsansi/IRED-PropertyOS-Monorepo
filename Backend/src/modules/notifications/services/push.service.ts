import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly provider: string;
  private readonly fcmServerKey: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>("app.push.provider") || "console";
    this.fcmServerKey = this.config.get<string>("app.push.fcmServerKey") || "";
  }

  async send(
    message: PushMessage,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (this.provider === "console") {
      this.logger.log(`[PUSH:${message.to}] ${message.title}: ${message.body}`);
      return { success: true, messageId: `console-${Date.now()}` };
    }

    if (this.provider === "fcm") {
      return this.sendFcm(message);
    }

    this.logger.warn(
      `Unknown push provider: ${this.provider}, falling back to console`,
    );
    this.logger.log(`[PUSH:${message.to}] ${message.title}: ${message.body}`);
    return { success: true, messageId: `console-${Date.now()}` };
  }

  private async sendFcm(
    message: PushMessage,
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${this.fcmServerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: message.to,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: message.data || {},
        }),
      });

      const result = (await response.json()) as {
        success?: number;
        message_id?: string;
        results?: Array<{ message_id?: string; error?: string }>;
      };

      if (result.success !== 1) {
        const error = result.results?.[0]?.error || "Unknown FCM error";
        this.logger.error(`FCM push failed: ${error}`);
        return { success: false };
      }

      const messageId = result.message_id || result.results?.[0]?.message_id;
      this.logger.log(`FCM push sent to ${message.to}: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`FCM push error: ${(error as Error).message}`);
      return { success: false };
    }
  }
}
