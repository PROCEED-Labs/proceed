import Content from '@/components/content';
import { env } from 'process';
import FeatureFlags from 'FeatureFlags';
import CompentencesContainer from './competences-container';
import CompetencesTable from './competences-table';
import CompetencesViewer from './competences-viewer';
import { addCompetence, deleteAllCompetences, getAllCompetences } from '@/lib/data/db/competence';
import { getCurrentEnvironment } from '@/components/auth';
import { CompetenceAttributeTypes as attType, Competence } from '@/lib/data/competence-schema';

const CompetencesPage = async ({
  params: { environmentId },
}: {
  params: { environmentId: string };
}) => {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);

  const competences = await getAllCompetences(activeEnvironment.spaceId);

  console.log('competences', JSON.stringify(competences));

  return (
    <Content title="Competences">
      <CompentencesContainer competences={competences}></CompentencesContainer>
    </Content>
  );
};

export default CompetencesPage;
