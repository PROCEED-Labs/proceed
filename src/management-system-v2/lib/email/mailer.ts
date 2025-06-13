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

  if (!msConfig.PROCEED_PUBLIC_MAILSERVER_ACTIVE)
    throw new Error('Email sending is not enabled, set IAM_SIGNIN_MAIL_ACTIVE to true');

  if (msConfig.NODE_ENV === 'development') {
    console.log(`Email sent to ${to} with subject: ${subject} and text: ${text}`);
    return;
  }

  if (msConfig.NODE_ENV === 'production' && !transport)
    transport = nodemailer.createTransport({
      host: msConfig.MAILSERVER_URL,
      secure: true,
      port: msConfig.MAILSERVER_PORT,
      auth: {
        user: msConfig.MAILSERVER_MS_DEFAULT_MAIL_ADDRESS,
        pass: msConfig.MAILSERVER_MS_DEFAULT_MAIL_PASSWORD,
      },
    });

  transport.sendMail({
    from: msConfig.MAILSERVER_MS_DEFAULT_MAIL_ADDRESS,
    to,
    subject,
    html,
    text,
  });
}
