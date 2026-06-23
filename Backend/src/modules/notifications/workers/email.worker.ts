import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { MailService } from "../../email/mail.service";
import {
  renderOtpEmail,
  renderChangeRequestEmail,
  renderApprovalResultEmail,
  renderTaskAssignmentEmail,
  renderSiteVisitReminderEmail,
  renderWelcomeEmail,
  renderPasswordResetEmail,
} from "../../../shared/utils/email-templates";

@Processor("email")
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { to, subject, template, data } = job.data;

    this.logger.log(`Processing email job ${job.id}: ${to} (${template})`);

    try {
      const html = this.renderTemplate(template, data);
      await this.mailService.sendMail({ to, subject, html });
      this.logger.log(`Email sent: ${job.id} to ${to}`);
      return { success: true, to };
    } catch (error) {
      this.logger.error(
        `Email failed: ${job.id} - ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const renderers: Record<string, (d: Record<string, any>) => string> = {
      otp: (d) => renderOtpEmail(d.otp, d.purpose || "EMAIL_VERIFICATION"),
      "change-request": (d) => renderChangeRequestEmail(d),
      "approval-result": (d) => renderApprovalResultEmail(d),
      "task-assignment": (d) => renderTaskAssignmentEmail(d),
      "site-visit-reminder": (d) => renderSiteVisitReminderEmail(d),
      welcome: (d) => renderWelcomeEmail(d),
      "password-reset": (d) => renderPasswordResetEmail(d),
    };

    const renderer = renderers[template];
    if (!renderer) {
      this.logger.warn(`Unknown template: ${template}`);
      return `<p>Notification: ${JSON.stringify(data)}</p>`;
    }
    return renderer(data);
  }
}
