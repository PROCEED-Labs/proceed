import Content from '@/components/content';
import SettingsPage from '../settings/settings-page';
import { getCurrentEnvironment } from '@/components/auth';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { err } from 'neverthrow';

export default async function Layout({
  params,
  ...children
}: {
  params: Promise<{ environmentId: string }>;
}) {
  const currentSpace = await getCurrentEnvironment((await params).environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;
  if (
    !activeEnvironment.isOrganization ||
    (!ability.can('update', 'Environment') && !ability.can('delete', 'Environment'))
  ) {
    return errorResponse(err(new UnauthorizedError()));
  }

  return (
    <Content title="Management">
      <SettingsPage {...children} />
    </Content>
  );
}
