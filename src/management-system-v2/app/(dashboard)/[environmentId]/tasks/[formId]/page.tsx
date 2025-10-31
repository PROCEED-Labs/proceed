import { getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { getHtmlForm } from '@/lib/data/html-forms';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { Result } from 'antd';
import { notFound } from 'next/navigation';
import FormView from './form-view';

const FormPage = async (props: { params: Promise<{ environmentId: string; formId: string }> }) => {
  const params = await props.params;
  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');

  if (automationSettings.active === false || automationSettings.tasklist?.active === false) {
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
