import React from 'react';
import { Table, Typography } from 'antd';
import { getProcess } from '@/lib/data/db/process';
import { generateDateString } from '@/lib/utils';
import { fromCustomUTCString } from '@/lib/helpers/timeHelper';
import styles from '@/app/shared-viewer//process-document.module.scss';
import { VersionInfo } from '@/app/shared-viewer/process-document';

const { Title, Text } = Typography;

type ProcessDetailsTableProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  versionInfo: VersionInfo;
  headingLevel?: 3 | 4;
};

const ProcessDetailsTable: React.FC<ProcessDetailsTableProps> = ({
  processData,
  versionInfo,
  headingLevel = 3,
}) => {
  const rows = [
    { label: 'Process Name', value: processData.name },
    { label: 'Process ID', value: processData.userDefinedId },
    { label: 'Process UUID', value: processData.id },
    {
      label: (processData as any).processInitiatorName ? 'Process Initiator' : 'Owner',
      value: (processData as any).processInitiatorName ?? (processData as any).ownerName,
    },
    { label: 'Process Version', value: versionInfo.name || 'Latest' },
    { label: 'Process Version Description', value: versionInfo.description || '—' },
    { label: 'Process Version Id', value: versionInfo.id || '—' },
    {
      label: 'Version Created On',
      value: versionInfo.versionCreatedOn
        ? generateDateString(fromCustomUTCString(versionInfo.versionCreatedOn), true)
        : versionInfo.id
          ? '—'
          : generateDateString(processData.lastEditedOn, true),
    },
  ];

  return (
    <div className={styles.MetaInformation}>
      <Title level={headingLevel} id="process_details_page">
        Process Details
      </Title>
      <Table
        pagination={false}
        showHeader={false}
        rowKey="label"
        columns={[
          { dataIndex: 'label', key: 'label', render: (v) => <Text strong>{v}</Text> },
          { dataIndex: 'value', key: 'value' },
        ]}
        dataSource={rows}
      />
    </div>
  );
};

export default ProcessDetailsTable;
