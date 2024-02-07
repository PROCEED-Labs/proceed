import Content from '@/components/content';
import { Space, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const Loading = () => {
  return (
    <Content>
      <Space
        direction="vertical"
        size="large"
        style={{ display: 'flex', textAlign: 'center', marginTop: '2rem' }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </Space>
    </Content>
  );
};

export default Loading;
