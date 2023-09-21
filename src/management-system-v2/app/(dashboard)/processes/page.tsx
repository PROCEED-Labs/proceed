import { FC } from 'react';
import Processes from '@/components/processes';
import Content from '@/components/content';
import Space from '@/components/_space';
import HeaderActions from './header-actions';

const ProcessesPage: FC = () => {
  return (
    <Content title="Processes" rightNode={<HeaderActions />}>
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Processes />
      </Space>
    </Content>
  );
};

export default ProcessesPage;
