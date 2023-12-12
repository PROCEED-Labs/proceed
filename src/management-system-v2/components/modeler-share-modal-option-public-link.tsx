import { Button, Checkbox, Flex, Input, Space } from 'antd';

const ModelerShareModalOptionPublicLink = () => {
  return (
    <>
      <Flex
        vertical={false}
        style={{
          marginBottom: '40px',
        }}
      >
        <Input bordered />
        <Button
          style={{
            marginLeft: '10px',
            border: '1px solid black',
            borderRadius: '50px',
          }}
        >
          Copy
        </Button>
      </Flex>
      <Flex vertical gap={10}>
        <Checkbox>Allow Editing</Checkbox>
        <Checkbox>Allow Editing only as registerd User</Checkbox>
        <Space>
          <Checkbox>Password Protected</Checkbox> <Input type="password" width={10} />
        </Space>
      </Flex>
    </>
  );
};

export default ModelerShareModalOptionPublicLink;
