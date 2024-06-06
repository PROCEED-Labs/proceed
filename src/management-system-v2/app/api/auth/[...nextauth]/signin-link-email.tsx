import 'server-only';

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import * as React from 'react';

const baseUrl = process.env.NEXTAUTH_URL ?? '';

function SigninUrlMail({ signInLink, expires }: { signInLink: string; expires: Date }) {
  const expiresIn = expires.getTime() - Date.now();
  const linkDuration: number = Math.floor(expiresIn / 1000 / 60 / 60);
  return (
    <Html>
      <Head />
      <Preview>PROCEED magic link</Preview>
      <Body
        style={{
          backgroundColor: '#fff',
          color: '#212121',
        }}
      >
        <Container
          style={{
            padding: '20px',
            margin: '0 auto',
            backgroundColor: '#eee',
          }}
        >
          <Section style={{ backgroundColor: '#fff' }}>
            <Section
              style={{
                backgroundColor: '#252f3d',
                display: 'flex',
                padding: '20px 0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Img src={`${baseUrl}/proceed.svg`} width="75" height="45" alt="PROCEED's Logo" />
            </Section>
            <Section style={{ padding: '25px 35px' }}>
              <Heading
                style={{
                  color: '#333',
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                }}
              >
                Sign in to PROCEED
              </Heading>
              <Text style={{ ...text, marginBottom: '14px' }}>
                Hi, with this mail you can sign in to your PROCEED account. If you don&apos;t have
                an account yet, a new one will be created for you. Just click on the following link:
              </Text>
              <Section
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    ...text,
                    margin: 0,
                    fontWeight: 'bold',
                    textAlign: 'center' as const,
                  }}
                >
                  Sign in Link
                </Text>

                <Link
                  href={signInLink}
                  target="_blank"
                  style={{
                    ...link,
                    margin: '10px 0',
                    width: '100%',
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    Signin to PROCEED
                  </Text>
                </Link>

                <Text
                  style={{
                    ...text,
                    margin: '0px',
                    textAlign: 'center' as const,
                  }}
                >
                  (This link is valid for {linkDuration} hours)
                </Text>
              </Section>
            </Section>
            <Hr />
            <Section style={{ padding: '25px 35px' }}>
              <Text style={{ ...text, margin: '0px' }}>
                If you have not initiated the sign in, you can simply ignore this mail. Your account
                is still secure as you can only sign in by email. The PROCEED Crew
              </Text>
            </Section>
          </Section>
          <Text
            style={{
              ...text,
              fontSize: '12px',
              padding: '0 20px',
              textAlign: 'center' as const,
            }}
          >
            <Link href={baseUrl} target="_blank" style={link}>
              PROCEED
            </Link>
            {' | '}
            <Link href={`${baseUrl}/privacy-policy`} target="_blank" style={link}>
              privacy policy
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const link = {
  color: '#2754C5',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  textDecoration: 'underline',
};

const text = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
};

export default function renderSigninLinkEmail(signInLink: string, expires: Date) {
  const email = <SigninUrlMail signInLink={signInLink} expires={expires} />;

  return { html: render(email), text: render(email, { plainText: true }) };
}
