import Content from '@/components/content';
import { env } from 'process';
import FeatureFlags from 'FeatureFlags';
import CompentencesContainer from './competences-container';
import CompetencesTable from './competences-table';
import CompetencesViewer from './competences-viewer';

const CompetencesPage = async ({
  params: { environmentId },
}: {
  params: { environmentId: string };
}) => {
  return (
    <Content title="Competences">
      <CompentencesContainer></CompentencesContainer>
    </Content>
  );
};

export default CompetencesPage;
