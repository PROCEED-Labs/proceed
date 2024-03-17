import Processes from '@/components/processes';
import Content from '@/components/content';
import { Space } from 'antd';
import { getProcesses } from '@/lib/data/legacy/process';
import { getCurrentEnvironment } from '@/components/auth';
// This is a workaround to enable the Server Actions in that file to return any
// client components. This is not possible with the current nextjs compiler
// otherwise. It might be possible in the future with turbopack without this
// import.
import '@/lib/data/processes';
import { getUsersFavourites } from '@/lib/data/users';

const ProcessesPage = async ({ params }: { params: { environmentId: string } }) => {
  const { ability } = await getCurrentEnvironment(params.environmentId);

  const processes = await getProcesses(ability);
  const favs = await getUsersFavourites();

  return (
    <Content title="Processes">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Processes processes={processes} favourites={favs} />
      </Space>
    </Content>
  );
};

export default ProcessesPage;
