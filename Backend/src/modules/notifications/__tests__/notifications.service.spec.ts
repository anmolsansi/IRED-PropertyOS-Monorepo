import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "../notifications.service";
import { getQueueToken } from "@nestjs/bullmq";
import { NotificationsGateway } from "../gateway/notifications.gateway";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let emailQueue: any;
  let smsQueue: any;
  let gateway: any;

  beforeEach(async () => {
    emailQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-1" }),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getFailed: jest.fn().mockResolvedValue([]),
    };
    smsQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-2" }),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getFailed: jest.fn().mockResolvedValue([]),
    };
    gateway = {
      sendToUser: jest.fn(),
      broadcastToAdmins: jest.fn(),
      broadcast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getQueueToken("email"), useValue: emailQueue },
        { provide: getQueueToken("sms"), useValue: smsQueue },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendEmail", () => {
    it("should add email to queue", async () => {
      await service.sendEmail({
        to: "test@example.com",
        subject: "Test",
        template: "test",
        data: {},
      });
      expect(emailQueue.add).toHaveBeenCalledWith(
        "send-email",
        expect.objectContaining({ to: "test@example.com" }),
        expect.any(Object),
      );
    });
  });

  describe("sendSms", () => {
    it("should add sms to queue", async () => {
      await service.sendSms("+1234567890", "Hello");
      expect(smsQueue.add).toHaveBeenCalledWith(
        "send-sms",
        expect.objectContaining({ to: "+1234567890", message: "Hello" }),
      );
    });
  });

  describe("getQueueStats", () => {
    it("should return queue stats", async () => {
      const result = await service.getQueueStats();
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("sms");
    });
  });

  describe("retryFailed", () => {
    it("should retry failed jobs", async () => {
      const mockJob = { retry: jest.fn() };
      emailQueue.getFailed.mockResolvedValue([mockJob]);
      const result = await service.retryFailed("email");
      expect(result).toEqual({ retried: 1 });
      expect(mockJob.retry).toHaveBeenCalled();
    });
  });
});
