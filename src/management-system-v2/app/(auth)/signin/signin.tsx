'use client';

import { FC, Fragment, ReactNode, useEffect, useState } from 'react';
import {
  Typography,
  Alert,
  Form,
  Input,
  Button,
  Image as AntDesignImage,
  Divider,
  Modal,
} from 'antd';

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

      {providers.map((provider, idx) => {
        let loginMethod: ReactNode;
        if (provider.type === 'credentials') {
          loginMethod = (
            <Form
              onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
              key={provider.id}
              layout="vertical"
            >
              {provider.id === 'guest-signin' && (
                <Alert
                  message="Beware: Your processes and data will be deleted after a few days. Sign in to avoid this."
                  type="warning"
                  style={{ marginBottom: '1rem' }}
                />
              )}
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
        } else if (provider.type === 'oauth') {
          loginMethod = (
            <Button
              key={idx}
              style={{
                backgroundColor: provider.style?.bg,
                color: provider.style?.text,
                width: '100%',
                marginBottom: '.5rem',
              }}
              icon={
                <AntDesignImage
                  width={20}
                  src={`https://authjs.dev/img/providers${provider.style?.logo}`}
                  alt={provider.name}
                />
              }
              onClick={() => signIn(provider.id, { callbackUrl })}
            >
              Continue with {provider.name}
            </Button>
          );
        } else if (provider.type === 'email') {
          loginMethod = (
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

        return (
          <Fragment key={provider.id}>
            {loginMethod}
            {idx < providers.length - 1 && provider.type !== 'oauth' && (
              <Divider style={{ color: 'black' }}>
                <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
                  OR
                </Typography.Text>
              </Divider>
            )}
          </Fragment>
        );
      })}
      <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
        By signing in, you agree to our <Link href="/terms">Terms of Service</Link>
      </Typography.Text>
    </Modal>
  );
};

export default SignIn;
