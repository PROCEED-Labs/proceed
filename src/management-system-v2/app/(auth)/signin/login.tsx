'use client';

import { FC } from 'react';
import { Space, Card, Typography, Alert } from 'antd';

import styles from './login.module.scss';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { type ExtractedProvider } from './page';
import SignInOptions from '@/components/signin-options';

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

          <SignInOptions providers={providers} callbackUrl={callbackUrl} />
        </Card>
        <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
          By signing in, you agree to our <Link href="/terms">Terms of Service</Link>
        </Typography.Text>
      </div>
    </Space>
  );
};

export default Login;
