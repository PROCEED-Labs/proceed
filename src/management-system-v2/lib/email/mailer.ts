import 'server-only';
import nodemailer from 'nodemailer';
import { env } from '../env-vars';

let transport: nodemailer.Transporter;
if (env.NODE_ENV === 'production')
  transport = nodemailer.createTransport({
    host: env.SMTP_MAIL_HOST,
    secure: true,
    port: env.SMTP_MAIL_PORT,
    auth: {
      user: env.SMTP_MAIL_USER,
      pass: env.SMTP_MAIL_PASSWORD,
    },
  });

export function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (env.NODE_ENV === 'development') {
    console.log(`Email sent to ${to} with subject: ${subject} and text: ${text}`);
    return;
  }

  if (!env.PROCEED_PUBLIC_MAILSERVER_ACTIVE)
    throw new Error('Email sending is not enabled, set IAM_SIGNIN_MAIL_ACTIVE to true');

  return transport.sendMail({
    from: env.SMTP_MAIL_USER,
    to,
    subject,
    html,
    text,
  });
}
