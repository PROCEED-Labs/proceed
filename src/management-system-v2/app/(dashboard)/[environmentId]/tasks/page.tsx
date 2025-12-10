import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { Result, Space } from 'antd';
import { notFound } from 'next/navigation';
import FormList from './form-list';
import { getHtmlForms } from '@/lib/data/html-forms';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const FormsPage = async ({ params }: { params: { environmentId: string } }) => {
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const {
    activeEnvironment: { spaceId },
  } = currentSpace.value;

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');
  if (automationSettings.isErr()) {
    return errorResponse(automationSettings);
  }

  if (
    automationSettings.value.active === false ||
    automationSettings.value.tasklist?.active === false
  ) {
    return notFound();
  }

  const htmlForms = await getHtmlForms(spaceId);

  if ('error' in htmlForms) {
    return (
      <Content title="Forms">
        <Result status="404" title={htmlForms.error.message} />
      </Content>
    );
  }

  return (
    <Content title="Forms">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <FormList data={htmlForms} />
      </Space>
    </Content>
  );
};

export default FormsPage;
