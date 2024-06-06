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
import { SigninOptions } from '@/components/signin-options';

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
      }}
      styles={{
        mask: { backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' },
      }}
      className={styles.Card}
    >
      <Typography.Title level={4} style={{ marginBottom: '2rem', textAlign: 'center' }}>
        Sign in
      </Typography.Title>

      <SigninOptions providers={providers} callbackUrl={callbackUrl} />

      {authError && <Alert description={authError} type="error" style={{ marginBottom: '2rem' }} />}

      <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
        By signing in, you agree to our <Link href="/terms">Terms of Service</Link>
      </Typography.Text>
    </Modal>
  );
};

export default SignIn;
