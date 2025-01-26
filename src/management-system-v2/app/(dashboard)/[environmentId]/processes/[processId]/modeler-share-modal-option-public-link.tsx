'use client';
import { App, Button, Checkbox, Col, Flex, Input, QRCode, Row, Select, Space } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';

import styles from './modeler-share-modal-option-public-link.module.scss';
import { Process } from '@/lib/data/process-schema';

type ModelerShareModalOptionPublicLinkProps = {
  sharedAs: 'public' | 'protected';
  shareTimestamp: number;
  refresh: () => void;
  processVersions: Process['versions'];
};

const ModelerShareModalOptionPublicLink = ({
  sharedAs,
  shareTimestamp,
  refresh,
  processVersions,
}: ModelerShareModalOptionPublicLinkProps) => {
  const { processId } = useParams();
  const query = useSearchParams();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(query.get('version'));
  const environment = useEnvironment();

  const [shareLink, setShareLink] = useState('');
  const [registeredUsersonlyChecked, setRegisteredUsersonlyChecked] = useState(
    sharedAs === 'protected',
  );

  const { message } = App.useApp();

  const isShareLinkChecked = shareTimestamp > 0;
  const isShareLinkEmpty = shareLink.length === 0;

  useEffect(() => {
    const generateProcessShareUrlFromOldTimestamp = async () => {
      try {
        // generate an url with a token that contains the currently active sharing timestamp
        const url = await generateSharedViewerUrl(
          { processId, timestamp: shareTimestamp },
          selectedVersionId || undefined,
        );
        setShareLink(url);
      } catch (error) {
        console.error('Error while generating the url for sharing:', error);
      }
    };

    if (isShareLinkChecked) {
      generateProcessShareUrlFromOldTimestamp();
    }
    setRegisteredUsersonlyChecked(sharedAs === 'protected');
  }, [sharedAs, shareTimestamp, processId, selectedVersionId, isShareLinkChecked]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      message.success('Link Copied');
    } catch (err) {
      message.error('Error copying link');
    }
  };

  const handlePermissionChanged = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked as boolean;
    setRegisteredUsersonlyChecked(isChecked);
    if (isShareLinkChecked) {
      const sharedAsValue = isChecked ? 'protected' : 'public';
      await updateProcessGuestAccessRights(
        processId,
        {
          sharedAs: sharedAsValue,
        },
        environment.spaceId,
      );
    }
    refresh();
  };

  const handleShareLinkChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      try {
        const timestamp = Date.now();
        // generate an url containing a token with the newly generated timestamp
        const url = await generateSharedViewerUrl(
          { processId: processId, timestamp },
          // if there is a specific process version open in the modeler then link to that version (otherwise latest will be shown)
          selectedVersionId || undefined,
        );
        setShareLink(url);
        // activate sharing for that specific timestamp
        await updateProcessGuestAccessRights(
          processId,
          {
            sharedAs: 'public',
            shareTimestamp: timestamp,
          },
          environment.spaceId,
        );
        message.success('Process shared');
      } catch (err) {
        message.error('Failed to share the process.');
      }
    } else {
      // deactivate sharing
      try {
        await updateProcessGuestAccessRights(processId, { shareTimestamp: 0 }, environment.spaceId);
        setRegisteredUsersonlyChecked(false);
        setShareLink('');
        message.success('Process unshared');
      } catch (err) {
        message.error('Encountered an error while trying to stop sharing the process.');
      }
    }
    refresh();
  };

  const canvasRef = useRef<HTMLDivElement>(null);

  const getQRCodeBlob = async () => {
    try {
      const canvas = canvasRef.current?.querySelector<HTMLCanvasElement>('canvas');

      if (!canvas) {
        throw new Error('QR Code canvas not found');
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (!blob) {
        throw new Error('Failed to create PNG blob');
      }

      return blob;
    } catch (err) {
      throw new Error(`${err}`);
    }
  };

  const handleQRCodeAction = async (action: 'download' | 'copy') => {
    try {
      if (action === 'copy') {
        const item = new ClipboardItem({ 'image/png': getQRCodeBlob() });
        await navigator.clipboard.write([item]);
        message.success('QR Code copied as PNG');
      } else if (action === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await getQRCodeBlob());
        a.download = 'qrcode.png';
        a.click();
      } else {
        throw new Error('Invalid action specified');
      }
    } catch (err: any) {
      if (err instanceof ReferenceError) message.info(`ClipboardAPI not supported in your browser`);
      else message.error(`${err}`);
    }
  };

  const handleOpenSharedPage = async () => {
    if (shareTimestamp) {
      try {
        const url = await generateSharedViewerUrl(
          { processId, timestamp: shareTimestamp },
          selectedVersionId || undefined,
        );

        // open the documentation page in a new tab (unless it is already open in which case just show the tab)
        window.open(url, `${processId}-${selectedVersionId}-tab`);
      } catch (err) {
        message.error('Failed to open the documentation page.');
      }
    }
  };

  return (
    <Space direction="vertical">
      <Select
        defaultValue={selectedVersionId || '-1'}
        options={[
          { value: '-1', label: 'Latest Version' },
          ...processVersions.map((version) => ({ value: version.id, label: version.name })),
        ]}
        onChange={(value) => {
          setSelectedVersionId(value === '-1' ? null : value);
        }}
      />

      <div>
        <Checkbox checked={isShareLinkChecked} onChange={handleShareLinkChecked}>
          Share Process with Public Link
        </Checkbox>
      </div>
      <Row>
        <Col span={18} style={{ paddingBottom: '10px', paddingLeft: '25px' }}>
          <Flex vertical gap="small" justify="left" align="left">
            <Checkbox
              checked={registeredUsersonlyChecked}
              onChange={handlePermissionChanged}
              disabled={isShareLinkEmpty}
            >
              Visible only for registered user
            </Checkbox>
          </Flex>
        </Col>
        <Col span={18}>
          <Input
            type={'text'}
            value={shareLink}
            disabled={isShareLinkEmpty}
            name="generated share link"
            style={{ border: '1px solid #000' }}
          />
        </Col>
        <Col span={12}>
          <Flex
            vertical={false}
            style={{ paddingTop: '10px', flexWrap: 'wrap-reverse' }}
            justify="center"
            align="center"
          >
            {isShareLinkChecked && (
              <div id="qrcode" ref={canvasRef}>
                <QRCode
                  style={{
                    border: '1px solid #000',
                  }}
                  value={shareLink}
                  size={130}
                />
              </div>
            )}
          </Flex>
        </Col>
        <Col span={6} style={{ paddingTop: '10px' }}>
          <Flex vertical gap={10}>
            <Button
              className={styles.OptionButton}
              onClick={handleCopyLink}
              disabled={isShareLinkEmpty}
            >
              Copy link
            </Button>
            <Button
              className={styles.OptionButton}
              onClick={handleOpenSharedPage}
              disabled={isShareLinkEmpty}
            >
              Open
            </Button>
            <Button
              icon={<DownloadOutlined />}
              title="Save as PNG"
              className={styles.OptionButton}
              hidden={isShareLinkEmpty}
              onClick={() => handleQRCodeAction('download')}
              disabled={isShareLinkEmpty}
            >
              Save QR Code
            </Button>
            <Button
              icon={<CopyOutlined />}
              title="Copy as PNG"
              className={styles.OptionButton}
              hidden={isShareLinkEmpty}
              onClick={() => handleQRCodeAction('copy')}
              disabled={isShareLinkEmpty}
            >
              Copy QR Code
            </Button>
          </Flex>
        </Col>
      </Row>
    </Space>
  );
};

export default ModelerShareModalOptionPublicLink;
