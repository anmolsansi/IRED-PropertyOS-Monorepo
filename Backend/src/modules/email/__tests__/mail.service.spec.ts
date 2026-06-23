import { Test, TestingModule } from "@nestjs/testing";
import { MailService } from "../mail.service";
import { ConfigService } from "@nestjs/config";

describe("MailService", () => {
  let service: MailService;
  let config: any;

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
    it("should not create transporter when SMTP not configured", () => {
      config.get.mockReturnValue(undefined);
      service.onModuleInit();
      expect((service as any).isConfigured).toBe(false);
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
      expect((service as any).isConfigured).toBe(true);
    });
  });

  describe("sendOtp", () => {
    it("should log OTP in dev mode when SMTP not configured", async () => {
      config.get.mockReturnValue(undefined);
      service.onModuleInit();
      const loggerSpy = jest.spyOn((service as any).logger, "log");
      await service.sendOtp("test@test.com", "123456", "EMAIL_VERIFICATION");
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
