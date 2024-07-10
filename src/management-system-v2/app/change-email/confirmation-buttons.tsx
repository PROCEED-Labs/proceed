'use client';

import { Space, Button, App } from 'antd';
import { useTransition } from 'react';
import { changeEmail as serverChangeEmail } from '@/lib/change-email/server-actions';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmationButtons() {
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
    <Space>
      <Button type="default" onClick={cancel} loading={cancelling}>
        Cancel
      </Button>
      <Button type="primary" onClick={changeEmail} loading={changingEmail}>
        Confirm
      </Button>
    </Space>
  );
}
