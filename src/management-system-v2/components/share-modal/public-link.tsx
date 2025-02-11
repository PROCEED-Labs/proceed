import { App, Button, Checkbox, CheckboxChangeEvent, Input, QRCode, Select, Space } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';
import { IoOpenOutline } from 'react-icons/io5';

import { Process } from '@/lib/data/process-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useProcessVersion from './use-process-version';
import { updateShare } from './share-helpers';

type ModelerShareModalOptionPublicLinkProps = {
  sharedAs: 'public' | 'protected';
  shareTimestamp: number;
  refresh: () => void;
  process?: { id: string; versions?: Process['versions'] };
};

const ModelerShareModalOptionPublicLink = ({
  sharedAs,
  shareTimestamp,
  refresh,
  process,
}: ModelerShareModalOptionPublicLinkProps) => {
  const environment = useEnvironment();

  const [selectedVersionId, setSelectedVersionId] = useProcessVersion(process?.versions);

  const [shareLink, setShareLink] = useState('');
  const [registeredUsersonlyChecked, setRegisteredUsersonlyChecked] = useState(
    sharedAs === 'protected',
  );
  const app = App.useApp();

  const isShareLinkChecked = shareTimestamp > 0;
  const isShareLinkEmpty = shareLink.length === 0;

  const optionsDisabled = !process || isShareLinkEmpty;

  useEffect(() => {
    if (isShareLinkChecked) {
      wrapServerCall({
        fn: () =>
          generateSharedViewerUrl(
            { processId: process!.id, timestamp: shareTimestamp },
            selectedVersionId || undefined,
          ),
        onSuccess: (url) => setShareLink(url),
        app,
      });
    }
    setRegisteredUsersonlyChecked(sharedAs === 'protected');
  }, [sharedAs, shareTimestamp, process, selectedVersionId, isShareLinkChecked, app]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      app.message.success('Link Copied');
    } catch (err) {
      app.message.error('Error copying link');
    }
  };

  const handlePermissionChanged = async (e: CheckboxChangeEvent) => {
    if (!process) return;

    const isChecked = e.target.checked;
    setRegisteredUsersonlyChecked(isChecked);
    if (isShareLinkChecked) {
      const sharedAsValue = isChecked ? 'protected' : 'public';
      await updateProcessGuestAccessRights(
        process.id,
        {
          sharedAs: sharedAsValue,
        },
        environment.spaceId,
      );
    }
    refresh();
  };

  const handleShareLinkChecked = async (e: CheckboxChangeEvent) => {
    if (!process) return;
    await updateShare(
      {
        processId: process.id,
        versionId: selectedVersionId || undefined,
        spaceId: environment.spaceId,
        unshare: !e.target.checked,
      },
      {
        app,
        onSuccess: (url) => setShareLink(url ?? ''),
      },
    );

    refresh();
  };

  const canvasRef = useRef<HTMLDivElement>(null);

  const getQRCodeBlob = async () => {
    try {
      const canvas = canvasRef.current?.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) throw new Error('QR Code canvas not found');

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create PNG blob');

      return blob;
    } catch (err) {
      throw new Error(`${err}`);
    }
  };

  const handleQRCodeAction = async (action: 'download' | 'copy') => {
    try {
      if (action === 'copy') {
        const item = new ClipboardItem({ 'image/png': await getQRCodeBlob() });
        await navigator.clipboard.write([item]);
        app.message.success('QR Code copied as PNG');
      } else if (action === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await getQRCodeBlob());
        a.download = 'qrcode.png';
        a.click();
      } else {
        throw new Error('Invalid action specified');
      }
    } catch (err: any) {
      if (err instanceof ReferenceError)
        app.message.info(`ClipboardAPI not supported in your browser`);
      else app.message.error(`${err}`);
    }
  };

  const handleOpenSharedPage = async () => {
    if (shareTimestamp) {
      await wrapServerCall({
        fn: () =>
          generateSharedViewerUrl(
            { processId: process!.id, timestamp: shareTimestamp },
            selectedVersionId || undefined,
          ),
        onSuccess: (url) => window.open(url, `${process!.id}-${selectedVersionId}-tab`),
      });
    }
  };

  return (
    <Space direction="vertical" style={{ gap: '1rem', width: '100%' }}>
      <Checkbox checked={isShareLinkChecked} onChange={handleShareLinkChecked} disabled={!process}>
        Share Process with Public Link
      </Checkbox>

      <Checkbox
        checked={registeredUsersonlyChecked}
        onChange={handlePermissionChanged}
        disabled={optionsDisabled}
      >
        Visible only for registered user
      </Checkbox>

      {isShareLinkChecked && (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Select
            value={selectedVersionId || '-1'}
            options={[
              { value: '-1', label: 'Latest Version' },
              ...(process?.versions || []).map((version) => ({
                value: version.id,
                label: version.name,
              })),
            ]}
            onChange={(value) => {
              setSelectedVersionId(value === '-1' ? null : value);
            }}
            style={{ width: '35 %' }}
          />
          <Button onClick={handleOpenSharedPage} icon={<IoOpenOutline />}>
            Open Preview
          </Button>
        </div>
      )}

      {isShareLinkChecked && (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Button
            onClick={handleCopyLink}
            icon={<CopyOutlined />}
            style={{ justifyContent: 'start' }}
          >
            Copy Link
          </Button>
          <Input type={'text'} value={shareLink} style={{ flexGrow: 1 }} />
        </div>
      )}

      {isShareLinkChecked && (
        <div style={{ display: 'flex', width: '100%', gap: '.5rem', alignItems: 'center' }}>
          <QRCode value={shareLink} type="svg" bordered={false} icon="/proceed-icon.png" />
          {/** svg looks has better resolution, but is way harder to copy to the clipboard, that's why we have a hidden qr code */}
          <div id="qrcode" ref={canvasRef} style={{ display: 'none' }}>
            <QRCode
              size={300}
              value={shareLink}
              type="canvas"
              bordered={false}
              icon="/proceed-icon.png"
            />
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                width: 'min-content',
                gap: '0.5rem',
              }}
            >
              <Button
                icon={<DownloadOutlined />}
                title="Save as PNG"
                onClick={() => handleQRCodeAction('download')}
                disabled={isShareLinkEmpty}
              >
                Save QR Code
              </Button>
              <Button
                icon={<CopyOutlined />}
                title="Copy as PNG"
                onClick={() => handleQRCodeAction('copy')}
                disabled={isShareLinkEmpty}
              >
                Copy QR Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </Space>
  );
};

export default ModelerShareModalOptionPublicLink;
