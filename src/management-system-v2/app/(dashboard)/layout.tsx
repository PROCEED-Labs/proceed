import { FC, PropsWithChildren } from 'react';
import Layout from '@/components/layout';
import { getUserRules } from '@/lib/authorization/authorization';
import { getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';

const DashboardLayout: FC<PropsWithChildren> = async ({ children }) => {
  const { session } = await getCurrentUser();
  const userRules = await getUserRules(session?.user.id ?? '');

  return (
    <>
      <SetAbility rules={userRules} />
      <Layout>{children}</Layout>
    </>
  );
};

export default DashboardLayout;
