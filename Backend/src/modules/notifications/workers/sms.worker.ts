import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { SmsService } from "../services/sms.service";

@Processor("sms")
export class SmsWorker extends WorkerHost {
  private readonly logger = new Logger(SmsWorker.name);

  constructor(private readonly smsService: SmsService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { to, message } = job.data;

    this.logger.log(`Processing SMS job ${job.id}: ${to}`);

    try {
      const result = await this.smsService.send({ to, message });

      if (!result.success) {
        throw new Error(`SMS delivery failed to ${to}`);
      }

      this.logger.log(`SMS sent: ${job.id} to ${to} (${result.messageId})`);
      return { success: true, to, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`SMS failed: ${job.id} - ${(error as Error).message}`);
      throw error;
    }
  }
}
