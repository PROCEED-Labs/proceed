import { getCurrentEnvironment } from '@/components/auth';
import { ProcessViewProvider } from './[processId]/process-view-context';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';

export default async function ModeLayout(props: {
  children: React.ReactNode;
  params: Promise<{ environmentId: string; mode: string }>;
}) {
  const params = await props.params;
  const { ability } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('view', 'Process')) {
    throw new UnauthorizedError();
  }

  if (params.mode === 'editor' && !ability.can('manage', 'Process')) {
    throw new UnauthorizedError();
  }

  return <ProcessViewProvider mode={params.mode}>{props.children}</ProcessViewProvider>;
}
