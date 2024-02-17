import { Button, Checkbox, Col, Flex, Input, message, QRCode, Row, Typography } from 'antd';
import { DownloadOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  generateProcessShareToken,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';

type ModelerShareModalOptionPublicLinkProps = {
  shared: boolean;
  sharedAs: 'public' | 'protected';
  shareToken: string;
  refresh: () => void;
};

const ModelerShareModalOptionPublicLink = ({
  shared,
  sharedAs,
  shareToken,
  refresh,
}: ModelerShareModalOptionPublicLinkProps) => {
  const { processId } = useParams();
  const [token, setToken] = useState<String | null>(null);
  const [isShareLinkChecked, setIsShareLinkChecked] = useState(shared);
  const [registeredUsersonlyChecked, setRegisteredUsersonlyChecked] = useState(
    sharedAs === 'protected',
  );

  const publicLinkValue = `${window.location.origin}/shared-viewer?token=${token}`;

  useEffect(() => {
    setIsShareLinkChecked(shared);
    if (shared) {
      setToken(shareToken);
    }
    setRegisteredUsersonlyChecked(sharedAs === 'protected' ? true : false);
  }, [shared, sharedAs, shareToken]);

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
      await updateProcessGuestAccessRights(processId, {
        shared: true,
        sharedAs: sharedAsValue,
      });
    }
    refresh();
  };

  const handleShareLinkChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;

    setIsShareLinkChecked(isChecked);

    if (isChecked) {
      const { token } = await generateProcessShareToken({ processId: processId });
      setToken(token);

      await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shared: false });
      setRegisteredUsersonlyChecked(false);
      message.success('Process unshared');
    }
    refresh();
  };

  const handleQRCodeAction = async (action: 'download' | 'copy') => {
    try {
      const canvas = document.getElementById('qrcode')?.querySelector<HTMLCanvasElement>('canvas');

      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );

        if (blob) {
          if (action === 'copy') {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            message.success('QR Code copied as PNG');
          } else if (action === 'download') {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'qrcode.png';
            a.click();
          } else {
            throw new Error('Invalid action specified');
          }
        } else {
          throw new Error('Failed to create PNG blob');
        }
      } else {
        throw new Error('QR Code canvas not found');
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
      {isShareLinkChecked && !token ? (
        <Flex justify="center">
          <LoadingOutlined style={{ fontSize: '40px' }} />
        </Flex>
      ) : (
        <div>
          <Row>
            <Col span={18} style={{ paddingBottom: '10px', paddingLeft: '25px' }}>
              <Flex vertical gap="small" justify="left" align="left">
                <Checkbox
                  checked={registeredUsersonlyChecked}
                  onChange={handlePermissionChanged}
                  disabled={!isShareLinkChecked}
                >
                  Visible only for registered user
                </Checkbox>
              </Flex>
            </Col>
            <Col span={18}>
              <Input
                type={'text'}
                value={publicLinkValue}
                disabled={!isShareLinkChecked}
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
                  <div id="qrcode">
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
                  disabled={!isShareLinkChecked}
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
                  hidden={!isShareLinkChecked}
                  onClick={() => handleQRCodeAction('download')}
                  disabled={!isShareLinkChecked}
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
                  hidden={!isShareLinkChecked}
                  onClick={() => handleQRCodeAction('copy')}
                  disabled={!isShareLinkChecked}
                >
                  Copy QR Code
                </Button>
              </Flex>
            </Col>
          </Row>
        </div>
      )}
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
