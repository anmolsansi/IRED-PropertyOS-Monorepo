import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SmsMessage {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly senderId: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>("app.sms.provider") || "console";
    this.apiKey = this.config.get<string>("app.sms.apiKey") || "";
    this.apiSecret = this.config.get<string>("app.sms.apiSecret") || "";
    this.senderId = this.config.get<string>("app.sms.senderId") || "IRED";
  }

  async send(
    message: SmsMessage,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (this.provider === "console") {
      this.logger.log(`[SMS:${message.to}] ${message.message}`);
      return { success: true, messageId: `console-${Date.now()}` };
    }

    if (this.provider === "twilio") {
      return this.sendTwilio(message);
    }

    if (this.provider === "textlocal") {
      return this.sendTextlocal(message);
    }

    this.logger.warn(
      `Unknown SMS provider: ${this.provider}, falling back to console`,
    );
    this.logger.log(`[SMS:${message.to}] ${message.message}`);
    return { success: true, messageId: `console-${Date.now()}` };
  }

  private async sendTwilio(
    message: SmsMessage,
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const accountSid = this.apiKey;
      const authToken = this.apiSecret;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const body = new URLSearchParams({
        To: message.to,
        From: this.senderId,
        Body: message.message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const result = (await response.json()) as {
        sid?: string;
        error_code?: string;
        error_message?: string;
      };

      if (!response.ok) {
        this.logger.error(
          `Twilio SMS failed: ${result.error_message || result.error_code}`,
        );
        return { success: false };
      }

      this.logger.log(`Twilio SMS sent to ${message.to}: ${result.sid}`);
      return { success: true, messageId: result.sid };
    } catch (error) {
      this.logger.error(`Twilio SMS error: ${(error as Error).message}`);
      return { success: false };
    }
  }

  private async sendTextlocal(
    message: SmsMessage,
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await fetch("https://api.textlocal.in/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apiKey: this.apiKey,
          sender: this.senderId,
          numbers: message.to,
          message: message.message,
        }).toString(),
      });

      const result = (await response.json()) as {
        status?: string;
        message?: { id?: string };
      };

      if (result.status !== "success") {
        this.logger.error(`Textlocal SMS failed: ${JSON.stringify(result)}`);
        return { success: false };
      }

      this.logger.log(
        `Textlocal SMS sent to ${message.to}: ${result.message?.id}`,
      );
      return { success: true, messageId: result.message?.id };
    } catch (error) {
      this.logger.error(`Textlocal SMS error: ${(error as Error).message}`);
      return { success: false };
    }
  }
}
