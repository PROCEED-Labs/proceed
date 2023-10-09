import Processes from '@/components/processes';
import { FC } from 'react';
import ProjectStats from './project-stats';
import Content from '@/components/content';
import Auth from '@/lib/AuthCanWrapper';
import { Space } from 'antd';

const Projects: FC = () => {
  return (
    <Content title="Projects">
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <ProjectStats />
        <Processes />
      </Space>
    </Content>
  );
};

export default Auth({ action: 'view', resource: 'Project', fallbackRedirect: '/' }, Projects);
