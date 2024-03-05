import 'server-only';

export function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Email sent to ${to} with subject: ${subject} and body: ${body}`);
    return;
  }
}
