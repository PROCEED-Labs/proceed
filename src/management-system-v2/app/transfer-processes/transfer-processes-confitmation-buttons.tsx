'use client';

import { Space, Button } from 'antd';
import { useTransition } from 'react';
import {
  transferProcesses as serverTransferProcesses,
  discardProcesses as serverDiscardProcesses,
} from './server-actions';

export default function TransferProcessesConfirmationButtons({
  guestId,
  callbackUrl,
}: {
  guestId: string;
  callbackUrl?: string;
}) {
  const [transferring, startTransfer] = useTransition();
  function transferProcesses() {
    startTransfer(async () => {
      await serverTransferProcesses(guestId, callbackUrl);
    });
  }

  const [discardingProcesses, startDiscardingProcesses] = useTransition();
  function discardProcesses() {
    startDiscardingProcesses(async () => {
      await serverDiscardProcesses(guestId, callbackUrl);
    });
  }

  return (
    <Space style={{ width: '100%', justifyContent: 'right' }}>
      <Button onClick={discardProcesses} loading={discardingProcesses}>
        No
      </Button>
      <Button type="primary" onClick={transferProcesses} loading={transferring}>
        Yes
      </Button>
    </Space>
  );
}
