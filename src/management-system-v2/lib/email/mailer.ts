import 'server-only';
import nodemailer from 'nodemailer';

let transport: nodemailer.Transporter;
if (process.env.NODE_ENV === 'production')
  transport = nodemailer.createTransport({
    host: process.env.SMTP_MAIL_HOST as string,
    secure: true,
    port: Number(process.env.SMTP_MAIL_PORT),
    auth: {
      user: process.env.SMTP_MAIL_USER,
      pass: process.env.SMTP_MAIL_PASSWORD,
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
  if (process.env.NODE_ENV === 'development') {
    console.log(`Email sent to ${to} with subject: ${subject} and text: ${text}`);
    return;
  }

  transport.sendMail({
    from: process.env.SMTP_MAIL_USER,
    to,
    subject,
    html,
    text,
  });
}
