import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM   = process.env.EMAIL_FROM ?? "Genesis CMS <noreply@yourdomain.com>";

export interface SendEmailOpts {
  to:      string;
  subject: string;
  html:    string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<boolean> {
  if (!resend) {
    logger.warn({ to: opts.to, subject: opts.subject }, "Email not sent — RESEND_API_KEY not set");
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, ...opts });
    if (error) { logger.error({ error }, "Resend error"); return false; }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}

export function workspaceInviteHtml(workspaceName: string, role: string, loginUrl: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <div style="font-size:24px;font-weight:800;margin-bottom:8px">Genesis CMS</div>
      <h2 style="margin:0 0 16px">You've been invited</h2>
      <p style="color:#374151;line-height:1.6">
        You've been invited to join the <strong>${workspaceName}</strong> workspace as <strong>${role}</strong>.
      </p>
      <a href="${loginUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#0ea5e9;color:#fff;border-radius:8px;font-weight:600;text-decoration:none">
        Accept Invitation
      </a>
      <p style="margin-top:32px;font-size:12px;color:#9ca3af">
        If you weren't expecting this invite, you can ignore this email.
      </p>
    </div>
  `;
}
