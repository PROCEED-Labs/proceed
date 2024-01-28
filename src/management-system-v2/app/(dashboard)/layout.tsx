import { FC, PropsWithChildren } from 'react';
import Layout from '@/components/layout';
import { getUserRules } from '@/lib/authorization/authorization';
import { getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';

const DashboardLayout: FC<PropsWithChildren> = async ({ children }) => {
  const { session, activeEnvironment } = await getCurrentUser();
  const userRules = await getUserRules(session?.user.id ?? '', activeEnvironment);

  return (
    <>
      <SetAbility rules={userRules} environmentId={activeEnvironment} />
      <Layout>{children}</Layout>
    </>
  );
};

export default DashboardLayout;
