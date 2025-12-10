import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getHtmlForm } from '@/lib/data/html-forms';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { Result } from 'antd';
import { notFound } from 'next/navigation';
import FormView from './form-view';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const FormPage = async ({ params }: { params: { environmentId: string; formId: string } }) => {
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

  const htmlForm = await getHtmlForm(params.formId);

  if ('error' in htmlForm) {
    return (
      <Content title="Form">
        <Result status="404" title={htmlForm.error.message} />
      </Content>
    );
  }

  return <FormView data={htmlForm} />;
};

export default FormPage;
