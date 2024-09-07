import 'server-only';

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import * as React from 'react';
import { env } from '@/lib/env-vars';

const baseUrl = env.NEXTAUTH_URL;

function OrganizationInviteEmail({
  acceptInviteLink,
  expires,
  organizationName,
}: {
  acceptInviteLink: string;
  expires: Date;
  organizationName: string;
}) {
  const expiresIn = expires.getTime() - Date.now();
  const linkDuration: number = Math.ceil(expiresIn / 1000 / 60 / 60);
  return (
    <Html>
      <Head />
      <Preview>PROCEED magic link</Preview>
      <Body
        style={{
          backgroundColor: '#fff',
          color: '#212121',
          textAlign: 'center',
        }}
      >
        <Container
          style={{
            padding: '20px',
            margin: '0 auto',
            backgroundColor: '#eee',
          }}
        >
          <Section
            style={{
              backgroundColor: '#fff',
            }}
          >
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
                You've been invited to {organizationName}
              </Heading>

              <Link
                href={acceptInviteLink}
                target="_blank"
                style={{
                  ...link,
                  fontWeight: 'bold',
                  margin: '10px 0',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  Join {organizationName}
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

export default function renderOrganizationInviteEmail(
  props: React.ComponentProps<typeof OrganizationInviteEmail>,
) {
  const email = <OrganizationInviteEmail {...props} />;

  return { html: render(email), text: render(email, { plainText: true }) };
}
