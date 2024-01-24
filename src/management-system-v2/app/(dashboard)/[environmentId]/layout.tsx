import { FC, PropsWithChildren } from 'react';
import { getUserRules } from '@/lib/authorization/authorization';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';
import { isMember } from '@/lib/data/legacy/iam/memberships';
import { redirect } from 'next/navigation';

const DashboardLayout: FC<PropsWithChildren<{ params: { environmentId: string } }>> = async ({
  children,
}) => {
  const { userId } = await getCurrentUser();
  const { activeEnvironment } = await getCurrentEnvironment();
  const userRules = await getUserRules(userId, activeEnvironment);

  if (!isMember(userId, activeEnvironment) && userId != activeEnvironment) {
    redirect(`/${activeEnvironment}/processes`);
  }

  return (
    <>
      <SetAbility rules={userRules} environmentId={activeEnvironment} />
      {children}
    </>
  );
};

export default DashboardLayout;
