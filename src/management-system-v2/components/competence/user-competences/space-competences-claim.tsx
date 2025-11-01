'use client';

import { useState, useEffect } from 'react';
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
  Spin,
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
  const [spaceCompetences, setSpaceCompetences] = useState<SpaceCompetence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompetence, setSelectedCompetence] = useState<SpaceCompetence | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSpaceCompetences(true); // Initial load with loading indicator

    // Poll for updates every 5 seconds (without loading indicator)
    const interval = setInterval(() => {
      loadSpaceCompetences(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [environment.spaceId]);

  const loadSpaceCompetences = async (showLoading: boolean = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await fetch(`/api/spaces/${environment.spaceId}/competences`);
      if (response.ok) {
        const data = await response.json();
        setSpaceCompetences(data);
      } else {
        message.error('Failed to load space competences');
      }
    } catch (error) {
      message.error('Error loading space competences');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

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
        setSpaceCompetences((prev) =>
          prev.map((comp) =>
            comp.id === selectedCompetence.id ? { ...comp, isClaimed: true } : comp,
          ),
        );
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
        setSpaceCompetences((prev) =>
          prev.map((comp) => (comp.id === competenceId ? { ...comp, isClaimed: false } : comp)),
        );
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

          {loading ? (
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
              <ProceedLoadingIndicator loading={true} small={true} /* scale="140" */ />
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
