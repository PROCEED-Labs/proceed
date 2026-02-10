'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSpaceCompetences } from '@/lib/competence/useSpaceCompetences';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Tag,
  Card,
  Typography,
  Popconfirm,
} from 'antd';
import { CheckCircleOutlined, TrophyOutlined, DeleteOutlined } from '@ant-design/icons';
import { claimSpaceCompetence, unclaimSpaceCompetence } from '../actions/user-competence-actions';
import { useEnvironment } from '@/components/auth-can';
import ProceedLoadingIndicator from '@/components/loading-proceed';
import styles from '@/components/item-list-view.module.scss';

const { Title, Paragraph } = Typography;

type SpaceCompetence = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  spaceId: string | null;
  creatorUserId: string | null;
  externalQualificationNeeded: boolean;
  renewalTimeInterval: number | null;
  isClaimed?: boolean;
};

type SpaceCompetencesClaimProps = {
  userId: string;
};

const SpaceCompetencesClaim: React.FC<SpaceCompetencesClaimProps> = ({ userId }) => {
  const environment = useEnvironment();
  const queryClient = useQueryClient();
  const { data: spaceCompetences = [], isLoading } = useSpaceCompetences(environment.spaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompetence, setSelectedCompetence] = useState<SpaceCompetence | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [form] = Form.useForm();

  const showClaimModal = (competence: SpaceCompetence) => {
    setSelectedCompetence(competence);
    form.resetFields();
    form.setFieldsValue({ proficiency: '' });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedCompetence(null);
    form.resetFields();
  };

  const handleClaim = async () => {
    if (!selectedCompetence) return;

    try {
      const values = await form.validateFields();
      setClaiming(true);

      const result = await claimSpaceCompetence({
        userId,
        competenceId: selectedCompetence.id,
        proficiency: values.proficiency,
        qualificationDate: values.qualificationDate?.toDate() || null,
        lastUsage: values.lastUsage?.toDate() || null,
      });

      if (result.success) {
        // Invalidate the cache to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['spaceCompetences', environment.spaceId] });
        message.success('Competence claimed successfully');
        handleCancel();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to claim competence');
    } finally {
      setClaiming(false);
    }
  };

  const handleUnclaim = async (competenceId: string) => {
    try {
      setClaiming(true);
      const result = await unclaimSpaceCompetence({ userId, competenceId });

      if (result.success) {
        // Invalidate the cache to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['spaceCompetences', environment.spaceId] });
        message.success('Competence unclaimed successfully');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to unclaim competence');
    } finally {
      setClaiming(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text: string) => (
        <Space>
          <TrophyOutlined />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: true },
      render: (text: string | null) => text || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'External Qualification',
      dataIndex: 'externalQualificationNeeded',
      key: 'externalQualificationNeeded',
      render: (value: boolean) => (value ? <Tag color="orange">Required</Tag> : '—'),
    },
    {
      title: 'Renewal Interval',
      dataIndex: 'renewalTimeInterval',
      key: 'renewalTimeInterval',
      render: (value: number | null) =>
        value ? `${value} months` : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: any, record: SpaceCompetence) =>
        record.isClaimed ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Claimed
          </Tag>
        ) : null,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: any, record: SpaceCompetence) =>
        !record.isClaimed ? (
          <Button
            type="link"
            icon={<CheckCircleOutlined />}
            size="small"
            onClick={() => showClaimModal(record)}
            className={styles.HoverableTableCell}
          >
            Claim
          </Button>
        ) : (
          <Popconfirm
            title="Unclaim competence"
            description="Are you sure you want to unclaim this space competence?"
            onConfirm={() => handleUnclaim(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              className={styles.HoverableTableCell}
            >
              Unclaim
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>Available Space Competences</Title>
            <Paragraph type="secondary">
              Claim competences from your current space to add them to your profile. These
              competences are managed by your organization and may be used for task assignments.
            </Paragraph>
          </div>

          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '16px',
                gap: '16px',
              }}
            >
              <ProceedLoadingIndicator loading={true} small={true} />
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={spaceCompetences}
              rowKey="id"
              pagination={{ pageSize: 10, position: ['bottomCenter'] }}
            />
          )}
        </Space>
      </Card>

      <Modal
        title="Claim Space Competence"
        open={isModalOpen}
        onOk={handleClaim}
        onCancel={handleCancel}
        confirmLoading={claiming}
        width={600}
      >
        {selectedCompetence && (
          <Space direction="vertical" style={{ width: '100%', marginBottom: '20px' }}>
            <div>
              <strong>Competence:</strong> {selectedCompetence.name}
            </div>
            {selectedCompetence.description && (
              <div>
                <strong>Description:</strong> {selectedCompetence.description}
              </div>
            )}
          </Space>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            name="proficiency"
            label="Your Proficiency Level"
            rules={[{ required: false, message: 'Please describe your proficiency' }]}
          >
            <Input
              style={{ width: '100%' }}
              placeholder="From Beginner to Expert, describe your proficiency level"
            />
          </Form.Item>

          <Form.Item name="qualificationDate" label="Qualification Date (Optional)">
            <DatePicker style={{ width: '100%' }} placeholder="When did you get qualified?" />
          </Form.Item>

          <Form.Item name="lastUsage" label="Last Used (Optional)">
            <DatePicker style={{ width: '100%' }} placeholder="When did you last use this skill?" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SpaceCompetencesClaim;
