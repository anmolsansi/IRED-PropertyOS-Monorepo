import { Test, TestingModule } from "@nestjs/testing";
import { MailService } from "../mail.service";
import { ConfigService } from "@nestjs/config";

describe("MailService", () => {
  let service: MailService;
  let config: { get: jest.Mock };

  const inspectService = () =>
    service as unknown as {
      isConfigured: boolean;
      transport: "resend" | "smtp" | "console";
      logger: { log: jest.Mock | ((message: string) => void) };
      getFromAddress: () => string;
    };

  beforeEach(async () => {
    config = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should not configure a delivery transport when email providers are not configured", () => {
      config.get.mockReturnValue(undefined);
      service.onModuleInit();
      expect(inspectService().isConfigured).toBe(false);
      expect(inspectService().transport).toBe("console");
    });

    it("should configure Resend when RESEND_API_KEY is set", () => {
      config.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          "app.resend.apiKey": "re_test_key",
        };
        return values[key];
      });
      service.onModuleInit();
      expect(inspectService().isConfigured).toBe(true);
      expect(inspectService().transport).toBe("resend");
    });

    it("should create transporter when SMTP is configured", () => {
      config.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          "app.smtp.host": "smtp.example.com",
          "app.smtp.port": "587",
          "app.smtp.user": "user@example.com",
          "app.smtp.pass": "password",
        };
        return values[key];
      });
      service.onModuleInit();
      expect(inspectService().isConfigured).toBe(true);
      expect(inspectService().transport).toBe("smtp");
    });
  });

  describe("sendOtp", () => {
    it("should log OTP in dev mode when no email transport is configured", async () => {
      config.get.mockReturnValue(undefined);
      service.onModuleInit();
      const loggerSpy = jest.spyOn(inspectService().logger, "log");
      await service.sendOtp("test@test.com", "123456", "EMAIL_VERIFICATION");
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe("sender address selection", () => {
    it("uses SMTP_FROM for SMTP delivery even when RESEND_FROM_EMAIL is set", () => {
      config.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          "app.resend.from": "IRED PropertyOS <otp@yourdomain.com>",
          "app.smtp.from": "gmail-sender@example.com",
        };
        return values[key];
      });
      inspectService().transport = "smtp";

      expect(inspectService().getFromAddress()).toBe(
        "gmail-sender@example.com",
      );
    });

    it("falls back to SMTP_USER for SMTP delivery when SMTP_FROM is not set", () => {
      config.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          "app.smtp.user": "gmail-user@example.com",
        };
        return values[key];
      });
      inspectService().transport = "smtp";

      expect(inspectService().getFromAddress()).toBe("gmail-user@example.com");
    });

    it("uses RESEND_FROM_EMAIL for Resend delivery", () => {
      config.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          "app.resend.from": "IRED PropertyOS <otp@yourdomain.com>",
          "app.smtp.from": "gmail-sender@example.com",
        };
        return values[key];
      });
      inspectService().transport = "resend";

      expect(inspectService().getFromAddress()).toBe(
        "IRED PropertyOS <otp@yourdomain.com>",
      );
    });
  });
});
