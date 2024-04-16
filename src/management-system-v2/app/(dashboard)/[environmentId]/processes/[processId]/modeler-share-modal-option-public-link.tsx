import { App, Button, Checkbox, Col, Flex, Input, QRCode, Row } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  generateProcessShareToken,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';

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
  const environment = useEnvironment();

  const [token, setToken] = useState<String>('');
  const [registeredUsersonlyChecked, setRegisteredUsersonlyChecked] = useState(
    sharedAs === 'protected',
  );

  const publicLinkValue = `${window.location.origin}/shared-viewer?token=${token}`;
  const isTokenEmpty = token.length === 0;
  const isShareLinkChecked = shareTimestamp > 0;

  const { message } = App.useApp();

  useEffect(() => {
    const generateProcessShareTokenFromOldTimestamp = async () => {
      try {
        const { token: shareToken } = await generateProcessShareToken(
          { processId },
          environment.spaceId,
          shareTimestamp,
        );
        setToken(shareToken);
      } catch (error) {
        console.error('Error while generating process share token:', error);
      }
    };
    if (isShareLinkChecked) {
      generateProcessShareTokenFromOldTimestamp();
    }
    setRegisteredUsersonlyChecked(sharedAs === 'protected');
  }, [sharedAs, shareTimestamp, processId, environment.spaceId, isShareLinkChecked]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLinkValue);
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
      const { token } = await generateProcessShareToken(
        { processId: processId },
        environment.spaceId,
      );
      setToken(token);

      await updateProcessGuestAccessRights(processId, { sharedAs: 'public' }, environment.spaceId);
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shareTimestamp: 0 }, environment.spaceId);
      setRegisteredUsersonlyChecked(false);
      setToken('');
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
    } catch (err) {
      message.error(`${err}`);
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
                disabled={isTokenEmpty}
              >
                Visible only for registered user
              </Checkbox>
            </Flex>
          </Col>
          <Col span={18}>
            <Input
              type={'text'}
              value={publicLinkValue}
              disabled={isTokenEmpty}
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
                    value={publicLinkValue}
                    size={130}
                  />
                </div>
              )}
            </Flex>
          </Col>
          <Col span={6} style={{ paddingTop: '10px' }}>
            <Flex vertical gap={10}>
              <Button
                style={{
                  marginLeft: '10px',
                  border: '1px solid black',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  textOverflow: 'ellipsis',
                }}
                onClick={handleCopyLink}
                disabled={isTokenEmpty}
              >
                Copy link
              </Button>
              <Button
                icon={<DownloadOutlined />}
                title="Save as PNG"
                style={{
                  marginLeft: '10px',
                  border: '1px solid black',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  textOverflow: 'ellipsis',
                }}
                hidden={isTokenEmpty}
                onClick={() => handleQRCodeAction('download')}
                disabled={isTokenEmpty}
              >
                Save QR Code
              </Button>
              <Button
                icon={<CopyOutlined />}
                title="Copy as PNG"
                style={{
                  marginLeft: '10px',
                  border: '1px solid black',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  textOverflow: 'ellipsis',
                }}
                hidden={isTokenEmpty}
                onClick={() => handleQRCodeAction('copy')}
                disabled={isTokenEmpty}
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
