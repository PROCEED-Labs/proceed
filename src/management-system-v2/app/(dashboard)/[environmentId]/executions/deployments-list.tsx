'use client';

import { Button, Grid, TableColumnsType, TableProps, Tooltip } from 'antd';
import { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import { DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { DeployedProcessInfo } from '@/lib/engines/deployment';
import SpaceLink from '@/components/space-link';
import processListStyles from '@/components/process-icon-list.module.scss';
import { removeDeployment } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import { useRouter } from 'next/navigation';
import { wrapServerCall } from '@/lib/wrap-server-call';

type InputItem = {
  id: string;
  name: string;
  versions: DeployedProcessInfo['versions'];
  instances: DeployedProcessInfo['instances'];
};
export type DeployedProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name'>;

const DeploymentsList = ({
  processes,
  tableProps,
}: {
  processes: DeployedProcessListProcess[];
  tableProps?: TableProps<DeployedProcessListProcess>;
}) => {
  const breakpoint = Grid.useBreakpoint();

  const space = useEnvironment();
  const router = useRouter();

  const columns: TableColumnsType<DeployedProcessListProcess> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      render: (_, record) => (
        <SpaceLink
          href={`/executions/${record.id}`}
          style={{
            color: 'inherit' /* or any color you want */,
            textDecoration: 'none' /* removes underline */,
            display: 'block',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          <div
            className={
              breakpoint.xs
                ? processListStyles.MobileTitleTruncation
                : breakpoint.xl
                  ? processListStyles.TitleTruncation
                  : processListStyles.TabletTitleTruncation
            }
          >
            {record.name.highlighted}
          </div>
        </SpaceLink>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Versions',
      dataIndex: 'description',
      key: 'Versions',
      render: (_, { versions }) => (
        <Tooltip
          title={
            versions.length > 1 && versions.map((v) => v.versionName || v.definitionName).join(', ')
          }
        >
          <span>{versions.length}</span>
        </Tooltip>
      ),
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['sm'],
    },
    {
      title: 'Running Instances',
      dataIndex: 'runningInstances',
      key: 'Running Instances',
      render: (_, record) => <span>{record.instances.length}</span>,
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['md'],
    },
    {
      title: 'Ended Instances',
      dataIndex: 'endedInstances',
      key: 'Ended Instances',
      // TODO: remove ts-ignore
      // @ts-ignore
      render: (_, record) => <span>{record.endedInstances}</span>,
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['md'],
    },
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: 'Meta Data Button',
      title: '',
      render: (id, record) => {
        return (
          <Button style={{ float: 'right' }} type="text">
            <DeleteOutlined color="red" />
          </Button>
        );
      },
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  const [selectedColumns, setSelectedColumns] = useState(columns);

  return (
    <>
      <ElementList
        data={processes}
        columns={
          breakpoint.xl
            ? selectedColumns.filter((c) => c.key !== 'Meta Data Button')
            : selectedColumns
        }
        selectableColumns={{
          setColumnTitles: (cols) => {
            let newCols: string[];
            if (typeof cols === 'function') {
              newCols = cols(selectedColumns.map((col: any) => col.name) as string[]);
            } else {
              newCols = cols;
            }
            setSelectedColumns(columns.filter((column) => newCols.includes(column.key as string)));
          },
          selectedColumnTitles: selectedColumns.map((c) => c.title) as string[],
          allColumnTitles: ['Versions', 'Running Instances', 'Ended Instances'],
          columnProps: {
            width: '150px',
            responsive: ['xl'],
            render: (id, record) => {
              return (
                <Button
                  style={{ float: 'right' }}
                  type="text"
                  onClick={() => {
                    wrapServerCall({
                      fn: () => removeDeployment(record.id, space.spaceId),
                      onSuccess: () => router.refresh(),
                    });
                  }}
                >
                  <DeleteOutlined color="red" />
                </Button>
              );
            },
          },
        }}
        tableProps={tableProps}
      ></ElementList>
    </>
  );
};

export default DeploymentsList;
