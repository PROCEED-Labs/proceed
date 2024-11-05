'use client';

import { Tag } from 'antd';
import { useState } from 'react';
import { type TableEngine } from './page';
import ElementList from '@/components/item-list-view';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';

export default function EnginesTable({ engines }: { engines: TableEngine[] }) {
  const { filteredData, searchQuery, setSearchQuery } = useFuzySearch({
    data: engines,
    keys: ['engineId'],
    highlightedKeys: ['engineId'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [selectedEngines, setSelectedEngines] = useState<typeof filteredData>([]);

  return (
    <>
      <Bar
        searchProps={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          onPressEnter: (e) => setSearchQuery(e.currentTarget.value),
          placeholder: 'Search spaces ...',
        }}
      />

      <ElementList
        data={filteredData}
        elementSelection={{
          selectedElements: selectedEngines,
          setSelectionElements: setSelectedEngines,
        }}
        columns={[
          {
            title: 'Engine ID',
            dataIndex: 'name',
            render: (_, engine) => engine.engineId.highlighted,
          },
          {
            title: 'Status',
            dataIndex: 'owner',
            sorter: (a, b) => +a.running - +b.running,
            render: (_, engine) => (
              <Tag color={engine.running ? 'success' : 'error'}>
                {engine.running ? 'Online' : 'Offline'}
              </Tag>
            ),
          },
        ]}
      />
    </>
  );
}
