'use client';

import { Table, Tag, Typography, Space, Empty } from 'antd';
import dayjs from 'dayjs';
import { UserCompetence } from '@/lib/data/competence-schema';

const { Title } = Typography;

type UserCompetencesDisplayProps = {
  competences: UserCompetence[];
};

const UserCompetencesDisplay: React.FC<UserCompetencesDisplayProps> = ({ competences }) => {
  const spaceCompetences = competences.filter((comp) => comp.competence.type === 'SPACE');
  const personalCompetences = competences.filter((comp) => comp.competence.type === 'USER');

  const columns = [
    {
      title: 'Name',
      dataIndex: ['competence', 'name'],
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: ['competence', 'description'],
      key: 'description',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Proficiency',
      dataIndex: 'proficiency',
      key: 'proficiency',
      ellipsis: { showTitle: true },
      render: (value: string | null) => value || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Qualification Date',
      dataIndex: 'qualificationDate',
      key: 'qualificationDate',
      width: 150,
      render: (date: Date | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Last Usage',
      dataIndex: 'lastUsage',
      key: 'lastUsage',
      width: 150,
      render: (date: Date | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : <span style={{ color: '#999' }}>—</span>,
    },
  ];

  if (competences.length === 0) {
    return <Empty description="This user has no competences" style={{ marginTop: 60 }} />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {spaceCompetences.length > 0 && (
        <div>
          <Title level={5}>
            Space Competences{' '}
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {spaceCompetences.length}
            </Tag>
          </Title>
          <Table
            columns={columns}
            dataSource={spaceCompetences}
            rowKey="competenceId"
            pagination={false}
            size="small"
          />
        </div>
      )}

      {personalCompetences.length > 0 && (
        <div>
          <Title level={5}>
            Personal Competences{' '}
            <Tag color="green" style={{ marginLeft: 8 }}>
              {personalCompetences.length}
            </Tag>
          </Title>
          <Table
            columns={columns}
            dataSource={personalCompetences}
            rowKey="competenceId"
            pagination={false}
            size="small"
          />
        </div>
      )}
    </Space>
  );
};

export default UserCompetencesDisplay;
