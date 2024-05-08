'use client';

import { Button, Dropdown, Grid } from 'antd';
import { AiOutlinePlus } from 'react-icons/ai';
import Bar from '@/components/bar';
import SelectionActions from '@/components/selection-actions';
import { useState } from 'react';
import { MachineConfig } from '@/lib/data/machine-config-schema';
import useFuzySearch from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';

const MachineConfigList = ({ data }: { data: MachineConfig[] }) => {
  const breakpoint = Grid.useBreakpoint();
  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data,
    keys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [selectedRowElements, setSelectedRowElements] = useState<MachineConfig[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);

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
                    items: [],
                  }}
                >
                  <Button type="primary" icon={<AiOutlinePlus />}>
                    New
                  </Button>
                </Dropdown>
              )}

              <SelectionActions count={selectedRowKeys.length}>
                <Button style={{ marginLeft: '4px' }}>Do Something</Button>
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
      />
    </>
  );
};

export default MachineConfigList;
