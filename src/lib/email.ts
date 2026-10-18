import nodemailer, { type Transporter } from "nodemailer";
import { env, emailConfigured } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { STATUS_META, type ApplicationStatus } from "@/lib/constants";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!emailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  });
  return transporter;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Mail = { to: string; subject: string; text: string; html: string };

async function deliver(mail: Mail, debugLink?: string): Promise<{ sent: boolean }> {
  const smtp = getTransporter();
  if (!smtp) {
    // Never print one-time credentials by default: server logs are often
    // accessible to more people than the mailbox they belong to. The explicit
    // DEV_EMAIL_TOKENS flag exists only for local development, never in
    // production.
    const debugAllowed =
      !env.isProduction && process.env.DEV_EMAIL_TOKENS === "true";
    console.warn(
      "[top-cloud] SMTP is not configured — email was not sent." +
        (debugAllowed && debugLink
          ? `\n[top-cloud] DEV_EMAIL_TOKENS fallback link (local development only): ${debugLink}`
          : " Configure SMTP to enable email delivery."),
    );
    return { sent: false };
  }
  try {
    await smtp.sendMail({
      from: env.smtp.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[top-cloud] email delivery failed", error instanceof Error ? error.message : "unknown");
    return { sent: false };
  }
}

function layout(brandName: string, body: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#05060f;color:#e8ebff;font-family:Inter,Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05060f;padding:36px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b1024;border:1px solid #1e2647;border-radius:24px;overflow:hidden">
        <tr><td style="padding:28px 32px;background:linear-gradient(120deg,#161032,#0b1330)">
          <span style="display:inline-block;width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);vertical-align:middle;margin-right:10px"></span>
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;vertical-align:middle">${esc(brandName)}</span>
        </td></tr>
        <tr><td style="padding:32px">${body}</td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #1e2647;color:#8b95c0;font-size:12px;line-height:1.6">${esc(footer)}<br/>This is an automated message from ${esc(brandName)}.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px">${esc(label)}</a>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  username: string;
  token: string;
}): Promise<{ sent: boolean }> {
  const settings = await getSettings();
  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(params.token)}`;
  const body = `
    <h1 style="font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Confirm your email</h1>
    <p style="color:#aab3d6;font-size:14px;line-height:1.7;margin:0 0 22px">Hi ${esc(params.username)}, welcome to ${esc(settings.brandName)}. Confirm your email address to finish setting up your member account. The link expires in 24 hours.</p>
    <p style="margin:0 0 22px">${button(link, "Verify my email")}</p>
    <p style="color:#7883ad;font-size:12px;line-height:1.6;margin:0">If you didn't create this account, you can safely ignore this email.</p>`;
  return deliver(
    {
      to: params.to,
      subject: `Verify your ${settings.brandName} email`,
      text: `Hi ${params.username}, verify your ${settings.brandName} email: ${link}\n\nThe link expires in 24 hours.`,
      html: layout(settings.brandName, body, settings.footerNote),
    },
    link,
  );
}

export async function sendPasswordResetEmail(params: {
  to: string;
  username: string;
  token: string;
}): Promise<{ sent: boolean }> {
  const settings = await getSettings();
  const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(params.token)}`;
  const body = `
    <h1 style="font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Reset your password</h1>
    <p style="color:#aab3d6;font-size:14px;line-height:1.7;margin:0 0 22px">Hi ${esc(params.username)}, we received a request to reset your ${esc(settings.brandName)} password. This link expires in 60 minutes and can be used once.</p>
    <p style="margin:0 0 22px">${button(link, "Choose a new password")}</p>
    <p style="color:#7883ad;font-size:12px;line-height:1.6;margin:0">If you didn't request this, no action is needed — your current password stays valid.</p>`;
  return deliver(
    {
      to: params.to,
      subject: `Reset your ${settings.brandName} password`,
      text: `Reset your ${settings.brandName} password: ${link}\n\nThis link expires in 60 minutes.`,
      html: layout(settings.brandName, body, settings.footerNote),
    },
    link,
  );
}

export async function sendStatusUpdateEmail(params: {
  to: string;
  username: string;
  reference: string;
  status: ApplicationStatus;
}): Promise<{ sent: boolean }> {
  const settings = await getSettings();
  const meta = STATUS_META[params.status];
  const link = `${env.appUrl}/my-applications`;
  const body = `
    <h1 style="font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Application update</h1>
    <p style="color:#aab3d6;font-size:14px;line-height:1.7;margin:0 0 18px">Hi ${esc(params.username)}, the status of your ${esc(settings.brandName)} staff application <strong style="color:#e8ebff">${esc(params.reference)}</strong> has changed.</p>
    <p style="margin:0 0 22px"><span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#151d3b;border:1px solid #2a355e;color:#dbe3ff;font-size:13px;font-weight:600">${esc(meta.label)}</span></p>
    <p style="color:#aab3d6;font-size:14px;line-height:1.7;margin:0 0 22px">Open your dashboard to see the latest details and any feedback a reviewer has shared.</p>
    <p style="margin:0">${button(link, "Open my dashboard")}</p>`;
  return deliver({
    to: params.to,
    subject: `${settings.brandName} application ${params.reference}: ${meta.label}`,
    text: `Your ${settings.brandName} application ${params.reference} is now: ${meta.label}. Open ${link}`,
    html: layout(settings.brandName, body, settings.footerNote),
  });
}
