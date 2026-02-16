'use client';

import { Fragment, use, useState } from 'react';
import {
  Typography,
  Alert,
  Form,
  Input,
  Button as AntDesignButton,
  Divider,
  ButtonProps,
  TabsProps,
  Tabs,
  Grid,
  Select,
} from 'antd';

import { GoOrganization } from 'react-icons/go';
import { MdLogin } from 'react-icons/md';
import { BsFillPersonPlusFill } from 'react-icons/bs';
import { MdEmail } from 'react-icons/md';
import { FaCircleArrowUp } from 'react-icons/fa6';

import Link from 'next/link';
import { signIn as _signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/lib/auth';
import { EnvVarsContext } from '@/components/env-vars-context';

async function signIn(
  providerId: string,
  options: Record<string, any>,
  callbackUrl?: string | (() => Promise<string>),
) {
  try {
    let url;
    if (typeof callbackUrl === 'function') {
      url = await callbackUrl();
    } else {
      url = callbackUrl;
    }

    await _signIn(providerId, { ...options, callbackUrl: url });
  } catch (e) {
    // Here it is assumed that the callbackUrl function will handle user feedback in case of an error
    console.error(e);
  }
}

const verticalGap = '1rem';

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

const CredentialsSignIn = ({
  provider,
  callbackUrl,
}: {
  provider: Extract<ExtractedProvider, { type: 'credentials' }>;
  callbackUrl?: string | (() => Promise<string>);
}) => {
  return (
    <Form
      onFinish={async (values) => {
        try {
          let url = callbackUrl;
          if (typeof callbackUrl === 'function') {
            url = await callbackUrl();
          }

          signIn(provider.id, { ...values }, callbackUrl);
        } catch (e) {
          // Here it is assumed that the callbackUrl function will handle user feedback in case of an error
          console.error(e);
        }
      }}
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

export function SigninOptions({
  providers,
  callbackUrl,
  createOrgOption = true,
}: {
  providers: ExtractedProvider[];
  callbackUrl?: string | (() => Promise<string>);
  createOrgOption?: boolean;
}) {
  const env = use(EnvVarsContext);
  const breakpoint = Grid.useBreakpoint();

  const oauthProviders = providers.filter((provider) => ['oauth', 'oidc'].includes(provider.type));

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

  type Tab = NonNullable<TabsProps['items']>[number];
  const tabs: (Tab & { href?: string; onClick?: () => void })[] = [];

  if (developmentUsersProvider) {
    tabs.push({
      icon: <FaCircleArrowUp size={26} />,
      label: 'Sign In as Development User',
      key: 'development-users',
      children: (
        <Form
          onFinish={(values) => signIn(developmentUsersProvider.id, { ...values }, callbackUrl)}
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
            onFinish={(values) => signIn(emailProvider.id, { ...values }, callbackUrl)}
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
            title="Note: Simply sign in with your e-mail address and we will send you an access link."
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
        <CredentialsSignIn provider={passwordSigninProvider as any} callbackUrl={callbackUrl} />
      ),
    });
  }

  if (passwordSignupProvider && env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
    tabs.push({
      icon: <BsFillPersonPlusFill size={26} />,
      label: 'Register as New User',
      key: 'signup-password',
      children: (
        <CredentialsSignIn provider={passwordSignupProvider as any} callbackUrl={callbackUrl} />
      ),
    });
  }

  if (createOrgOption && !env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
    tabs.push({
      icon: <GoOrganization size={26} />,
      label: 'Create Organization',
      key: 'create-organization',
      href: '/create-organization',
      children: null,
    } as const);
  }

  for (const provider of oauthProviders) {
    tabs.push({
      key: provider.id,
      label: `Sign in with ${provider.name}`,
      onClick: () => signIn(provider.id, {}, callbackUrl),
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
              const content = (
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
              );

              return option.href ? (
                <Link key={index} href={option.href as any} passHref legacyBehavior>
                  {content}
                </Link>
              ) : (
                <Fragment key={index}>{content}</Fragment>
              );
            })}
          </div>
          <Divider />
        </>
      )}
      activeKey={activeIndex}
    />
  );
}
