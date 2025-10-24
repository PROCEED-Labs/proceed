'use client';

import { useState } from 'react';
import { Card, Tabs, Typography, Space } from 'antd';
import { TrophyOutlined, AppstoreOutlined, CheckSquareOutlined } from '@ant-design/icons';
import UserCompetencesList from './user-competences-list';
import SpaceCompetencesClaim from './space-competences-claim';

const { Title } = Typography;

type UserCompetence = {
  competenceId: string;
  userId: string;
  proficiency: string | null;
  qualificationDate: Date | null;
  lastUsage: Date | null;
  competence: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    spaceId: string | null;
    creatorUserId: string | null;
    externalQualificationNeeded: boolean;
    renewalTimeInterval: number | null;
  };
};

type UserCompetenceManagerProps = {
  initialUserCompetences: UserCompetence[];
  userId: string;
};

const UserCompetenceManager: React.FC<UserCompetenceManagerProps> = ({
  initialUserCompetences,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState('my-competences');

  const items = [
    {
      key: 'my-competences',
      label: (
        <span>
          <TrophyOutlined /> My Competences
        </span>
      ),
      children: (
        <UserCompetencesList initialUserCompetences={initialUserCompetences} userId={userId} />
      ),
    },
    {
      key: 'claim-competences',
      label: (
        <span>
          <CheckSquareOutlined /> Claim Space Competences
        </span>
      ),
      children: <SpaceCompetencesClaim userId={userId} />,
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card>
        <Title level={4}>Competence Management</Title>
        <Typography.Paragraph type="secondary">
          Manage your personal competences and claim competences from your spaces. Competences are
          used for task assignment and resource matching.
        </Typography.Paragraph>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </Space>
  );
};

export default UserCompetenceManager;
