import { Button, Checkbox, Flex, Input, Space } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

const ModelerShareModalOptionPublicLink = () => {
  const [showPass, setShowPass] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);

  const publicLink = useRef(null);
  const password = useRef(null);

  const handleEyeClick = () => {
    if (password.current) {
      password.current.input.type = showPass ? 'text' : 'password';
    }
    setShowPass(!showPass);
  };

  const handleCopy = async () => {
    try {
      const link = publicLink.current?.input.value;
      await navigator.clipboard.writeText(link);
      console.log('Link Copied');
    } catch (err) {
      console.error(err);
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
        <Input type={'text'} value={'http://localhost:3000'} bordered ref={publicLink} />
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
      <Flex vertical gap={10}>
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
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
