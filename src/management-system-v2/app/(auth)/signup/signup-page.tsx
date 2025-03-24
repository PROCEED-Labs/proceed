'use client';

import Image from 'next/image';
import AuthModal from '../auth-modal';
import { Typography, Form, Input, Button as AntDesignButton, ButtonProps, Alert } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

export default function SignupPage({ guestReferenceToken }: { guestReferenceToken?: string }) {
  const searchParams = useSearchParams();
  let callbackUrl = searchParams.get('callbackUrl') ?? undefined;
  if (guestReferenceToken) {
    const params = new URLSearchParams(searchParams);
    params.set('referenceToken', guestReferenceToken);
    if (callbackUrl) params.set('callbackUrl', callbackUrl);
    callbackUrl = `/transfer-processes?${params.toString()}`;
  }
  const authError = searchParams.get('error');

  return (
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
    >
      {authError && (
        <Alert description={authError} type="error" style={{ marginBottom: verticalGap }} />
      )}

      <Typography.Title level={4} style={{ textAlign: 'center' }}>
        Sign Up
      </Typography.Title>
      <Form layout="vertical">
        <Form.Item
          name="Username"
          rules={[{ type: 'string', required: true }]}
          style={{ marginBottom: '.5rem' }}
          label="Username"
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[{ type: 'email', required: true }]}
          style={{ marginBottom: '.5rem' }}
          label="E-Mail"
        >
          <Input type="email" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ type: 'string', required: true }]}
          style={{ marginBottom: '.5rem' }}
          label="Password"
        >
          <Input type="password" />
        </Form.Item>
        <Form.Item
          name="password-confirm"
          rules={[
            {
              required: true,
              message: 'Please confirm your password!',
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('The new password that you entered do not match!'));
              },
            }),
          ]}
          style={{ marginBottom: '.5rem' }}
          label="Confirm password"
        >
          <Input type="password" />
        </Form.Item>

        <Button htmlType="submit">Sign up</Button>
      </Form>

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
        By using the PROCEED Platform, you agree to the <Link href="/terms">Terms of Service</Link>{' '}
        and the storage of functionally essential cookies on your device.
      </Typography.Paragraph>
    </AuthModal>
  );
}
