'use client';

import { Tabs } from 'antd';
import { TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import SpaceCompetencesManagement from './space-competences-management';
import UserCompetencesOverview from './user-competences-overview';
import { SpaceCompetence } from '@/lib/data/competence-schema';
import { User } from '@/lib/data/user-schema';

type CompetencesDashboardProps = {
  spaceId: string;
  initialSpaceCompetences: SpaceCompetence[];
  organizationMembers: User[];
  currentUserId: string;
};

const CompetencesDashboard: React.FC<CompetencesDashboardProps> = ({
  spaceId,
  initialSpaceCompetences,
  organizationMembers,
  currentUserId,
}) => {
  const items = [
    {
      key: 'space-competences',
      label: (
        <span>
          <TrophyOutlined />
          Space Competences
        </span>
      ),
      children: (
        <SpaceCompetencesManagement
          spaceId={spaceId}
          initialCompetences={initialSpaceCompetences}
          currentUserId={currentUserId}
        />
      ),
    },
    {
      key: 'user-competences',
      label: (
        <span>
          <TeamOutlined />
          User Competences
        </span>
      ),
      children: (
        <UserCompetencesOverview spaceId={spaceId} organizationMembers={organizationMembers} />
      ),
    },
  ];

  return <Tabs defaultActiveKey="space-competences" items={items} size="large" />;
};

export default CompetencesDashboard;
