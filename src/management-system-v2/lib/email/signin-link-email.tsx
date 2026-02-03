import 'server-only';

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import { env } from '../ms-config/env-vars';

const baseUrl = env.NEXTAUTH_URL;

type MailProps = {
  signInLink: string;
  expires: Date;
  linkText?: string;
  headerText?: string;
  description?: string;
  footerText?: string;
};

function SigninUrlMail(mailProps: MailProps) {
  const expiresIn = mailProps.expires.getTime() - Date.now();
  const linkDuration: number = Math.ceil(expiresIn / 1000 / 60 / 60);

  return (
    <Html>
      <Head />
      <Preview>Access your PROCEED account - secure authentication link inside</Preview>
      <Body
        style={{
          backgroundColor: '#fff',
          color: '#212121',
          textAlign: 'center',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <Container
          style={{
            padding: '20px',
            margin: '0 auto',
            backgroundColor: '#f8f9fa',
            maxWidth: '600px',
          }}
        >
          <Section
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Section
              style={{
                backgroundColor: '#252f3d',
                padding: '24px 20px',
                textAlign: 'center',
                borderRadius: '8px 8px 0 0',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  margin: 0,
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '24px',
                  letterSpacing: '0.5px',
                }}
              >
                PROCEED
              </Text>
            </Section>

            <Section style={{ padding: '32px 40px' }}>
              <Heading
                style={{
                  color: '#1a1a1a',
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  lineHeight: '1.3',
                }}
              >
                {mailProps.headerText ?? 'Access your PROCEED account'}
              </Heading>

              <Text style={{ ...text, marginBottom: '24px' }}>
                {mailProps.description ??
                  `You requested secure access to PROCEED. Click the button below to authenticate and access your account. If this is your first time, a new account will be created for you.`}
              </Text>

              <Section style={{ textAlign: 'center', margin: '32px 0' }}>
                <Link
                  href={mailProps.signInLink}
                  style={{
                    backgroundColor: '#2754C5',
                    color: '#ffffff',
                    padding: '14px 28px',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '16px',
                    display: 'inline-block',
                    lineHeight: '1.5',
                  }}
                >
                  {mailProps.linkText ?? 'Access PROCEED'}
                </Link>
              </Section>

              <Text
                style={{
                  ...text,
                  fontSize: '13px',
                  color: '#666666',
                  textAlign: 'center',
                  margin: '16px 0 0 0',
                }}
              >
                This secure link expires in {linkDuration} hour{linkDuration !== 1 ? 's' : ''}
              </Text>

              <Section
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '6px',
                  marginTop: '24px',
                }}
              >
                <Text
                  style={{
                    ...text,
                    fontSize: '13px',
                    color: '#666666',
                    margin: 0,
                  }}
                >
                  <strong>Can't click the button?</strong> Copy and paste this link into your
                  browser:
                </Text>
                <Text
                  style={{
                    ...text,
                    fontSize: '12px',
                    color: '#2754C5',
                    wordBreak: 'break-all',
                    margin: '8px 0 0 0',
                  }}
                >
                  {mailProps.signInLink}
                </Text>
              </Section>
            </Section>

            <Hr style={{ margin: 0, borderColor: '#e5e5e5' }} />

            <Section style={{ padding: '24px 40px' }}>
              <Text style={{ ...text, fontSize: '13px', color: '#666666', margin: 0 }}>
                {mailProps.footerText ??
                  `Didn't request this access link? You can safely ignore this email. Your account security is maintained through email-based authentication only.`}
              </Text>
            </Section>
          </Section>

          <Section style={{ textAlign: 'center', padding: '16px 0' }}>
            <Text
              style={{
                fontSize: '12px',
                color: '#999999',
                margin: 0,
              }}
            >
              <Link href={baseUrl} style={{ ...link, color: '#666666' }}>
                PROCEED Platform
              </Link>
              {' • '}
              <Link href={`${baseUrl}/privacy-policy`} style={{ ...link, color: '#666666' }}>
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const link = {
  color: '#2754C5',
  fontSize: '12px',
  textDecoration: 'underline',
};

const text = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '16px 0',
};

export default function renderSigninLinkEmail(mailProps: MailProps) {
  const email = <SigninUrlMail {...mailProps} />;
  return { html: render(email), text: render(email, { plainText: true }) };
}
