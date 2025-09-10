import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getHtmlForm } from '@/lib/data/html-forms';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { Result } from 'antd';
import { notFound } from 'next/navigation';
import FormView from './form-view';

const FormPage = async ({ params }: { params: { environmentId: string; formId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    return notFound();
  }

  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');

  if (automationSettings.active === false || automationSettings.tasklist?.active === false) {
    return notFound();
  }

  const htmlForm = await getHtmlForm(params.formId, true);

  if ('error' in htmlForm) {
    return (
      <Content title="Form">
        <Result status="404" title="Could not load task list data" />
      </Content>
    );
  }

  return <FormView data={htmlForm} />;
};

export default FormPage;
