'use client';
import { useUserPreferences } from '@/lib/user-preferences';
import styles from './competences-table.module.scss';
import { Button, Card, message, Space, Table, TableProps, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { FC, useState, useRef, ReactNode, useEffect, useLayoutEffect } from 'react';
import { ResizableBox } from 'react-resizable';
import { SpaceCompetence, User } from '@/lib/data/competence-schema';
import { ResizeableTitle, useResizeableColumnWidth } from '@/lib/useColumnWidth';
import { set } from 'zod';
import ConfirmationButton from '@/components/confirmation-button';
import CompetenceCreationModal from './competence-creation-modal';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { deleteSpaceCompetence } from '@/lib/data/competences';
import { useRouter } from 'next/navigation';

type CompetencesTableProps = React.PropsWithChildren<{
  containerWidth: number;
  competences: SpaceCompetence[];
  selectedCompetence: SpaceCompetence | null;
  setSelectedSpaceCompetence: (competence: SpaceCompetence | null) => void;
  environmentId: string;
}>;

const CompetencesTable: FC<CompetencesTableProps> = ({
  children,
  containerWidth,
  competences,
  selectedCompetence,
  setSelectedSpaceCompetence,
  environmentId,
}) => {
  const addPreferences = useUserPreferences.use.addPreferences();
  const { cardWidth: width } = useUserPreferences.use['competences-table']();
  const preferencesHydrated = useUserPreferences.use._hydrated();

  const router = useRouter();

  const [maxTableHeigth, setMaxTableHeigth] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const handleResize = () => {
      setMaxTableHeigth(cardRef.current?.clientHeight || 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cardRef]);

  const [creationModalOpen, setCreationModalOpen] = useState(false);

  const maxWidth = Math.round(containerWidth * 0.7),
    minWidth = Math.round(containerWidth * 0.4),
    intitalWidth = Math.round(containerWidth * 0.6);

  const setWidth = (newWidth: number) => {
    if (!preferencesHydrated) return;
    addPreferences({
      'competences-table': { cardWidth: Math.max(Math.min(newWidth, maxWidth), minWidth) },
    });
  };
  const oldContainerWidth = useRef(containerWidth);

  /* Handle updates of container width */
  useEffect(() => {
    /* Set new width */
    /* Edge-Case: Initial render (parent has not figuered out the actual width in px, yet) */
    if (oldContainerWidth.current === 0) {
      oldContainerWidth.current = containerWidth;
      /* Check whther Preferences yield any value */
      if (preferencesHydrated && Number.isNaN(width)) setWidth(intitalWidth);
      return;
    }
    /* Other resize: */
    /* Get old width in % */
    const ratio = width / oldContainerWidth.current;
    /* Set old width to new width */
    oldContainerWidth.current = containerWidth;
    setWidth(Math.round(containerWidth * ratio));
  }, [containerWidth]);

  let columns: TableProps<SpaceCompetence>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (value, record, index) => <>{value}</>,
    },
    // {
    //   title: 'Description',
    //   dataIndex: 'description',
    //   render: (text) => <>TEST</>,
    // },
    {
      title: 'Creatd By',
      dataIndex: 'creatorUserId',
      /* TODO: Use ID to user mapping */
      render: (value, record, index) => <>{value}</>,
    },
    {
      title: 'Requires Qualification',
      dataIndex: 'externalQualificationNeeded',
      render: (value, record, index) => (
        <>
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {value ? (
              <CheckOutlined style={{ color: 'green' }} />
            ) : (
              <CloseOutlined style={{ color: 'red' }} />
            )}
          </div>
        </>
      ),
    },
    {
      title: 'Renewal Time',
      dataIndex: 'renewalTimeInterval',
      render: (value, record, index) => <>{value}</>,
    },
    {
      title: 'Claimed By',
      dataIndex: ['claimedBy'],
      render: (value, record, index) => (
        <>
          {value.map((user: User) => (
            <Tag key={`competence-claimedBy-cell-${user.userId}-${index}`}>{user.userId}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '',
      key: 'delete-entry',
      width: 40,
      render: (value, record, index) => (
        <>
          <Space>
            {/* <Button icon={<DeleteOutlined />} /> */}
            <ConfirmationButton
              tooltip="Delete"
              title={`Delete Competence`}
              description={`Are you sure you want to delete the selected Competence: ${record.name} ?`}
              onConfirm={async () => {
                await wrapServerCall({
                  fn: async () => {
                    await deleteSpaceCompetence(environmentId, record.id);
                  },
                  onSuccess: () => {
                    message.success(`Competence ${record.name} deleted successfully.`);
                    setSelectedSpaceCompetence(null);
                    router.refresh();
                  },
                  onError: (err) => {
                    message.error(`Error deleting competence ${record.name}`);
                  },
                });
              }}
              buttonProps={{
                icon: <DeleteOutlined />,
                type: 'text',
                className: styles.ActionButton,
              }}
            />
          </Space>
        </>
      ),
    },
  ];

  // columns = useResizeableColumnWidth(columns, 'competences-table-columns');

  const tableData = competences.map((competence) => ({
    ...competence,
    key: competence.id,
  }));

  return (
    <>
      <ResizableBox
        style={{ display: 'flex', gap: '1rem' }}
        className={styles.resizable}
        width={width}
        // height={0}
        axis="x"
        resizeHandles={['e']}
        minConstraints={[minWidth, 0]}
        maxConstraints={[maxWidth, 0]}
        onResizeStop={(_, { size }) => setWidth(size.width)}
        handle={
          <div className={styles.outerHandle}>
            <div className={styles.innerHandle} />
          </div>
        }
      >
        <Card className={styles.card} title={'Exisiting Competences'} ref={cardRef}>
          <Table
            className={styles.table}
            columns={columns}
            dataSource={tableData}
            rowSelection={{
              type: 'radio',
              onChange: (selectedRowKeys, selectedRows) => {
                setSelectedSpaceCompetence(selectedRows[0]);
              },
              selectedRowKeys: tableData
                .filter((competence) => competence.id === selectedCompetence?.id)
                .map((competence) => competence.id),
            }}
            onRow={(record) => ({
              onClick: () => {
                setSelectedSpaceCompetence(record);
              },
            })}
            scroll={{
              y: maxTableHeigth - 250,
            }}
            pagination={{
              pageSize: 20,
              position: ['bottomCenter'],
            }}
            // components={{
            //   header: {
            //     cell: ResizeableTitle,
            //   },
            // }}
            footer={() => (
              <div
                style={{
                  top: '-20%',
                  width: '100%',
                  height: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Button
                  style={{ width: '100%', margin: 0 }}
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setCreationModalOpen(true);
                  }}
                >
                  Add Competence
                </Button>
              </div>
            )}
          />
        </Card>
      </ResizableBox>

      <CompetenceCreationModal
        open={creationModalOpen}
        onClose={() => setCreationModalOpen(false)}
        environmentId={environmentId}
      />
    </>
  );
};

export default CompetencesTable;
