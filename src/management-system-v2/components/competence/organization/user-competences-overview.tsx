'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserCompetences } from '@/lib/competence/useUserCompetences';
import { Row, Col, Card, Typography, Empty, Space } from 'antd';
import UserListSelector from './user-list-selector';
import { User } from '@/lib/data/user-schema';
import { getUserCompetences } from '../actions/organization-competence-actions';
import UserCompetencesDisplay from './user-competences-display';
import ProceedLoadingIndicator from '@/components/loading-proceed';

const { Title } = Typography;

function getUserDisplayName(user: User): string {
  if (user.isGuest) return 'Guest User';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id;
}

type UserCompetencesOverviewProps = {
  spaceId: string;
  organizationMembers: User[];
};

const UserCompetencesOverview: React.FC<UserCompetencesOverviewProps> = ({
  spaceId,
  organizationMembers,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: userCompetences = [], isLoading: isPolling } = useUserCompetences(
    selectedUser?.id || '',
  );

  return (
    <>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="small">
        <Typography.Title level={4} style={{ margin: 0 }}>
          User Competences Overview
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          View the competences of organization members. Select a user to see their claimed space
          competences and personal competences.
        </Typography.Paragraph>
      </Space>

      <Row gutter={16} style={{ height: '70vh' }}>
        <Col span={8} style={{ height: '100%', overflowY: 'auto' }}>
          <Card title="Organization Members" style={{ height: '100%' }}>
            <UserListSelector
              users={organizationMembers}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
          </Card>
        </Col>
        <Col span={16} style={{ height: '100%', overflowY: 'auto' }}>
          <Card
            title={
              selectedUser ? `Competences: ${getUserDisplayName(selectedUser)}` : 'Select a User'
            }
            style={{ height: '100%' }}
          >
            {!selectedUser ? (
              <Empty
                description="Select a user from the list to view their competences"
                style={{ marginTop: 60 }}
              />
            ) : loading || isPolling ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '60px',
                }}
              >
                <ProceedLoadingIndicator loading={true} small={true} />
              </div>
            ) : (
              <UserCompetencesDisplay competences={userCompetences} />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default UserCompetencesOverview;
