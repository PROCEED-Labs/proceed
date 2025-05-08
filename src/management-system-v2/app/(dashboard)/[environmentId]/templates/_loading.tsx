import Content from '@/components/content';
import { Skeleton, Space } from 'antd';

const TemplatesSkeleton = () => {
  return (
    <Content title="Templates">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Skeleton active />
      </Space>
    </Content>
  );
};

export default TemplatesSkeleton;
