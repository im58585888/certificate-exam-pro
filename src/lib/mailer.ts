import "server-only";
import nodemailer from "nodemailer";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export const mailConfigured = !!process.env.SMTP_URL;

/**
 * Sends through any SMTP provider (Amazon SES, Resend, Postmark, SendGrid…) configured by SMTP_URL,
 * e.g. smtps://USER:PASS@email-smtp.us-east-1.amazonaws.com:465. Without it, mail is logged in development.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!process.env.SMTP_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL is not configured.");
    console.info(`\n[dev mail] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.MAIL_FROM ?? "Certificate Exam Pro <no-reply@example.com>", ...mail });
}
