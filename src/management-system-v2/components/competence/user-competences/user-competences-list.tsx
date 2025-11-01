'use client';

import { useState, useEffect } from 'react';
import { debugLog } from '../utils/debug';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Card,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createUserCompetence,
  updateUserCompetence,
  deleteUserCompetence,
  unclaimSpaceCompetence,
  getUserCompetences,
} from '../actions/user-competence-actions';
import styles from '@/components/item-list-view.module.scss';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

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

type UserCompetencesListProps = {
  initialUserCompetences: UserCompetence[];
  userId: string;
};

const UserCompetencesList: React.FC<UserCompetencesListProps> = ({
  initialUserCompetences,
  userId,
}) => {
  const [userCompetences, setUserCompetences] = useState<UserCompetence[]>(initialUserCompetences);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<UserCompetence | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // Poll for updates every 5 seconds
    const interval = setInterval(async () => {
      try {
        const result = await getUserCompetences(userId);
        if (result.success && result.data) {
          setUserCompetences(result.data);
        }
      } catch (error) {
        debugLog('Error polling user competences:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  const showModal = (competence?: UserCompetence) => {
    if (competence) {
      setEditingCompetence(competence);
      form.setFieldsValue({
        name: competence.competence.name,
        description: competence.competence.description,
        proficiency: competence.proficiency,
        qualificationDate: competence.qualificationDate
          ? dayjs(competence.qualificationDate)
          : null,
        lastUsage: competence.lastUsage ? dayjs(competence.lastUsage) : null,
      });
    } else {
      setEditingCompetence(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingCompetence(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingCompetence) {
        // Update existing competence
        const result = await updateUserCompetence({
          competenceId: editingCompetence.competenceId,
          userId,
          name: values.name,
          description: values.description,
          proficiency: values.proficiency,
          qualificationDate: values.qualificationDate?.toDate() || null,
          lastUsage: values.lastUsage?.toDate() || null,
        });

        if (result.success) {
          setUserCompetences((prev) =>
            prev.map((comp) =>
              comp.competenceId === editingCompetence.competenceId ? result.data : comp,
            ),
          );
          message.success('Competence updated successfully');
        } else {
          message.error(result.message);
        }
      } else {
        // Create new user competence
        const result = await createUserCompetence({
          userId,
          name: values.name,
          description: values.description,
          proficiency: values.proficiency,
          qualificationDate: values.qualificationDate?.toDate() || null,
          lastUsage: values.lastUsage?.toDate() || null,
        });

        if (result.success) {
          setUserCompetences((prev) => [...prev, result.data]);
          message.success('Competence added successfully');
        } else {
          message.error(result.message);
        }
      }

      handleCancel();
    } catch (error) {
      message.error('Failed to save competence');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (competenceId: string) => {
    setLoading(true);
    try {
      const result = await deleteUserCompetence({ userId, competenceId });

      if (result.success) {
        setUserCompetences((prev) => prev.filter((comp) => comp.competenceId !== competenceId));
        message.success('Competence deleted successfully');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to delete competence');
    } finally {
      setLoading(false);
    }
  };

  const handleUnclaim = async (competenceId: string) => {
    setLoading(true);
    try {
      const result = await unclaimSpaceCompetence({ userId, competenceId });

      if (result.success) {
        setUserCompetences((prev) => prev.filter((comp) => comp.competenceId !== competenceId));
        message.success('Competence unclaimed successfully');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to unclaim competence');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: ['competence', 'name'],
      key: 'name',
      ellipsis: { showTitle: true },
      render: (text: string, record: UserCompetence) => <strong>{text}</strong>,
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
      render: (date: Date | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Last Usage',
      dataIndex: 'lastUsage',
      key: 'lastUsage',
      render: (date: Date | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_: any, record: UserCompetence) =>
        record.competence.type === 'SPACE' ? (
          <Tag color="blue">Space</Tag>
        ) : (
          <Tag color="green">Personal</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 180,
      render: (_: any, record: UserCompetence) => (
        <Space className={styles.HoverableTableCell}>
          {record.competence.type === 'USER' ? (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => showModal(record)}
                size="small"
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete competence"
                description="Are you sure you want to delete this competence?"
                onConfirm={() => handleDelete(record.competenceId)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger icon={<DeleteOutlined />} size="small">
                  Delete
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Popconfirm
              title="Unclaim competence"
              description="Are you sure you want to unclaim this space competence?"
              onConfirm={() => handleUnclaim(record.competenceId)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />} size="small">
                Unclaim
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={5}>My Competences</Title>
              <Paragraph type="secondary">Total: {userCompetences.length}</Paragraph>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              Add Competence
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={userCompetences}
            rowKey={(record) => record.competenceId}
            loading={loading}
            pagination={{ pageSize: 10, position: ['bottomCenter'] }}
          />
        </Space>
      </Card>

      <Modal
        title={editingCompetence ? 'Edit Competence' : 'Add New Competence'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Competence Name"
            rules={[{ required: true, message: 'Please enter a competence name' }]}
          >
            <Input
              placeholder="e.g., Python Programming, Project Management"
              disabled={editingCompetence?.competence.type === 'SPACE'}
            />
          </Form.Item>

          <Form.Item
            rules={[
              {
                required: true,
                message: 'Please describe your capabilities in regards to this competence',
              },
            ]}
            name="description"
            label="Description"
          >
            <TextArea
              rows={3}
              placeholder="Describe this competence and your experience with it"
              disabled={editingCompetence?.competence.type === 'SPACE'}
            />
          </Form.Item>

          <Form.Item
            name="proficiency"
            label="Proficiency Level"
            rules={[{ required: false, message: 'Please rate your proficiency' }]}
          >
            <TextArea
              rows={2}
              style={{ width: '100%' }}
              placeholder="From Beginner to Expert, describe your proficiency level"
            />
          </Form.Item>

          <Form.Item name="qualificationDate" label="Qualification Date">
            <DatePicker style={{ width: '100%' }} placeholder="When did you acquire this skill?" />
          </Form.Item>

          <Form.Item name="lastUsage" label="Last Used">
            <DatePicker style={{ width: '100%' }} placeholder="When did you last use this skill?" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserCompetencesList;
