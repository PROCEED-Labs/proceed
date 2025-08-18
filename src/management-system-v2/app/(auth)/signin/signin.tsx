'use client';

import { FC, Fragment, use, useEffect, useState } from 'react';
import {
  Typography,
  Alert,
  Form,
  Input,
  Button as AntDesignButton,
  Divider,
  ButtonProps,
  ConfigProvider,
  TabsProps,
  Tabs,
  Grid,
  Select,
  AlertProps,
} from 'antd';

import { GoOrganization } from 'react-icons/go';
import { MdLogin } from 'react-icons/md';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import { MdEmail } from 'react-icons/md';
import { FaCircleArrowUp } from 'react-icons/fa6';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/lib/auth';
import { EnvVarsContext } from '@/components/env-vars-context';
import AuthModal from '../auth-modal';
import useMSLogo from '@/lib/use-ms-logo';

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

const CredentialsSignIn = ({
  provider,
  callbackUrl,
}: {
  provider: Extract<ExtractedProvider, { type: 'credentials' }>;
  callbackUrl?: string;
}) => {
  return (
    <Form
      onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
      key={provider.id}
      layout="vertical"
    >
      {Object.keys(provider.credentials).map((key) => (
        <Form.Item name={key} key={key} style={{ marginBottom: '.5rem' }}>
          <Input
            placeholder={provider.credentials[key].label}
            type={provider.credentials[key].type as string}
            defaultValue={provider.credentials[key].value as string}
          />
        </Form.Item>
      ))}
      <Button htmlType="submit" style={{ marginBottom: verticalGap }}>
        {provider.name}
      </Button>
    </Form>
  );
};

const SignIn: FC<{
  providers: ExtractedProvider[];
  userType: 'guest' | 'user' | 'none';
  guestReferenceToken?: string;
  logoUrl?: string;
}> = ({ providers, userType, guestReferenceToken, logoUrl }) => {
  const env = use(EnvVarsContext);
  const breakpoint = Grid.useBreakpoint();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? undefined;
  const callbackUrlWithGuestRef = guestReferenceToken
    ? `/transfer-processes?referenceToken=${guestReferenceToken}&callbackUrl=${callbackUrl}`
    : callbackUrl;

  let authError = searchParams.get('error');
  let authErrorType = 'error';
  const errorTypeMatch = authError?.match(/^\$(?<type>\w+)\s+(?<message>.+)/);
  if (errorTypeMatch?.groups) {
    authError = errorTypeMatch.groups.message;
    authErrorType = errorTypeMatch.groups.type;
  }

  const oauthProviders = providers.filter((provider) => ['oauth', 'oidc'].includes(provider.type));
  const guestProvider = providers.find((provider) => provider.id === 'guest-signin');

  const emailProvider = providers.find((provider) => provider.type === 'email');
  const passwordSigninProvider = providers.find(
    (provider) => provider.id === 'username-password-signin',
  );
  const passwordSignupProvider = providers.find(
    (provider) => provider.id === 'register-as-new-user',
  );
  const developmentUsersProvider = providers.find(
    (provider) => provider.id === 'development-users',
  );

  const [_activeIndex, setActiveIndex] = useState<string | null>(null);

  const { imageSource } = useMSLogo(logoUrl, { disableResponsive: false });

  // We need to wait until the component is mounted on the client
  // to open the modal, otherwise it will cause a hydration mismatch
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(true);
  }, [setOpen]);

  type Tab = NonNullable<TabsProps['items']>[number];
  const tabs: (Tab & { href?: string; onClick?: () => void })[] = [];

  if (developmentUsersProvider) {
    tabs.push({
      icon: <FaCircleArrowUp size={26} />,
      label: 'Sign In as Development User',
      key: 'development-users',
      children: (
        <Form
          onFinish={(values) =>
            signIn(developmentUsersProvider.id, { ...values, callbackUrl: callbackUrlWithGuestRef })
          }
          key={developmentUsersProvider.id}
          layout="vertical"
        >
          <Form.Item name="username" initialValue="admin">
            <Select
              options={[
                {
                  value: 'admin',
                },
                { value: 'johndoe' },
              ]}
            />
          </Form.Item>
          <Button htmlType="submit" style={{ marginBottom: verticalGap }}>
            {developmentUsersProvider.name}
          </Button>
        </Form>
      ),
    });
  }

  if (emailProvider) {
    tabs.push({
      icon: <MdEmail size={26} />,
      label: (
        <span>
          Sign In with <span style={{ whiteSpace: 'nowrap' }}>E-Mail</span>
        </span>
      ),
      key: 'signin-email',
      children: (
        <>
          <Form
            onFinish={(values) =>
              signIn(emailProvider.id, { ...values, callbackUrl: callbackUrlWithGuestRef })
            }
            key={emailProvider.id}
            layout="vertical"
            style={{ marginBottom: verticalGap }}
          >
            <Form.Item
              name="email"
              rules={[{ type: 'email', required: true }]}
              style={{ marginBottom: verticalGap }}
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
      ),
    });
  }

  if (passwordSigninProvider) {
    tabs.push({
      icon: <MdLogin size={26} />,
      label: 'Sign In with Password',
      key: 'signin-password',
      children: (
        <CredentialsSignIn
          provider={passwordSigninProvider as any}
          callbackUrl={callbackUrlWithGuestRef}
        />
      ),
    });
  }

  if (passwordSignupProvider && env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
    tabs.push({
      icon: <BsFillPersonPlusFill size={26} />,
      label: 'Register as New User',
      key: 'signup-password',
      children: (
        <CredentialsSignIn
          provider={passwordSignupProvider as any}
          callbackUrl={callbackUrlWithGuestRef}
        />
      ),
    });
  }

  if (!env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
    tabs.push({
      icon: <GoOrganization size={26} />,
      label: 'Create Organization',
      key: 'create-organization',
      href: '/create-organization',
      children: null,
    });
  }

  for (const provider of oauthProviders) {
    tabs.push({
      key: provider.id,
      label: `Sign in with ${provider.name}`,
      onClick: () => signIn(provider.id, { callbackUrl: callbackUrlWithGuestRef }),
      icon: (
        // eslint-disable-next-line
        <img
          src={`https://authjs.dev/img/providers/${provider.id}.svg`}
          alt={provider.name}
          style={{ width: '1.5rem', height: 'auto' }}
        />
      ),
    });
  }

  const activeIndex = _activeIndex || tabs[0]?.key;

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
            description={authError}
            type={authErrorType as AlertProps['type']}
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

        {/* If the user isn't none, we already show the signIn title at the top of the modal */}
        {signInTitle}

        <Tabs
          items={tabs}
          renderTabBar={() => (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: breakpoint.xs ? 'column' : 'row',
                  flexWrap: 'wrap',
                  alignItems: 'stretch',
                  justifyContent: 'stretch',
                  gap: '1rem',
                  width: '100%',
                }}
              >
                {tabs.map((option, index) => {
                  const Wrapper = option.href ? Link : Fragment;

                  return (
                    <Wrapper key={index} href={option.href as any} passHref legacyBehavior>
                      <AntDesignButton
                        style={{
                          flex: breakpoint.xs ? '' : '1 1 0', // evenly fill container
                          height: 'auto', // Allow for vertical stretching
                          minHeight: 'min-content',
                          padding: '.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          whiteSpace: 'normal',
                          wordBreak: 'keep-all',
                          minWidth: '22%', // -> 4 per row
                        }}
                        color={option.key === activeIndex ? 'primary' : 'default'}
                        variant="outlined"
                        onClick={() => {
                          if (option.onClick) option.onClick();
                          else if (!option.href) setActiveIndex(option.key);
                        }}
                      >
                        {option.icon}
                        <Typography.Text
                          style={{
                            textAlign: 'center',
                            fontSize: '0.75rem',
                          }}
                        >
                          {option.label}
                        </Typography.Text>
                      </AntDesignButton>
                    </Wrapper>
                  );
                })}
              </div>
              <Divider />
            </>
          )}
          activeKey={activeIndex}
        />

        {userType === 'guest' && guestProvider && (
          <>
            {divider}
            <Button href="/processes" style={{ marginBottom: verticalGap }}>
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
