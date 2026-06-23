import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PushService } from "../services/push.service";

@Processor("push")
export class PushWorker extends WorkerHost {
  private readonly logger = new Logger(PushWorker.name);

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { to, title, body, data } = job.data;

    this.logger.log(`Processing push notification job ${job.id}: ${to}`);

    try {
      const result = await this.pushService.send({ to, title, body, data });

      if (!result.success) {
        throw new Error(`Push delivery failed to ${to}`);
      }

      this.logger.log(`Push sent: ${job.id} to ${to} (${result.messageId})`);
      return { success: true, to, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Push failed: ${job.id} - ${(error as Error).message}`);
      throw error;
    }
  }
}
