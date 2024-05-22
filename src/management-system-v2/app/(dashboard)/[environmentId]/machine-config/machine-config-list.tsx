'use client';

import { Button, Grid, Dropdown } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { AiOutlinePlus } from 'react-icons/ai';
import Bar from '@/components/bar';
import SelectionActions from '@/components/selection-actions';
import { useState } from 'react';
import { MachineConfig } from '@/lib/data/machine-config-schema';
import useFuzySearch from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import FolderCreationButton from '@/components/folder-creation-button';
import MachineConfigCreationButton from '@/components/machine-config-creation-button';

const MachineConfigList = ({
  data,
  params,
}: {
  data: MachineConfig[];
  params: {
    environmentId: string;
    canCreateFolder: boolean;
    canCreateConfig: boolean;
    folderId?: string;
  };
}) => {
  const router = useRouter();
  const space = useEnvironment();
  const breakpoint = Grid.useBreakpoint();
  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data,
    keys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [selectedRowElements, setSelectedRowElements] = useState<MachineConfig[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);

  const defaultDropdownItems = [];
  if (params.canCreateConfig)
    defaultDropdownItems.push({
      key: 'create-machine-config',
      label: <MachineConfigCreationButton wrapperElement="Create Machine Config" />,
      icon: <FileOutlined />,
    });

  if (params.canCreateFolder)
    defaultDropdownItems.push({
      key: 'create-folder',
      label: <FolderCreationButton wrapperElement="Create Folder" />,
      icon: <FolderOutlined />,
    });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      // sorter: (a, b) => a.name.value.localeCompare(b.name.value),
    },
  ];

  return (
    <>
      <Bar
        leftNode={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {!breakpoint.xs && (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: defaultDropdownItems,
                  }}
                >
                  <Button type="primary" icon={<AiOutlinePlus />}>
                    New
                  </Button>
                </Dropdown>
              )}

              <SelectionActions count={selectedRowKeys.length}>
                <Button style={{ marginLeft: '4px' }}>Create Folder with Selection</Button>
                <Button style={{ marginLeft: '4px' }}>Delete Selected Items</Button>
                <Button style={{ marginLeft: '4px' }}>Export Selected Items</Button>
              </SelectionActions>
            </span>

            {/*<span>
                <Space.Compact className={breakpoint.xs ? styles.MobileToggleView : undefined}>
                  <Button
                    style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                    onClick={() => addPreferences({ 'icon-view-in-process-list': false })}
                  >
                    <UnorderedListOutlined />
                  </Button>
                  <Button
                    style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                    onClick={() => addPreferences({ 'icon-view-in-process-list': true })}
                  >
                    <AppstoreOutlined />
                  </Button>
                </Space.Compact>
              </span>*/}
          </span>
        }
        searchProps={{
          onChange: (e) => setSearchTerm(e.target.value),
          onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
          placeholder: 'Search Machine Configs ...',
        }}
      />
      <ElementList
        data={filteredData as unknown as MachineConfig[]}
        columns={columns}
        elementSelection={{
          selectedElements: selectedRowElements,
          setSelectionElements: setSelectedRowElements,
        }}
        /*selectableColumns={{
          setColumnTitles: (cols) => {
            if (typeof cols === 'function') cols = cols(selectedColumns as string[]);

            addPreferences({ 'process-list-columns-desktop': cols });
          },
          selectedColumnTitles: selectedColumns as string[],
          allColumnTitles: ColumnHeader,
          columnProps: {
            width: 'fit-content',
            responsive: ['xl'],
            render: (id, record) =>
                <Row justify="space-evenly" className={styles.HoverableTableCell}>
                  {actionBarGenerator(record)}
                </Row>
          },
        }}*/
        tableProps={{
          onRow: (item) => ({
            onDoubleClick: () =>
              router.push(
                /* item.type === 'folder'
                  ? `/${space.spaceId}/machine-config/folder/${item.id}`
                  : `/${space.spaceId}/machine-config/${item.id}`, */
                `/${space.spaceId}/machine-config/${item.id}`,
              ),
            /* onContextMenu: () => {
              if (selection.includes(item.id)) {
                setContextMenuItem(selectedElements);
              } else {
                setSelectionElements([item]);
                setContextMenuItem([item]);
              }
            }, */
          }),
        }}
      />
    </>
  );
};

export default MachineConfigList;
