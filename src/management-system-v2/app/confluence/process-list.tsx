'use client';

import DynamicTable from '@atlaskit/dynamic-table';
import TextField from '@atlaskit/textfield';
import { useEffect, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import '@atlaskit/css-reset';
import { CheckboxSelect } from '@atlaskit/select';
import { Col, Row } from 'antd';
import { Process } from '@/lib/data/process-schema';

import TagGroup from '@atlaskit/tag-group';
import Tag, { SimpleTag } from '@atlaskit/tag';

export type ConfluenceProceedProcess = Process & { container: string[] };

const ProcessList = ({
  processes: initialProcesses,
  ActionButtons,
}: {
  processes: ConfluenceProceedProcess[] | Process[];
  ActionButtons: any;
}) => {
  useEffect(() => {
    setProcesses([...initialProcesses]);
  }, [initialProcesses]);

  const [processes, setProcesses] = useState([...initialProcesses]);

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
        key: 'container' + process.id,
        content:
          'container' in process ? (
            <TagGroup>
              {process.container.map((containerItem) => (
                <SimpleTag key={process.id + '-' + containerItem} text={containerItem} href="/" />
              ))}
            </TagGroup>
          ) : (
            ''
          ),
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
        <Col span={16}>
          <TextField
            appearance="standard"
            placeholder="Search for Process"
            style={{ width: '200px' }}
            elemAfterInput={<SearchIcon label="Search" size="medium"></SearchIcon>}
          ></TextField>
        </Col>
        <Col span={8}>
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
