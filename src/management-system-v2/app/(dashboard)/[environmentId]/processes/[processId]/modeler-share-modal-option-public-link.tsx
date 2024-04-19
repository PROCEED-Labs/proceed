'use client';
import { App, Button, Checkbox, Col, Flex, Input, QRCode, Row } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';

import styles from './modeler-share-modal-option-public-link.module.scss';

type ModelerShareModalOptionPublicLinkProps = {
  sharedAs: 'public' | 'protected';
  shareTimestamp: number;
  refresh: () => void;
};

const ModelerShareModalOptionPublicLink = ({
  sharedAs,
  shareTimestamp,
  refresh,
}: ModelerShareModalOptionPublicLinkProps) => {
  const { processId } = useParams();
  const query = useSearchParams();
  const selectedVersionId = query.get('version');
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
      const timestamp = Date.now();
      const url = await generateSharedViewerUrl(
        { processId: processId, timestamp },
        selectedVersionId || undefined,
      );
      setShareLink(url);
      await updateProcessGuestAccessRights(
        processId,
        {
          sharedAs: 'public',
          shareTimestamp: timestamp,
        },
        environment.spaceId,
      );
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shareTimestamp: 0 }, environment.spaceId);
      setRegisteredUsersonlyChecked(false);
      setShareLink('');
      message.success('Process unshared');
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
      const url = await generateSharedViewerUrl(
        { processId, timestamp: shareTimestamp },
        selectedVersionId || undefined,
      );

      // open the documentation page in a new tab
      window.open(url, `${processId}-${selectedVersionId}-tab`);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '5px' }}>
        <Checkbox checked={isShareLinkChecked} onChange={handleShareLinkChecked}>
          Share Process with Public Link
        </Checkbox>
      </div>
      <div>
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
      </div>
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
