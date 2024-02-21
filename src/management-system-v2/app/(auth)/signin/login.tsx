'use client';

import { FC, Fragment, ReactNode } from 'react';
import {
  Space,
  Form,
  Input,
  Button,
  Card,
  Divider,
  Typography,
  Image as AntDesignImage,
  Alert,
} from 'antd';

import styles from './login.module.scss';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from './page';

const Login: FC<{
  providers: ExtractedProvider[];
}> = ({ providers }) => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const authError = searchParams.get('error');

  return (
    <Space
      direction="horizontal"
      style={{
        width: '100%',
        minHeight: '100vh',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div style={{ marginTop: '-10rem' }}>
        <Card
          title={
            <Image
              src="/proceed.svg"
              alt="PROCEED Logo"
              width={160}
              height={63}
              priority
              style={{ marginBottom: '1rem' }}
            />
          }
          className={styles.Card}
        >
          <Typography.Title level={5} style={{ marginBottom: '1rem' }}>
            Sign in
          </Typography.Title>

          {authError && (
            <Alert description={authError} type="error" style={{ marginBottom: '2rem' }} />
          )}

          {providers.map((provider, idx) => {
            let loginMethod: ReactNode;
            if (provider.type === 'credentials') {
              loginMethod = (
                <Form
                  name="normal_login"
                  className={styles.loginForm}
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
                    Continue with {provider.name}
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
                  name="normal_login"
                  className={styles.loginForm}
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
                    <Typography.Text
                      style={{ display: 'block', textAlign: 'center', padding: '1rem' }}
                    >
                      OR
                    </Typography.Text>
                  </Divider>
                )}
              </Fragment>
            );
          })}
        </Card>
        <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
          By signing in, you agree to our <Link href="/terms">Terms of Service</Link>
        </Typography.Text>
      </div>
    </Space>
  );
};

export default Login;
