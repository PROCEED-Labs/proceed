'use client';

import DynamicTable from '@atlaskit/dynamic-table';
import TextField from '@atlaskit/textfield';
import { useEffect, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import '@atlaskit/css-reset';
import { CheckboxSelect } from '@atlaskit/select';
import { Col, Row } from 'antd';
import { Process } from '@/lib/data/process-schema';

const ProcessList = ({
  processes: initialProcesses,
  ActionButtons,
}: {
  processes: Process[];
  ActionButtons: any;
}) => {
  const confluenceMockProcesses = [
    {
      id: '1',
      name: 'Process A',
      description: 'This is a process',
      origin: 'Confluence',
      container: 'Test Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
    {
      id: '2',
      name: 'Process B',
      description: 'This is a process',
      origin: 'Confluence',
      container: 'Process Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
    {
      id: '3',
      name: 'Process C',
      description: 'This is another process',
      origin: 'Confluence',
      container: 'Test Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
  ];

  useEffect(() => {
    setProcesses([...initialProcesses, ...confluenceMockProcesses]);
  }, [initialProcesses]);

  const [processes, setProcesses] = useState([...initialProcesses, ...confluenceMockProcesses]);

  // applied as rows in the form
  const rows = processes.map((process, index) => ({
    key: `row-${index}-${process.name}`,
    cells: [
      {
        key: process.name,
        content: process.name,
      },
      {
        key: 'description' + process.description + process.id,
        content: process.description,
      },
      {
        key: 'origin' + process.id,
        content: 'origin' in process ? process.origin : 'PROCEED',
      },
      {
        key: 'container' + process.id,
        content: 'container' in process ? <a href="">{process.container}</a> : '',
      },
      {
        key: 'lastEdited' + process.lastEdited + process.id,
        content: new Date(process.lastEdited).toLocaleString(),
      },
      {
        key: 'createdOn' + process.createdOn + process.id,
        content: new Date(process.createdOn).toLocaleDateString(),
      },
      {
        key: 'action' + process.id,
        content: <ActionButtons process={process}></ActionButtons>,
      },
    ],
  }));

  const head = {
    cells: [
      {
        key: 'name',
        content: 'Name',
        isSortable: true,
      },
      {
        key: 'description',
        content: 'Description',
        shouldTruncate: true,
        isSortable: true,
      },
      {
        key: 'origin',
        content: 'Origin',
        isSortable: true,
      },
      {
        key: 'container',
        content: 'Container',
        isSortable: true,
      },
      {
        key: 'lastEdited',
        content: 'Last Edited',
        isSortable: true,
      },
      {
        key: 'createdOn',
        content: 'Created On',
        isSortable: true,
      },
      {
        key: 'actions',
        content: '',
        width: 10,
      },
    ],
  };

  const onSearch = (value: string, _e: any, info?: { source?: 'input' | 'clear' | undefined }) => {
    console.log(info?.source, value);
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: '1rem' }}>
        <Col span={8}>
          <TextField
            appearance="standard"
            placeholder="Search for Process"
            style={{ width: '200px' }}
            elemAfterInput={<SearchIcon label="Search" size="medium"></SearchIcon>}
          ></TextField>
        </Col>
        <Col span={4}>
          <CheckboxSelect
            isClearable={false}
            placeholder="Filter for Processes"
            options={[
              { label: 'PROCEED', value: 'PROCEED' },
              { label: 'This Space', value: 'space' },
              { label: 'Own', value: 'own' },
            ]}
          ></CheckboxSelect>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <DynamicTable
            head={head}
            rows={rows}
            rowsPerPage={5}
            defaultPage={1}
            loadingSpinnerSize="large"
          />
        </Col>
      </Row>
    </>
  );
};

export default ProcessList;
