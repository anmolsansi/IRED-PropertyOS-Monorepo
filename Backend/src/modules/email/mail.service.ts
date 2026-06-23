import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>("app.smtp.host");
    const port = this.config.get<number>("app.smtp.port");
    const user = this.config.get<string>("app.smtp.user");
    const pass = this.config.get<string>("app.smtp.pass");

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: (port || 587) === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log("SMTP transport configured");
    } else {
      this.logger.warn(
        "SMTP not configured — emails will be logged to console. " +
          "Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable.",
      );
    }
  }

  async sendOtp(
    to: string,
    otp: string,
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "MOBILE_RECOVERY",
  ): Promise<void> {
    const subjectMap = {
      EMAIL_VERIFICATION: "Verify your email — IRED PropertyOS",
      PASSWORD_RESET: "Password Reset Code — IRED PropertyOS",
      MOBILE_RECOVERY: "Mobile Recovery Code — IRED PropertyOS",
    };

    const html = this.buildOtpHtml(otp, purpose);

    if (!this.isConfigured || !this.transporter) {
      this.logger.log(`[DEV MODE] OTP for ${to} (${purpose}): ${otp}`);
      return;
    }

    const from =
      this.config.get<string>("app.smtp.from") || "noreply@propertyos.in";

    await this.transporter.sendMail({
      from,
      to,
      subject: subjectMap[purpose],
      html,
    });

    this.logger.log(`OTP email sent to ${to} (${purpose})`);
  }

  async sendMail(options: {
    from?: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.log(`[DEV MODE] Email to ${options.to}: ${options.subject}`);
      return;
    }

    const from =
      options.from ||
      this.config.get<string>("app.smtp.from") ||
      "noreply@propertyos.in";
    await this.transporter.sendMail({ ...options, from });
    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }

  private buildOtpHtml(
    otp: string,
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "MOBILE_RECOVERY",
  ): string {
    const headingMap = {
      EMAIL_VERIFICATION: "Verify Your Email",
      PASSWORD_RESET: "Reset Your Password",
      MOBILE_RECOVERY: "Recover Your Account",
    };

    const messageMap = {
      EMAIL_VERIFICATION:
        "Use the following code to verify your email address:",
      PASSWORD_RESET: "Use the following code to reset your password:",
      MOBILE_RECOVERY: "Use the following code to verify your mobile number:",
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a56db;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">
                IRED PropertyOS
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">
                ${headingMap[purpose]}
              </h2>
              <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">
                ${messageMap[purpose]}
              </p>
              <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2937;">
                  ${otp}
                </span>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                IRED PropertyOS — Commercial Real Estate Operations Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
