import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { NotificationsGateway } from "./gateway/notifications.gateway";

export interface NotificationPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: "low" | "normal" | "high";
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue("email") private emailQueue: Queue,
    @InjectQueue("sms") private smsQueue: Queue,
    private gateway: NotificationsGateway,
  ) {}

  async sendEmail(payload: NotificationPayload): Promise<void> {
    const job = await this.emailQueue.add("send-email", payload, {
      priority:
        payload.priority === "high" ? 1 : payload.priority === "low" ? 3 : 2,
    });
    this.logger.log(`Email job queued: ${job.id} to ${payload.to}`);
  }

  async sendSms(to: string, message: string): Promise<void> {
    const job = await this.smsQueue.add("send-sms", { to, message });
    this.logger.log(`SMS job queued: ${job.id} to ${to}`);
  }

  notifyUser(userId: string, event: string, data: Record<string, any>) {
    this.gateway.sendToUser(userId, event, data);
  }

  notifyAdmins(event: string, data: Record<string, any>) {
    this.gateway.broadcastToAdmins(event, data);
  }

  broadcast(event: string, data: Record<string, any>) {
    this.gateway.broadcast(event, data);
  }

  async sendChangeRequestNotification(params: {
    to: string;
    requesterName: string;
    entityType: string;
    entityId: string;
    changeRequestId: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `New Change Request — ${params.entityType}`,
      template: "change-request",
      data: params,
      priority: "normal",
    });

    this.notifyAdmins("change-request", {
      message: `New change request for ${params.entityType}`,
      changeRequestId: params.changeRequestId,
      requesterName: params.requesterName,
    });
  }

  async sendApprovalNotification(params: {
    to: string;
    changeRequestId: string;
    status: "approved" | "rejected" | "partially_approved";
    adminName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Change Request ${params.status} — IRED PropertyOS`,
      template: "approval-result",
      data: params,
      priority: "normal",
    });

    this.notifyUser(params.to, "approval-result", {
      message: `Your change request has been ${params.status}`,
      changeRequestId: params.changeRequestId,
      status: params.status,
    });
  }

  async sendTaskAssignment(params: {
    to: string;
    taskTitle: string;
    assignerName: string;
    dueDate?: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `New Task Assigned — ${params.taskTitle}`,
      template: "task-assignment",
      data: params,
      priority: "high",
    });

    this.notifyUser(params.to, "task-assigned", {
      message: `You have been assigned a new task: ${params.taskTitle}`,
      taskTitle: params.taskTitle,
      assignerName: params.assignerName,
      dueDate: params.dueDate,
    });
  }

  async sendSiteVisitReminder(params: {
    to: string;
    clientName: string;
    buildingName: string;
    scheduledAt: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Site Visit Reminder — ${params.buildingName}`,
      template: "site-visit-reminder",
      data: params,
      priority: "high",
    });

    this.notifyUser(params.to, "site-visit-reminder", {
      message: `Reminder: Site visit at ${params.buildingName}`,
      clientName: params.clientName,
      buildingName: params.buildingName,
      scheduledAt: params.scheduledAt,
    });
  }

  async sendWelcomeEmail(params: {
    to: string;
    fullName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Welcome to IRED PropertyOS`,
      template: "welcome",
      data: { ...params, appUrl: "http://localhost:3000" },
      priority: "normal",
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    resetCode: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Password Reset — IRED PropertyOS`,
      template: "password-reset",
      data: params,
      priority: "high",
    });
  }

  async getQueueStats() {
    const [emailWaiting, emailActive, emailCompleted, emailFailed] =
      await Promise.all([
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getActiveCount(),
        this.emailQueue.getCompletedCount(),
        this.emailQueue.getFailedCount(),
      ]);

    const [smsWaiting, smsActive, smsCompleted, smsFailed] = await Promise.all([
      this.smsQueue.getWaitingCount(),
      this.smsQueue.getActiveCount(),
      this.smsQueue.getCompletedCount(),
      this.smsQueue.getFailedCount(),
    ]);

    return {
      email: {
        waiting: emailWaiting,
        active: emailActive,
        completed: emailCompleted,
        failed: emailFailed,
      },
      sms: {
        waiting: smsWaiting,
        active: smsActive,
        completed: smsCompleted,
        failed: smsFailed,
      },
    };
  }

  async retryFailed(queueName: "email" | "sms") {
    const queue = queueName === "email" ? this.emailQueue : this.smsQueue;
    const failed = await queue.getFailed();
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    return { retried };
  }
}
