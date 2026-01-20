'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizationSpaceCompetences } from '@/lib/competence/useOrganizationSpaceCompetences';
import {
  Table,
  Button,
  Tag,
  message,
  Popconfirm,
  Card,
  Space,
  Avatar,
  Tooltip,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import {
  createOrganizationSpaceCompetence,
  updateOrganizationSpaceCompetence,
  deleteOrganizationSpaceCompetence,
} from '../actions/organization-competence-actions';
import SpaceCompetenceFormModal from './space-competence-form-modal';
import { SpaceCompetence } from '@/lib/data/competence-schema';
import styles from '@/components/item-list-view.module.scss';

type SpaceCompetencesManagementProps = {
  spaceId: string;
  initialCompetences: SpaceCompetence[];
  currentUserId: string;
};

const SpaceCompetencesManagement: React.FC<SpaceCompetencesManagementProps> = ({
  spaceId,
  initialCompetences,
  currentUserId,
}) => {
  const queryClient = useQueryClient();
  const { data: competences = initialCompetences, isLoading: isPolling } =
    useOrganizationSpaceCompetences(spaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<SpaceCompetence | null>(null);
  const [loading, setLoading] = useState(false);

  const showModal = (competence?: SpaceCompetence) => {
    setEditingCompetence(competence || null);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingCompetence(null);
  };

  const handleSubmit = async (values: {
    name: string;
    description: string;
    externalQualificationNeeded: boolean;
    renewalTimeInterval: number | null;
    unclaimForAllUsers?: boolean;
  }) => {
    setLoading(true);
    try {
      if (editingCompetence) {
        // Update existing competence
        const result = await updateOrganizationSpaceCompetence({
          competenceId: editingCompetence.id,
          spaceId,
          name: values.name,
          description: values.description,
          externalQualificationNeeded: values.externalQualificationNeeded,
          renewalTimeInterval: values.renewalTimeInterval,
          unclaimForAllUsers: values.unclaimForAllUsers || false,
        });

        if (result.success) {
          // Invalidate the cache to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['organizationSpaceCompetences', spaceId] });
          message.success('Space competence updated successfully');
          handleCancel();
        } else {
          message.error(result.message);
        }
      } else {
        // Create new competence
        const result = await createOrganizationSpaceCompetence({
          spaceId,
          creatorUserId: currentUserId,
          name: values.name,
          description: values.description,
          externalQualificationNeeded: values.externalQualificationNeeded,
          renewalTimeInterval: values.renewalTimeInterval,
        });

        if (result.success && result.data) {
          // Invalidate the cache to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['organizationSpaceCompetences', spaceId] });
          message.success('Space competence created successfully');
          handleCancel();
        } else if (!result.success) {
          message.error(result.message);
        }
      }
    } catch (error) {
      message.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (competenceId: string) => {
    setLoading(true);
    try {
      const result = await deleteOrganizationSpaceCompetence({
        competenceId,
        spaceId,
      });

      if (result.success) {
        // Invalidate the cache to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['organizationSpaceCompetences', spaceId] });
        message.success('Space competence deleted successfully');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to delete space competence');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: { showTitle: true },
      sorter: (a: SpaceCompetence, b: SpaceCompetence) => a.name.localeCompare(b.name),
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: true },
      sorter: (a: SpaceCompetence, b: SpaceCompetence) =>
        (a.description || '').localeCompare(b.description || ''),
      render: (text: string | null) => text || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'External Qualification',
      dataIndex: 'externalQualificationNeeded',
      key: 'externalQualificationNeeded',
      width: 180,
      sorter: (a: SpaceCompetence, b: SpaceCompetence) =>
        Number(a.externalQualificationNeeded) - Number(b.externalQualificationNeeded),
      render: (value: boolean) =>
        value ? <Tag color="orange">Required</Tag> : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Renewal Interval',
      dataIndex: 'renewalTimeInterval',
      key: 'renewalTimeInterval',
      width: 150,
      sorter: (a: SpaceCompetence, b: SpaceCompetence) =>
        (a.renewalTimeInterval || 0) - (b.renewalTimeInterval || 0),
      render: (value: number | null) =>
        value ? `${value} months` : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: '# Claimed',
      key: 'claimedCount',
      width: 100,
      sorter: (a: SpaceCompetence, b: SpaceCompetence) => a.claimedBy.length - b.claimedBy.length,
      render: (_: any, record: SpaceCompetence) => (
        <Typography.Text>{record.claimedBy.length}</Typography.Text>
      ),
    },
    {
      title: 'Claimed By',
      key: 'claimedBy',
      width: 200,
      sorter: (a: SpaceCompetence, b: SpaceCompetence) => a.claimedBy.length - b.claimedBy.length,
      render: (_: any, record: SpaceCompetence) => {
        if (record.claimedBy.length === 0) {
          return <span style={{ color: '#999' }}>—</span>;
        }

        const maxVisible = 5;
        const visibleUsers = record.claimedBy.slice(0, maxVisible);
        const remainingCount = record.claimedBy.length - maxVisible;

        return (
          <Avatar.Group max={{ count: maxVisible }} size="small">
            {visibleUsers.map((userComp) => (
              <Tooltip key={userComp.userId} title={`User: ${userComp.userId}`}>
                <Avatar icon={<UserOutlined />} />
              </Tooltip>
            ))}
            {remainingCount > 0 && (
              <Tooltip title={`+${remainingCount} more user${remainingCount > 1 ? 's' : ''}`}>
                <Avatar>+{remainingCount}</Avatar>
              </Tooltip>
            )}
          </Avatar.Group>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_: any, record: SpaceCompetence) => (
        <Space className={styles.HoverableTableCell}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Space Competence?"
            description={
              <>
                Deleting &quot;{record.name}&quot; will:
                <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                  <li>Remove it from the organization</li>
                  <li>Unclaim it for all {record.claimedBy.length} user(s)</li>
                  <li>Delete all associated proficiency data</li>
                </ul>
                This action cannot be undone.
              </>
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Typography.Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            Manage Space Competences
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Create and manage competences for your organization. These competences can be claimed by
            organization members to indicate their skills and qualifications.
          </Typography.Paragraph>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            Create Space Competence
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={competences}
          rowKey="id"
          pagination={{ pageSize: 10, position: ['bottomCenter'] }}
          loading={isPolling}
        />

        <SpaceCompetenceFormModal
          open={isModalOpen}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          editingCompetence={editingCompetence}
          loading={loading}
        />
      </Space>
    </Card>
  );
};

export default SpaceCompetencesManagement;
