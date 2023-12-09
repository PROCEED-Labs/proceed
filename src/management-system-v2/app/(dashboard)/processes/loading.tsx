import Content from '@/components/content';
import { Skeleton, Space } from 'antd';

const ProcessesSkeleton = async () => {
  return (
    <Content title="Processes">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Skeleton active />
      </Space>
    </Content>
  );
};

export default ProcessesSkeleton;
