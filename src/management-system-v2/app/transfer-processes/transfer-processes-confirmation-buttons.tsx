'use client';

import { Space, Button } from 'antd';
import { ReactNode, useTransition } from 'react';
import {
  transferProcesses as serverTransferProcesses,
  discardProcesses as serverDiscardProcesses,
} from './server-actions';

export default function ProcessTransferButtons({
  referenceToken,
  callbackUrl,
}: {
  referenceToken: string;
  callbackUrl?: string;
  children?: ReactNode;
}) {
  const [discardingProcesses, startDiscardingProcesses] = useTransition();
  function discardProcesses() {
    startDiscardingProcesses(async () => {
      await serverDiscardProcesses(referenceToken, callbackUrl);
    });
  }

  const [transferring, startTransfer] = useTransition();
  function transferProcesses() {
    startTransfer(async () => {
      await serverTransferProcesses(referenceToken, callbackUrl);
    });
  }

  return (
    <Space style={{ width: '100%', justifyContent: 'right' }}>
      <Button onClick={discardProcesses} loading={discardingProcesses} disabled={transferring}>
        No
      </Button>
      <Button
        type="primary"
        onClick={transferProcesses}
        loading={transferring}
        disabled={discardingProcesses}
      >
        Yes
      </Button>
    </Space>
  );
}
