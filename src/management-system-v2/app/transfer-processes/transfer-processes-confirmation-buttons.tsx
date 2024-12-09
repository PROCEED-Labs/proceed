'use client';

import { Space, Button } from 'antd';
import { ReactNode, useTransition } from 'react';
import {
  transferProcesses as serverTransferProcesses,
  discardProcesses as serverDiscardProcesses,
} from './server-actions';

export function DiscardButton({
  referenceToken,
  callbackUrl,
  children = 'No',
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

  return (
    <Space style={{ width: '100%', justifyContent: 'right' }}>
      <Button onClick={discardProcesses} loading={discardingProcesses}>
        {children}
      </Button>
    </Space>
  );
}

export function TransferButton({
  referenceToken,
  callbackUrl,
  children = 'Yes',
}: {
  referenceToken: string;
  callbackUrl?: string;
  children?: ReactNode;
}) {
  const [transferring, startTransfer] = useTransition();
  function transferProcesses() {
    startTransfer(async () => {
      await serverTransferProcesses(referenceToken, callbackUrl);
    });
  }

  return (
    <Button type="primary" onClick={transferProcesses} loading={transferring}>
      {children}
    </Button>
  );
}
