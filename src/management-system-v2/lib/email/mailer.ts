import 'server-only';
import nodemailer from 'nodemailer';
import { getMSConfig } from '../ms-config/ms-config';

let transport: nodemailer.Transporter;

export async function sendEmail({
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
  const msConfig = await getMSConfig();

  if (msConfig.NODE_ENV === 'development') {
    console.log(`Email sent to ${to} with subject: ${subject} and text: ${text}`);
    return;
  }

  if (msConfig.NODE_ENV === 'production' && !transport)
    transport = nodemailer.createTransport({
      host: msConfig.SMTP_MAIL_HOST,
      secure: true,
      port: msConfig.SMTP_MAIL_PORT,
      auth: {
        user: msConfig.SMTP_MAIL_USER,
        pass: msConfig.SMTP_MAIL_PASSWORD,
      },
    });

  if (!msConfig.PROCEED_PUBLIC_MAILSERVER_ACTIVE)
    throw new Error('Email sending is not enabled, set IAM_SIGNIN_MAIL_ACTIVE to true');

  return transport.sendMail({
    from: msConfig.SMTP_MAIL_USER,
    to,
    subject,
    html,
    text,
  });
}
