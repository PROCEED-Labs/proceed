import { Space } from 'antd';
import Content from '@/components/content';
import { FC } from 'react';
import Plugins from '@/components/plugins/plugins';

const PluginsPage: FC = () => {
  return (
    <Content title="Plugins">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Plugins />
      </Space>
    </Content>
  );
};

export default PluginsPage;
