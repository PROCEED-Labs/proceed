import { Button, Checkbox, Flex, Input, message, QRCode, Space } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';

const ModelerShareModalOptionPublicLink = () => {
  const pathname = usePathname();

  const [showPass, setShowPass] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [publicLinkValue, setPublicLinkValue] = useState(`http://localhost:3000${pathname}`);

  const password = useRef(null);

  const handleEyeClick = () => {
    if (password.current) {
      password.current.input.type = showPass ? 'text' : 'password';
    }
    setShowPass(!showPass);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicLinkValue);
      message.success('Link Copied');
    } catch (err) {
      console.error(err);
      message.error('Error copying link');
    }
  };

  const handleLinkChange = (e) => {
    setPublicLinkValue(e.target.value);
  };

  const handleCopyQRCodeAsPNG = async () => {
    try {
      const canvas = document.getElementById('qrcode')?.querySelector<HTMLCanvasElement>('canvas');

      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );

        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

          message.success('QR Code copied as PNG');
        } else {
          throw new Error('Failed to create PNG blob');
        }
      } else {
        throw new Error('QR Code canvas not found');
      }
    } catch (err) {
      console.error(err);
      message.error('Error copying QR Code');
    }
  };

  return (
    <>
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
          onClick={handleCopy}
        >
          Copy
        </Button>
      </Flex>

      <Flex vertical={false}>
        <Flex vertical gap="middle" style={{ flexGrow: '0.40' }}>
          <Checkbox>Allow Editing</Checkbox>
          <Checkbox>Allow Editing only as registered User</Checkbox>
          <Checkbox onChange={(e) => setIsPasswordProtected(e.target.checked)}>
            Password Protected
          </Checkbox>
          {isPasswordProtected && (
            <Space>
              <Input type={showPass ? 'password' : 'text'} ref={password} width={10} />
              {showPass ? (
                <EyeInvisibleOutlined onClick={handleEyeClick} />
              ) : (
                <EyeOutlined onClick={handleEyeClick} />
              )}
            </Space>
          )}
        </Flex>
        <div id="qrcode" onClick={handleCopyQRCodeAsPNG}>
          <QRCode value={publicLinkValue} bgColor="#fff" />
        </div>
      </Flex>
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
