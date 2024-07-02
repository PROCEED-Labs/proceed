import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const getAddButton = (label: string) => {
  return (
    <Button>
      <Space>
        {label}
        <PlusOutlined
          style={{
            margin: '0 0 0 6px',
          }}
        />
      </Space>
    </Button>
  );
};

export default getAddButton;
