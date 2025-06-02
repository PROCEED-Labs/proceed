import Content from '@/components/content';
import { env } from 'process';
import FeatureFlags from 'FeatureFlags';
import CompentencesContainer from '@/components/competences/competences-container';
import CompetencesTable from '@/components/competences/competences-table';
import CompetencesViewer from '@/components/competences/competences-viewer';
import { getAllCompetencesOfUser, getAllSpaceCompetences } from '@/lib/data/competences';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { CompetenceTypes } from '@/lib/data/competence-schema';
import type { CompetenceType } from '@/lib/data/competence-schema';

const CompetencesPage = async ({
  params: { environmentId },
}: {
  params: { environmentId: string };
}) => {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;
  const { userId } = await getCurrentUser();

  const spaceCompetences = await getAllSpaceCompetences(environmentId);
  const userCompetences = await getAllCompetencesOfUser(environmentId);

  return (
    <Content title="Competences">
      <CompentencesContainer
        competences={spaceCompetences}
        environmentId={spaceId}
      ></CompentencesContainer>
    </Content>
  );
};

export default CompetencesPage;
