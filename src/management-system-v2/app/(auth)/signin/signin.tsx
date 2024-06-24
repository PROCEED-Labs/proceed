'use client';

import { FC, useEffect, useState } from 'react';
import { Typography, Alert, Form, Input, Button, Divider, Modal, Space, Tooltip } from 'antd';

import styles from './login.module.scss';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/app/api/auth/[...nextauth]/auth-options';

const SignIn: FC<{
  providers: ExtractedProvider[];
}> = ({ providers }) => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const authError = searchParams.get('error');

  const oauthProviders = providers.filter((provider) => provider.type === 'oauth');
  const guestProvider = providers.find((provider) => provider.id === 'guest-signin');
  const credentials = providers.filter(
    (provider) => provider.type !== 'oauth' && provider.id !== 'guest-signin',
  );

  // We need to wait until the component is mounted on the client
  // to open the modal, otherwise it will cause a hydration mismatch
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(true);
  }, [setOpen]);

  return (
    <Modal
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
      open={open}
      closeIcon={null}
      footer={null}
      style={{
        maxWidth: '400px',
        width: '90%',
        top: 0,
      }}
      styles={{
        mask: { backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' },
      }}
      className={styles.Card}
    >
      <Typography.Title level={4} style={{ marginBottom: '2rem', textAlign: 'center' }}>
        Sign in
      </Typography.Title>

      {authError && <Alert description={authError} type="error" style={{ marginBottom: '2rem' }} />}

      <Space direction="vertical" style={{ gap: '1.5rem', width: '100%' }}>
        {credentials.map((provider) => {
          if (provider.type === 'credentials') {
            return (
              <Form
                onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
                key={provider.id}
                layout="vertical"
              >
                {Object.keys(provider.credentials).map((key) => (
                  <Form.Item name={key} key={key} style={{ marginBottom: '.5rem' }}>
                    <Input placeholder={provider.credentials[key].label} />
                  </Form.Item>
                ))}
                <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                  {provider.name}
                </Button>
              </Form>
            );
          } else if (provider.type === 'email') {
            return (
              <Form
                onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
                key={provider.id}
                layout="vertical"
              >
                <Form.Item
                  name="email"
                  rules={[{ type: 'email', required: true }]}
                  style={{ marginBottom: '.5rem' }}
                >
                  <Input placeholder="Email" />
                </Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                  Continue with {provider.name}
                </Button>
              </Form>
            );
          }
        })}

        <Space wrap>
          {oauthProviders.map((provider, idx) => {
            if (provider.type !== 'oauth') return null;
            return (
              <Tooltip title={`Sign in with ${provider.name}`}>
                <Button
                  key={idx}
                  style={{
                    marginBottom: '.5rem',
                    padding: '1.6rem',
                  }}
                  icon={
                    <img
                      src={`https://authjs.dev/img/providers${provider.style?.logo}`}
                      alt={provider.name}
                      style={{ width: '1.5rem', height: 'auto' }}
                    />
                  }
                  onClick={() => signIn(provider.id, { callbackUrl })}
                />
              </Tooltip>
            );
          })}
        </Space>
      </Space>

      {guestProvider && (
        <>
          <Divider style={{ color: 'black' }}>
            <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
              OR
            </Typography.Text>
          </Divider>
          <Form
            onFinish={(values) => signIn(guestProvider.id, { ...values, callbackUrl })}
            key={guestProvider.id}
            layout="vertical"
          >
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {guestProvider.name}
            </Button>

            <Alert
              message="Beware: If you continue as a guest, the processes your create will not be accessible on other devicces and all your data will be automatically deleted after a few days. To save your data you have to sign in"
              type="warning"
              style={{ marginBottom: '1rem' }}
            />
          </Form>
        </>
      )}

      <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
        By signing in, you agree to our <Link href="/terms">Terms of Service</Link>
      </Typography.Text>
    </Modal>
  );
};

export default SignIn;
