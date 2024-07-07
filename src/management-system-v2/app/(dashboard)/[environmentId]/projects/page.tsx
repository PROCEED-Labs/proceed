import Processes from '@/components/processes';
import ProjectStats from './project-stats';
import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';

const Projects = async ({ params }: { params: { environmentId: string } }) => {
  const { ability } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('view', 'Setting')) return redirect('/');

  return (
    <Content title="Projects">
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <ProjectStats />
        <Processes
          processes={[]}
          folder={{
            id: '',
            name: '',
            parentId: '',
            createdOn: new Date(),
            createdBy: '',
            lastEditedOn: new Date(),
            environmentId: '',
          }}
        />
      </Space>
    </Content>
  );
};

export default Projects;
