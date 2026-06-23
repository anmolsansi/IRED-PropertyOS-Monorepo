export interface EmailTemplateData {
  [key: string]: string | number | undefined;
}

const BASE_STYLE = `
  margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif;
`;

const CONTAINER_STYLE = `
  background-color: #f4f5f7; padding: 40px 0;
`;

const CARD_STYLE = `
  background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;

const HEADER_STYLE = `
  background-color: #1a56db; padding: 24px 32px;
`;

const BODY_STYLE = `
  padding: 32px;
`;

const FOOTER_STYLE = `
  background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;
`;

function wrap(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${BASE_STYLE}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${CONTAINER_STYLE}">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="${CARD_STYLE}">
        <tr><td style="${HEADER_STYLE}">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">IRED PropertyOS</h1>
        </td></tr>
        <tr><td style="${BODY_STYLE}">${content}</td></tr>
        <tr><td style="${FOOTER_STYLE}">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
            IRED PropertyOS — Commercial Real Estate Operations Platform
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderOtpEmail(otp: string, purpose: string): string {
  const headings: Record<string, string> = {
    EMAIL_VERIFICATION: "Verify Your Email",
    PASSWORD_RESET: "Reset Your Password",
    MOBILE_RECOVERY: "Recover Your Account",
  };
  const messages: Record<string, string> = {
    EMAIL_VERIFICATION: "Use the following code to verify your email address:",
    PASSWORD_RESET: "Use the following code to reset your password:",
    MOBILE_RECOVERY: "Use the following code to verify your mobile number:",
  };
  return wrap(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">${headings[purpose] || "Verification Code"}</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">${messages[purpose] || "Your verification code:"}</p>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2937;">${otp}</span>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">This code expires in <strong>10 minutes</strong>.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">If you did not request this, please ignore this email.</p>
  `);
}

export function renderChangeRequestEmail(data: EmailTemplateData): string {
  return wrap(`
    <h2 style="margin:0 0 16px;color:#1a56db;font-size:18px;">New Change Request</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      <strong>${data.requesterName}</strong> has submitted a change request for <strong>${data.entityType}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">Please review and approve or reject the changes.</p>
    <a href="${data.appUrl || "http://localhost:3000"}/change-requests/${data.changeRequestId}"
       style="display:inline-block;padding:10px 20px;background:#1a56db;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">
      Review Request
    </a>
  `);
}

export function renderApprovalResultEmail(data: EmailTemplateData): string {
  const isApproved = data.status === "approved";
  const color = isApproved ? "#059669" : "#dc2626";
  const label = isApproved ? "Approved" : "Rejected";
  return wrap(`
    <h2 style="margin:0 0 16px;color:${color};font-size:18px;">Change Request ${label}</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      Your change request has been <strong>${label.toLowerCase()}</strong> by ${data.adminName}.
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Change Request ID: ${data.changeRequestId}</p>
  `);
}

export function renderTaskAssignmentEmail(data: EmailTemplateData): string {
  return wrap(`
    <h2 style="margin:0 0 16px;color:#1a56db;font-size:18px;">New Task Assigned</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      You have been assigned a new task: <strong>${data.taskTitle}</strong>
    </p>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Assigned by: ${data.assignerName}</p>
    ${data.dueDate ? `<p style="margin:0;color:#6b7280;font-size:13px;">Due: ${data.dueDate}</p>` : ""}
  `);
}

export function renderSiteVisitReminderEmail(data: EmailTemplateData): string {
  return wrap(`
    <h2 style="margin:0 0 16px;color:#1a56db;font-size:18px;">Site Visit Reminder</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">You have a site visit scheduled:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Client</td>
          <td style="padding:8px 0;color:#1f2937;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">${data.clientName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Building</td>
          <td style="padding:8px 0;color:#1f2937;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">${data.buildingName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Time</td>
          <td style="padding:8px 0;color:#1f2937;font-size:13px;text-align:right;">${data.scheduledAt}</td></tr>
    </table>
  `);
}

export function renderWelcomeEmail(data: EmailTemplateData): string {
  return wrap(`
    <h2 style="margin:0 0 16px;color:#1a56db;font-size:18px;">Welcome to IRED PropertyOS</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      Hi ${data.fullName || "there"}, your account has been created successfully.
    </p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">
      You can now log in to access the Commercial Real Estate Operations Platform.
    </p>
    <a href="${data.appUrl || "http://localhost:3000"}/login"
       style="display:inline-block;padding:10px 20px;background:#1a56db;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">
      Log In
    </a>
  `);
}

export function renderPasswordResetEmail(data: EmailTemplateData): string {
  return wrap(`
    <h2 style="margin:0 0 16px;color:#dc2626;font-size:18px;">Password Reset Request</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Use the code below:
    </p>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2937;">${data.otp}</span>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">This code expires in <strong>10 minutes</strong>.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">If you did not request this, please ignore this email.</p>
  `);
}
