import Processes from '@/components/processes';
import ProjectStats from './project-stats';
import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Projects = async ({ params }: { params: { environmentId: string } }) => {
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability } = currentSpace.value;
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
