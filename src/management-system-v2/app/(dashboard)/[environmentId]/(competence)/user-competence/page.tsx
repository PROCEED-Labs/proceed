import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { env } from '@/lib/ms-config/env-vars';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import UserCompetenceManager from '@/components/competence/user-competences/user-competence-manager';
import { getAllCompetencesOfUser } from '@/lib/data/db/competence';
import UnauthorizedFallback from '@/components/unauthorized-fallback';

const UserCompetencePage = async () => {
  const { user, userId } = await getCurrentUser();

  if (user?.isGuest) return <UnauthorizedFallback />;

  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();
  
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_COMPETENCE_MATCHING_ACTIVE) return notFound();

  // Fetch user's competences
  const userCompetences = await getAllCompetencesOfUser(userId);

  return (
    <Content title="My Competences">
      <UserCompetenceManager initialUserCompetences={userCompetences} userId={userId} />
    </Content>
  );
};

export default UserCompetencePage;
