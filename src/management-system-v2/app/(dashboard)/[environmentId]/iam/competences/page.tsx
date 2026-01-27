import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import Content from '@/components/content';
import { notFound } from 'next/navigation';
import { env } from '@/lib/ms-config/env-vars';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import CompetencesDashboard from '@/components/competence/organization/competences-dashboard';
import { getAllSpaceCompetences } from '@/lib/data/db/competence';
import { getUsersInSpace } from '@/lib/data/db/iam/memberships';
import { User } from '@/lib/data/user-schema';

const OrganizationCompetencesPage = async ({ params }: { params: { environmentId: string } }) => {
  const { user, userId } = await getCurrentUser();
  const { activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (user?.isGuest) return <UnauthorizedFallback />;

  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();

  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_COMPETENCE_MATCHING_ACTIVE) return notFound();

  // Only show for organization spaces
  if (!activeEnvironment.isOrganization) return notFound();

  // TODO: Add authorization check - can('view', 'Competence') or can('manage', 'User')

  // Fetch organization data
  const spaceCompetences = await getAllSpaceCompetences(activeEnvironment.spaceId);
  const organizationMembers = (await getUsersInSpace(activeEnvironment.spaceId)) as User[];

  return (
    <Content title="Organization Competences">
      <CompetencesDashboard
        spaceId={activeEnvironment.spaceId}
        initialSpaceCompetences={spaceCompetences}
        organizationMembers={organizationMembers}
        currentUserId={userId}
      />
    </Content>
  );
};

export default OrganizationCompetencesPage;
