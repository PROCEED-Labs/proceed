'use client';

import { FC, use } from 'react';
import {
  Typography,
  Alert,
  Form,
  Button as AntDesignButton,
  Divider,
  ButtonProps,
  ConfigProvider,
} from 'antd';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/lib/auth';
import { EnvVarsContext } from '@/components/env-vars-context';
import AuthModal from '../auth-modal';
import useMSLogo from '@/lib/use-ms-logo';
import { SigninOptions } from '@/components/signin-options';
import { getAuthJsErrorMessageFromType } from '@/lib/authjs-error-message';

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
  logoUrl?: string;
}> = ({ providers, userType, guestReferenceToken, logoUrl }) => {
  const env = use(EnvVarsContext);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? undefined;
  const callbackUrlWithGuestRef = guestReferenceToken
    ? `/transfer-processes?referenceToken=${guestReferenceToken}&callbackUrl=${callbackUrl}`
    : callbackUrl;

  const authError = getAuthJsErrorMessageFromType(
    searchParams.get('error'),
    searchParams.get('code'),
  );

  const guestProvider = providers.find((provider) => provider.id === 'guest-signin');

  const { imageSource } = useMSLogo(logoUrl, { disableResponsive: false });

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
          // TODO: imageSource could be not hosted by use
          <Image
            src={imageSource}
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
          <Alert
            description={authError.message}
            type={authError.type}
            style={{ marginBottom: verticalGap }}
          />
        )}

        {userType === 'none' && guestProvider && env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE && (
          <>
            <Typography.Title level={4} style={{ textAlign: 'center' }}>
              TRY PROCEED
            </Typography.Title>
            <Form
              onFinish={(values) =>
                signIn(guestProvider.id, {
                  ...values,
                  callbackUrl: callbackUrl || '/start',
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

        {/* If the user isn't none, we already show the signIn title at the top of the modal */}
        {signInTitle}

        <SigninOptions providers={providers} callbackUrl={callbackUrlWithGuestRef} />

        {userType === 'guest' && guestProvider && (
          <>
            {divider}
            <Button href="/start" style={{ marginBottom: verticalGap }}>
              Continue as Guest
            </Button>

            <Alert
              message='Note: if you select "Continue as Guest", the this Platform is functionally restricted and your created processes will not be accessible on other devices. All your data will be deleted automatically after a few days."'
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
          By using the this Platform, you agree to the <Link href="/terms">Terms of Service</Link>{' '}
          and the storage of functionally essential cookies on your device.
        </Typography.Paragraph>
      </AuthModal>
    </ConfigProvider>
  );
};

export default SignIn;
