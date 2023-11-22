'use client';

import {
  Button,
  Checkbox,
  Dropdown,
  MenuProps,
  Row,
  Table,
  TableColumnProps,
  TableColumnsType,
  Tooltip,
} from 'antd';
import React, {
  useCallback,
  useState,
  FC,
  PropsWithChildren,
  Key,
  Dispatch,
  SetStateAction,
} from 'react';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  EyeOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { ColumnType, TableRowSelection } from 'antd/es/table/interface';
import styles from './process-list.module.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import Preview from './previewProcess';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import { generateDateString } from '@/lib/utils';
import ProcessEditButton from './process-edit-button';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { ApiData, useDeleteAsset, useInvalidateAsset, usePostAsset } from '@/lib/fetch-data';
import { useUserPreferences } from '@/lib/user-preferences';
import ProcessDeleteSingleModal from './process-delete-single';
import { useAbilityStore } from '@/lib/abilityStore';
import { AuthCan } from '@/lib/clientAuthComponents';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

type ProcessListProps = PropsWithChildren<{
  data?: Processes;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  isLoading?: boolean;
  onExportProcess: Dispatch<SetStateAction<string[]>>;
  search?: string;
  setDeleteProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  deleteProcessKeys: React.Key[];
}>;

const ProcessActions = () => {};

const ColumnHeader = [
  'Process Name',
  'Description',
  'Last Edited',
  'Created On',
  'File Size',
  'Owner',
];

const numberOfRows =
  typeof window !== 'undefined' ? Math.floor((window?.innerHeight - 340) / 47) : 10;

const ProcessList: FC<ProcessListProps> = ({
  data,
  selection,
  setSelection,
  isLoading,
  onExportProcess,
  search,
  setDeleteProcessIds,
  deleteProcessKeys,
}) => {
  const router = useRouter();

  const invalidateProcesses = useInvalidateAsset('/process');
  const refreshData = useInvalidateAsset('/process');

  const [previewerOpen, setPreviewerOpen] = useState(false);

  const [hovered, setHovered] = useState<Process | undefined>(undefined);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const favourites = [0];

  const [previewProcess, setPreviewProcess] = useState<Process>();

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const { preferences, addPreferences } = useUserPreferences();

  const {
    'process-list-columns': selectedColumns,
    'ask-before-deleting-single': openModalWhenDeleteSingle,
  } = preferences;

  const ability = useAbilityStore((state) => state.ability);

  const clipAndHighlightText = useCallback(
    (dataIndexElement: any) => {
      const searchLower = search?.toLowerCase();
      const dataIndexElementLower = dataIndexElement?.toLowerCase();
      const withoutSearchTerm = dataIndexElementLower?.split(searchLower);
      let res = dataIndexElement;
      if (search && withoutSearchTerm?.length > 1) {
        let lastIndex = 0;
        res = withoutSearchTerm.map(
          (word: string | any[], i: React.Key | null | undefined, arr: string | any[]) => {
            const highlightedWord = dataIndexElement.slice(lastIndex, lastIndex + word.length);
            lastIndex += word.length + search.length;
            if (i === arr.length - 1) return highlightedWord;

            return (
              <span key={i}>
                <span>{highlightedWord}</span>
                <span style={{ color: '#3e93de' }}>
                  {dataIndexElement.slice(lastIndex - search.length, lastIndex)}
                </span>
              </span>
            );
          },
        );
      }

      return (
        <div
          style={{
            width: '10vw',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {res}
        </div>
      );
    },
    [search],
  );

  const { mutateAsync: createProcess } = usePostAsset('/process');

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}', {
    onSettled: refreshData,
  });

  const actionBarGenerator = useCallback(
    (record: Process) => {
      return (
        <>
          <Tooltip placement="top" title={'Preview'}>
            <EyeOutlined
              onClick={() => {
                setPreviewProcess(record);
                setPreviewerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip placement="top" title={'Copy'}>
            <CopyOutlined
              onClick={() => {
                createProcess({
                  body: {
                    ...record,
                    bpmn: record.bpmn || '',
                    variables: [
                      {
                        name: `${record.definitionName} Copy`,
                        type: '',
                      },
                    ],
                  },
                });
              }}
            />
          </Tooltip>
          <Tooltip placement="top" title={'Export'}>
            <ExportOutlined
              onClick={() => {
                onExportProcess([record.definitionId]);
              }}
            />
          </Tooltip>
          <AuthCan resource={toCaslResource('Process', record)} action="update">
            <ProcessEditButton
              definitionId={record.definitionId}
              wrapperElement={
                <Tooltip placement="top" title={'Edit'}>
                  <EditOutlined />
                </Tooltip>
              }
              onEdited={() => {
                invalidateProcesses();
              }}
            />
          </AuthCan>
          {ability.can('delete', 'Process') && (
            <Tooltip placement="top" title={'Delete'}>
              <DeleteOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  if (openModalWhenDeleteSingle) {
                    setDeleteProcessIds([record.definitionId]);
                  } else {
                    deleteProcess({
                      params: {
                        path: {
                          definitionId: record.definitionId as string,
                        },
                      },
                    });
                  }

                  setSelection(selection.filter((id) => id !== record.definitionId));
                }}
              />
            </Tooltip>
          )}
        </>
      );
    },
    [
      ability,
      createProcess,
      deleteProcess,
      onExportProcess,
      openModalWhenDeleteSingle,
      selection,
      setDeleteProcessIds,
      setSelection,
      invalidateProcesses,
    ],
  );

  // rowSelection object indicates the need for row selection

  const rowSelection: TableRowSelection<Process> = {
    selectedRowKeys: selection,
    onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
      setSelection(selectedRowKeys);
    },
    getCheckboxProps: (record: Processes[number]) => ({
      name: record.definitionId,
    }),
    onSelect: (record, selected, selectedRows, nativeEvent) => {
      // setSelection(selectedRows);
      setSelection(selectedRows.map((row) => row.definitionId));
    },
    onSelectNone: () => {
      setSelection([]);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      // setSelection(selectedRows);
      setSelection(selectedRows.map((row) => row.definitionId));
    },
  };

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    const { checked, value } = e.target;
    if (checked) {
      //setSelectedColumns([...selectedColumns, value]);
      addPreferences({ 'process-list-columns': [...selectedColumns, value] });
    } else {
      //setSelectedColumns(selectedColumns.filter((column) => column !== value));
      addPreferences({
        'process-list-columns': selectedColumns.filter((column: any) => column !== value),
      });
    }
  };

  const items: MenuProps['items'] = ColumnHeader.map((title) => ({
    label: (
      <>
        <Checkbox
          checked={selectedColumns.includes(title)}
          onChange={onCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          value={title}
        >
          {title}
        </Checkbox>
      </>
    ),
    key: title,
  }));

  const columns: TableColumnsType<Processes[number]> = [
    {
      title: <StarOutlined />,
      dataIndex: 'definitionId',
      key: '',
      width: '40px',
      render: (definitionId, _, index) => (
        <StarOutlined
          style={{
            color: favourites?.includes(index) ? '#FFD700' : undefined,
            opacity: hovered?.definitionId === definitionId || favourites?.includes(index) ? 1 : 0,
          }}
        />
      ),
    },

    {
      title: 'Process Name',
      dataIndex: 'definitionName',
      key: 'Process Name',
      className: styles.Title,
      sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          //   //    TODO:
          //   setSelectedProcess(record);
          //   router.refresh();
          //   router.push(`/processes/${record.definitionId}`);
        },
      }),
      render: clipAndHighlightText,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
      render: clipAndHighlightText,
    },

    {
      title: 'Last Edited',
      dataIndex: 'lastEdited',
      key: 'Last Edited',
      render: (date: Date) => generateDateString(date, true),
      sorter: (a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime(),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      sorter: (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },
    {
      title: 'File Size',
      key: 'File Size',
      sorter: (a, b) => (a < b ? -1 : 1),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'Owner',
      sorter: (a, b) => a.owner!.localeCompare(b.owner || ''),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },
    {
      fixed: 'right',
      width: 160,
      // add title but only if at least one row is selected
      dataIndex: 'definitionId',
      key: '',
      title: (
        <div style={{ float: 'right' }}>
          <Dropdown
            open={dropdownOpen}
            onOpenChange={(open) => setDropdownOpen(open)}
            menu={{
              items,
            }}
            trigger={['click']}
          >
            <Button type="text">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </div>
      ),
      render: (definitionId, record, index) => (
        <Row
          justify="space-evenly"
          style={{
            opacity: hovered?.definitionId === definitionId ? 1 : 0,
          }}
        >
          {actionBarGenerator(record)}
        </Row>
      ),
    },
  ];

  const columnsFiltered = columns.filter((c) => selectedColumns.includes(c?.key as string));

  return (
    <>
      <Table
        rowSelection={{
          type: 'checkbox',
          ...rowSelection,
        }}
        onRow={(record, rowIndex) => ({
          onClick: (event) => {
            // event.stopPropagation();
            // event.preventDefault();
            /* CTRL */
            if (event.ctrlKey) {
              /* Not selected yet -> Add to selection */
              if (!selection.includes(record?.definitionId)) {
                setSelection([record?.definitionId, ...selection]);
                /* Already in selection -> deselect */
              } else {
                setSelection(selection.filter((id) => id !== record?.definitionId));
              }
              /* SHIFT */
            } else if (event.shiftKey) {
              /* At least one element selected */
              if (selection.length) {
                const iLast = data!.findIndex((process) => process.definitionId === lastProcessId);
                const iCurr = data!.findIndex(
                  (process) => process.definitionId === record?.definitionId,
                );
                /* Identical to last clicked */
                if (iLast === iCurr) {
                  setSelection([record?.definitionId]);
                } else if (iLast < iCurr) {
                  /* Clicked comes after last slected */
                  setSelection(
                    data!.slice(iLast, iCurr + 1).map((process) => process.definitionId),
                  );
                } else if (iLast > iCurr) {
                  /* Clicked comes before last slected */
                  setSelection(
                    data!.slice(iCurr, iLast + 1).map((process) => process.definitionId),
                  );
                }
              } else {
                /* Nothing selected */
                setSelection([record?.definitionId]);
              }
              /* Normal Click */
            } else {
              setSelection([record?.definitionId]);
            }

            /* Always */
            setLastProcessId(record?.definitionId);
          },
          // onClick: (event) => {
          //   if (event.ctrlKey) {
          //     if (!selection.includes(record.definitionId)) {
          //       setSelection([record.definitionId, ...selection]);
          //     } else {
          //       setSelection(selection.filter((id) => id !== record.definitionId));
          //     }
          //   } else {
          //     setSelection([record.definitionId]);
          //   }
          // },
          onDoubleClick: () => {
            // TODO: This is a hack to clear the parallel route when selecting
            // another process. (needs upstream fix)
            router.refresh();
            router.push(`/processes/${record.definitionId}`);
          },
          onMouseEnter: (event) => {
            setHovered(record);
          }, // mouse enter row
          onMouseLeave: (event) => {
            setHovered(undefined);
          }, // mouse leave row
        })}
        /* ---- */
        /* Breaks Side-Panel */
        // sticky
        // scroll={{ x: 1200, y: 500 }}
        /* ---- */
        pagination={{ position: ['bottomCenter'], pageSize: numberOfRows }}
        rowKey="definitionId"
        columns={columnsFiltered}
        dataSource={data}
        loading={isLoading}
        className={classNames('no-select')}
        /* Row size rowsize */
        size="middle"
      />

      {previewerOpen && (
        <Preview selectedElement={previewProcess} setOpen={setPreviewerOpen}></Preview>
      )}
      <ProcessDeleteSingleModal
        setDeleteProcessIds={setDeleteProcessIds}
        processKeys={deleteProcessKeys}
        setSelection={setSelection}
      />
    </>
  );
};

export default ProcessList;
