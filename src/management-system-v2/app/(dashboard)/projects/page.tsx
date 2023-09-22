import Processes from '@/components/processes';
import { FC } from 'react';
import ProjectStats from './project-stats';
import Space from '@/components/_space';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import Auth from '@/lib/AuthCanWrapper';

const Projects: FC = () => {
  return (
    <Content title="Projects" rightNode={<HeaderActions />}>
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <ProjectStats />
        <Processes />
      </Space>
    </Content>
  );
};

export default Auth({ action: 'view', resource: 'Project', fallbackRedirect: '/' }, Projects);
