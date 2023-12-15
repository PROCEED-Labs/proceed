import { Button, Checkbox, Flex, Input, message, QRCode, Space, Typography } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { SetStateAction, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
const { Password } = Input;

const ModelerShareModalOptionPublicLink = () => {
  const pathname = usePathname();
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [publicLinkValue, setPublicLinkValue] = useState(`${window.location.origin}${pathname}`);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLinkValue);
      message.success('Link Copied');
    } catch (err) {
      console.error(err);
      message.error('Error copying link');
    }
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
        <Checkbox>Share Link</Checkbox>
      </div>

      <Flex
        vertical={false}
        style={{
          marginBottom: '40px',
        }}
      >
        <Input
          type={'text'}
          value={publicLinkValue}
          contentEditable={true}
          bordered
          onChange={handleLinkChange}
        />
        <Button
          style={{
            marginLeft: '10px',
            border: '1px solid black',
            borderRadius: '50px',
          }}
          onClick={handleCopyLink}
        >
          Copy link
        </Button>
      </Flex>

      <Flex vertical={false}>
        <Flex vertical gap="middle" style={{ flexGrow: '0.75' }}>
          <Typography.Text strong>Permissions</Typography.Text>
          <Checkbox>Allow Editing</Checkbox>
          <Checkbox>Allow Editing only as registered User</Checkbox>
          <Checkbox onChange={(e) => setIsPasswordProtected(e.target.checked)}>
            Password Protected
          </Checkbox>
          {isPasswordProtected && (
            <Space>
              <Password visibilityToggle={true} width={10} />
            </Space>
          )}
        </Flex>
        <div id="qrcode" style={{ display: 'flex', flexDirection: 'row-reverse' }}>
          <Flex vertical>
            <Button
              icon={<DownloadOutlined />}
              title="Save as PNG"
              onClick={() => handleQRCodeAction('download')}
            />
            <Button
              icon={<CopyOutlined />}
              title="Copy as PNG"
              onClick={() => handleQRCodeAction('copy')}
            />
          </Flex>

          <QRCode value={publicLinkValue} bgColor="#fff" />
        </div>
      </Flex>
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
