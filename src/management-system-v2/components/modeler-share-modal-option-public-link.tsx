import { Button, Checkbox, Col, Flex, Input, message, QRCode, Row, Typography } from 'antd';
import { DownloadOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
import { SetStateAction, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const ModelerShareModalOptionPublicLink = () => {
  const { processId } = useParams();
  const [token, setToken] = useState(null);
  const [isShareLinkChecked, setIsShareLinkChecked] = useState(false);
  const [onlyAsRegisteredUser, setOnlyAsRegisteredUser] = useState(false);
  const [publicLinkValue, setPublicLinkValue] = useState(
    `${window.location.origin}/shared-viewer?token=`,
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLinkValue);
      message.success('Link Copied');
    } catch (err) {
      message.error('Error copying link');
    }
  };

  const generateToken = async () => {
    try {
      const response = await fetch('/api/share/generate-share-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registeredUsersOnly: onlyAsRegisteredUser,
          processId: processId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const { token } = await response.json();
      message.success('Token generated successfully');
      setToken(token);
      setPublicLinkValue(`${window.location.origin}/shared-viewer?token=${token}`);
    } catch (error) {
      message.error('Error generating token');
    }
  };

  useEffect(() => {
    if (isShareLinkChecked) generateToken();
  }, [onlyAsRegisteredUser, isShareLinkChecked]);

  const handlePermissionChanged = (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    setOnlyAsRegisteredUser(e.target.checked);
  };

  const handleShareLinkChecked = (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    setIsShareLinkChecked(e.target.checked);
  };

  const handleLinkChange = (e: { target: { value: SetStateAction<string> } }) => {
    setPublicLinkValue(e.target.value);
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
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
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
      console.error(err);
      message.error(`Error ${action === 'copy' ? 'copying' : 'downloading'} QR Code`);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '5px' }}>
        <Checkbox onChange={handleShareLinkChecked}>Share Process with Public Link</Checkbox>
      </div>
      {isShareLinkChecked && !token ? (
        <Flex justify="center">
          <LoadingOutlined style={{ fontSize: '40px' }} />
        </Flex>
      ) : (
        <div style={{ padding: '10px' }}>
          <Row>
            <Col span={18}>
              <Input
                type={'text'}
                value={publicLinkValue}
                disabled={!isShareLinkChecked}
                style={{ border: '1px solid #000' }}
                onChange={handleLinkChange}
              />
              <Flex
                vertical={false}
                style={{ paddingTop: '10px', flexWrap: 'wrap-reverse' }}
                justify="space-between"
                align="start"
              >
                <Flex vertical gap="small">
                  <Typography.Text strong>Permissions</Typography.Text>
                  <Checkbox onChange={handlePermissionChanged} disabled={!isShareLinkChecked}>
                    Visible only as registered user
                  </Checkbox>
                </Flex>
                {isShareLinkChecked && (
                  <div id="qrcode">
                    <QRCode
                      style={{
                        border: '1px solid #000',
                      }}
                      value={publicLinkValue}
                      size={140}
                    />
                  </div>
                )}
              </Flex>
            </Col>
            <Col span={6}>
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
