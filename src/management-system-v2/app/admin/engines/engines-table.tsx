'use client';

import { useState } from 'react';
import ElementList from '@/components/item-list-view';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import Link from 'next/link';
import { Engine as DBEngine } from '@prisma/client';

export default function EnginesTable({ engines: _engines }: { engines: DBEngine[] }) {
  const engines = _engines.map((engine) => ({
    ...engine,
    name: engine.id,
  }));

  const { filteredData, searchQuery, setSearchQuery } = useFuzySearch({
    data: engines,
    keys: ['name'],
    highlightedKeys: ['name'],
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

      <ElementList<(typeof filteredData)[0]>
        data={filteredData}
        elementSelection={{
          selectedElements: selectedEngines,
          setSelectionElements: setSelectedEngines,
        }}
        columns={[
          {
            title: 'Engine ID',
            dataIndex: 'name',
            render: (_, engine) => (
              <Link href={`/admin/engines/${engine.id}`} style={{ color: 'black' }}>
                {engine.name.highlighted}
              </Link>
            ),
          },
          {
            title: 'Type',
            dataIndex: 'type',
            render: (_, engine) => (engine.address.startsWith('mqtt') ? 'MQTT' : 'HTTP'),
          },
        ]}
      />
    </>
  );
}
