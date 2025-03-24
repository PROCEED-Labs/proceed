'use client';

import { FC } from 'react';
import {
  Typography,
  Alert,
  Form,
  Input,
  Button as AntDesignButton,
  Divider,
  Space,
  Tooltip,
  ButtonProps,
  ConfigProvider,
} from 'antd';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/app/api/auth/[...nextauth]/auth-options';
import AuthModal from '../auth-modal';

const verticalGap = '1rem';

const divider = (
  <Divider style={{ color: 'black' }}>
    <Typography.Text style={{ display: 'block', textAlign: 'center' }}>OR</Typography.Text>
  </Divider>
);

const Button = (props: ButtonProps) => (
  <div style={{ display: 'flex', justifyContent: 'center' }}>
    <AntDesignButton
      type="primary"
      {...props}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        width: '25ch',
        maxWidth: '80%',
        textWrap: 'wrap',
        ...(props.style ?? {}),
      }}
    />
  </div>
);

const signInTitle = (
  <Typography.Title level={4} style={{ textAlign: 'center' }}>
    SIGN IN
  </Typography.Title>
);

const SignIn: FC<{
  providers: ExtractedProvider[];
  userType: 'guest' | 'user' | 'none';
  guestReferenceToken?: string;
}> = ({ providers, userType, guestReferenceToken }) => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? undefined;
  const callbackUrlWithGuestRef = guestReferenceToken
    ? `/transfer-processes?referenceToken=${guestReferenceToken}&callbackUrl=${callbackUrl}`
    : callbackUrl;
  const authError = searchParams.get('error');

  const oauthProviders = providers.filter((provider) => provider.type === 'oauth');
  const guestProvider = providers.find((provider) => provider.id === 'guest-signin');
  const credentials = providers.filter(
    (provider) => provider.type !== 'oauth' && provider.id !== 'guest-signin',
  );

  return (
    <ConfigProvider
      theme={{
        components: {
          Alert: {
            colorText: '#434343',
          },
        },
      }}
    >
      <AuthModal
        title={
          <Image
            src="/proceed.svg"
            alt="PROCEED Logo"
            width={160}
            height={63}
            priority
            style={{ marginBottom: '1rem', display: 'block', margin: 'auto' }}
          />
        }
        styles={{
          header: { paddingBottom: verticalGap },
        }}
      >
        {authError && (
          <Alert description={authError} type="error" style={{ marginBottom: verticalGap }} />
        )}

        {userType === 'none' ? (
          <Typography.Title level={4} style={{ textAlign: 'center' }}>
            TRY PROCEED
          </Typography.Title>
        ) : (
          signInTitle
        )}

        {userType === 'none' && guestProvider && (
          <>
            <Form
              onFinish={(values) =>
                signIn(guestProvider.id, {
                  ...values,
                  callbackUrl: callbackUrl || '/processes?createprocess',
                })
              }
              key={guestProvider.id}
              layout="vertical"
            >
              <Button htmlType="submit" style={{ marginBottom: verticalGap }}>
                Create a Process
              </Button>
            </Form>
            {divider}
          </>
        )}

        {userType === 'none' && signInTitle}

        <Space direction="vertical" style={{ gap: verticalGap }}>
          {credentials.map((provider) => {
            if (provider.type === 'credentials') {
              return (
                <Form
                  onFinish={(values) =>
                    signIn(provider.id, { ...values, callbackUrl: callbackUrlWithGuestRef })
                  }
                  key={provider.id}
                  layout="vertical"
                >
                  {Object.keys(provider.credentials).map((key) => (
                    <Form.Item name={key} key={key} style={{ marginBottom: '.5rem' }}>
                      <Input placeholder={provider.credentials[key].label} />
                    </Form.Item>
                  ))}
                  <Button htmlType="submit" style={{ marginBottom: verticalGap }}>
                    {provider.name}
                  </Button>
                </Form>
              );
            } else if (provider.type === 'email') {
              return (
                <>
                  <Form
                    onFinish={(values) =>
                      signIn(provider.id, { ...values, callbackUrl: callbackUrlWithGuestRef })
                    }
                    key={provider.id}
                    layout="vertical"
                  >
                    <Form.Item
                      name="email"
                      rules={[{ type: 'email', required: true }]}
                      style={{ marginBottom: '.5rem' }}
                    >
                      <Input placeholder="E-Mail" />
                    </Form.Item>
                    <Button htmlType="submit">Continue with E-Mail</Button>
                  </Form>

                  <Alert
                    message="Note: Simply sign in with your e-mail address and we will send you an access link."
                    type="info"
                  />
                </>
              );
            }
          })}
        </Space>

        {divider}

        <Space wrap style={{ justifyContent: 'center', width: '100%' }}>
          {oauthProviders.map((provider, idx) => {
            if (provider.type !== 'oauth') return null;
            return (
              <Tooltip title={`Sign in with ${provider.name}`} key={provider.id}>
                <AntDesignButton
                  key={idx}
                  style={{
                    padding: '1.6rem',
                  }}
                  icon={
                    <img
                      src={`https://authjs.dev/img/providers${provider.style?.logo}`}
                      alt={provider.name}
                      style={{ width: '1.5rem', height: 'auto' }}
                    />
                  }
                  onClick={() => signIn(provider.id, { callbackUrl: callbackUrlWithGuestRef })}
                />
              </Tooltip>
            );
          })}
        </Space>

        {userType === 'guest' && guestProvider && (
          <>
            {divider}
            <Button href="/processes" style={{ marginBottom: verticalGap }}>
              Continue as Guest
            </Button>

            <Alert
              message='Note: if you select "Continue as Guest", the PROCEED Platform is functionally restricted and your created processes will not be accessible on other devices. All your data will be deleted automatically after a few days."'
              type="info"
            />
          </>
        )}

        <Typography.Paragraph
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '1rem',
            marginTop: verticalGap,
            fontSize: '.8rem',
            color: '#434343',
          }}
        >
          By using the PROCEED Platform, you agree to the{' '}
          <Link href="/terms">Terms of Service</Link> and the storage of functionally essential
          cookies on your device.
        </Typography.Paragraph>
      </AuthModal>
    </ConfigProvider>
  );
};

export default SignIn;
