'use client';

import { Space, Button, App, Card, Typography } from 'antd';
import { useState } from 'react';
import { changeEmail as serverChangeEmail } from '@/lib/change-email/server-actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';

export default function ChangeEmailCard({
  previousEmail,
  newEmail,
}: {
  previousEmail?: string | null;
  newEmail: string;
}) {
  const { message } = App.useApp();
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();

  const [loading, setLoading] = useState<'changing' | 'cancelling' | undefined>();
  async function changeEmail(cancel: boolean = false) {
    try {
      setLoading(cancel ? 'cancelling' : 'changing');

      const response = await serverChangeEmail(params.get('token')!, params.get('email')!, cancel);

      if (response?.error) throw response.error.message;

      if (cancel) {
        message.open({ content: 'Email change cancelled', type: 'success' });
      } else {
        message.open({ content: 'Email changed', type: 'success' });
        session.update();
      }

      router.push('/profile');
    } catch (e) {
      const content = typeof e === 'string' ? e : 'An error occurred';

      message.open({ content, type: 'error' });
      setLoading(undefined);
    }
  }

  return (
    <Card
      title="Are you sure you want to change your email?"
      style={{ width: '90%', maxWidth: '80ch', margin: 'auto' }}
    >
      {previousEmail ? (
        <>
          <Typography.Text code>{previousEmail}</Typography.Text>
          <ArrowRightOutlined style={{ margin: '0 1rem' }} />
          <Typography.Text code>{newEmail}</Typography.Text>
        </>
      ) : (
        <>
          Your email will now be <Typography.Text code>{newEmail}</Typography.Text>
        </>
      )}
      <br />
      <Space style={{ marginTop: '1rem' }}>
        <Button type="default" onClick={() => changeEmail(true)} loading={loading === 'cancelling'}>
          Cancel
        </Button>
        <Button type="primary" onClick={() => changeEmail()} loading={loading === 'changing'}>
          Confirm
        </Button>
      </Space>
    </Card>
  );
}
