'use client';

import { Button, Input, message, Modal, Row, Space, Switch, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { FC, useState } from 'react';
import { set } from 'zod';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import { addSpaceCompetence } from '@/lib/data/competences';
import { useEnvironment } from '../auth-can';
import { useSession } from 'next-auth/react';

type CompetenceCreationModalProps = React.PropsWithChildren<{
  open: boolean;
  onClose?: () => void;
  environmentId: string;
}>;

const CompetenceCreationModal: FC<CompetenceCreationModalProps> = ({
  children,
  open,
  onClose,
  environmentId,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { spaceId } = useEnvironment();
  const session = useSession();
  const userId = session.data?.user.id;

  // User Input
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [externalQualificationNeeded, setExternalQualificationNeeded] = useState<boolean>(false);
  const [renewalTimeInterval, setRenewalTimeInterval] = useState<number | undefined>(undefined);

  const createSpaceCompetence = async () => {
    setLoading(true);
    await wrapServerCall({
      fn: async () => {
        if (!spaceId || !userId) {
          message.error(' creating competence');
          setLoading(false);
          return;
        }
        await addSpaceCompetence(environmentId, {
          name,
          description,
          externalQualificationNeeded,
          renewalTimeInterval,
        });
      },
      onSuccess: () => {
        setLoading(false);

        setName('');
        setDescription('');
        setExternalQualificationNeeded(false);
        setRenewalTimeInterval(undefined);

        onClose?.();
        router.refresh();
      },
      onError: (err) => {
        console.error('Error creating competence', err);
        message.error('Error creating competence');
        setLoading(false);
      },
    });
  };
  return (
    <>
      <Modal
        destroyOnClose
        centered
        open={open}
        title="Create Competence"
        loading={loading}
        onClose={onClose}
        onCancel={onClose}
        onOk={createSpaceCompetence}
        footer={[
          <Button type="primary" key="submit" loading={loading} onClick={createSpaceCompetence}>
            Create
          </Button>,
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', margin: '1rem 0' }}>
          {/* Name */}
          <Input addonBefore="Name:" value={name} onChange={(e) => setName(e.target.value)} />
          {/* Description */}
          <Input.TextArea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 5 }}
          />
          {/* Requires External Qualification */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography.Text strong>Requires External Qualification:</Typography.Text>
            <div style={{ flex: 'auto' }} />
            <Switch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              checked={externalQualificationNeeded}
              onChange={(checked) => setExternalQualificationNeeded(checked)}
            />
          </div>
          {/* Renewal Time */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography.Text strong>Renewal Time Interval:</Typography.Text>
            <div style={{ flex: 'auto' }} />
            <div>TIME</div>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default CompetenceCreationModal;
