'use client';

import { Space, Button, App, Card, Typography } from 'antd';
import { useTransition } from 'react';
import { changeEmail as serverChangeEmail } from '@/lib/change-email/server-actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightOutlined } from '@ant-design/icons';
import Content from '@/components/content';

export default function ConfirmationButtons({
  previousEmail,
  newEmail,
}: {
  previousEmail?: string;
  newEmail: string;
}) {
  const { message } = App.useApp();
  const params = useSearchParams();
  const router = useRouter();

  const [changingEmail, startChangingEmail] = useTransition();
  function changeEmail() {
    startChangingEmail(async () => {
      try {
        const response = await serverChangeEmail(params.get('token')!, params.get('email')!);

        if (response?.error) throw response.error.message;

        message.open({ content: 'Email changed', type: 'success' });
        router.push('/profile');
      } catch (e) {
        const content = typeof e === 'string' ? e : 'An error occurred';

        message.open({ content, type: 'error' });
      }
    });
  }

  const [cancelling, startCancel] = useTransition();
  function cancel() {}

  return (
    <Content title="Change Email">
      <Card
        title="Are you sure you want to change your email?"
        style={{ width: '90%', maxWidth: '80ch', margin: 'auto' }}
      >
        {!previousEmail ? (
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
          <Button type="default" onClick={cancel} loading={cancelling}>
            Cancel
          </Button>
          <Button type="primary" onClick={changeEmail} loading={changingEmail}>
            Confirm
          </Button>
        </Space>
      </Card>
    </Content>
  );
}
