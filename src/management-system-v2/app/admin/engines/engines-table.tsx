'use client';

import { useState } from 'react';
import ElementList from '@/components/item-list-view';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import { Engine } from '@/lib/engines/machines';
import Link from 'next/link';

export default function EnginesTable({ engines }: { engines: Engine[] }) {
  const { filteredData, searchQuery, setSearchQuery } = useFuzySearch({
    data: engines,
    keys: ['id', 'type'],
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
            render: (_, engine: any) => (
              <Link href={`/admin/engines/${engine.id}`}>{engine.id.highlighted}</Link>
            ),
          },
          {
            title: 'Type',
            dataIndex: 'type',
            render: (_, engine) => engine.type,
          },
        ]}
      />
    </>
  );
}
