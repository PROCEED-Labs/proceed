import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import { ReactNode, useRef } from 'react';
import { Button, Col, Drawer, Grid, Modal, Row, Tabs } from 'antd';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ElementDetails } from './element-details';
import InstanceVariables from './instance-variables';
import { ElementActivity } from './element-activity';
import { ElementOverview } from './element-overview';
import { StatusTag } from './status-tag';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import { InstanceSelector } from './instance-selector';

export function DisplayTable({ data }: { data: ReactNode[][] }) {
  // TODO: make this responsive
  return (
    <table
      style={{
        borderSpacing: '0 .5rem',
        borderCollapse: 'separate',
        width: '100%',
        tableLayout: 'fixed',
      }}
    >
      <colgroup>
        <col style={{ width: 150 }} />
        <col />
      </colgroup>
      <tbody>
        {data.map((row, idx_row) => (
          <tr key={idx_row}>
            {row.map((cell, idx_cell) => (
              <td
                key={`${idx_row}.${idx_cell}`}
                style={{
                  paddingRight: idx_cell < row.length - 1 ? '1rem' : '',
                  backgroundColor: idx_row % 2 ? '#f8f8f8' : '#fff',
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DataGrid({ data }: { data: ReactNode[][] }) {
  return (
    <>
      {data.map((row, idx_row) => (
        <Row key={'datarid' + idx_row} style={{ marginBlock: 8 }} wrap={false}>
          {row.length == 1 ? (
            <Col flex="auto">{row[0]}</Col>
          ) : (
            <>
              <Col
                flex="115px"
                style={{
                  fontWeight: 'bold',
                  justifyContent: 'left',
                  alignItems: 'baseline',
                  display: 'flex',
                }}
              >
                {row[0]}
              </Col>
              <Col
                flex="auto"
                style={{
                  marginLeft: 20,
                  alignItems: 'center',
                  display: 'flex',
                }}
              >
                {row[1]}
              </Col>
            </>
          )}
        </Row>
      ))}
    </>
  );
}

export default function InstanceInfoPanel({
  open,
  close,
  processId,
  version,
  instance,
  element,
  refetch,
}: {
  close: () => void;
  open: boolean;
  processId: string;
  version: { bpmn: string };
  instance?: {
    engines: {
      id: string;
      online: boolean;
    }[];
  } & ExtendedInstanceInfo;
  element?: ElementLike;
  refetch: () => void;
}) {
  const resizableElementRef = useRef<ResizableElementRefType>(null);
  const breakpoint = Grid.useBreakpoint();

  const title = element?.businessObject?.name || element?.id || 'How to PROCEED?';

  if (breakpoint.xl && !open) return null;

  const tabs = element ? (
    <Tabs
      defaultActiveKey="Overview"
      items={[
        {
          key: 'Overview',
          label: 'Overview',
          children: (
            <ElementOverview
              processId={processId}
              element={element}
              version={version}
              instance={instance}
            />
          ),
        },
        {
          key: 'Details',
          label: 'Details',
          children: (
            <ElementDetails
              processId={processId}
              element={element}
              version={version}
              instance={instance}
            />
          ),
        },
        {
          key: 'Data',
          label: 'Data',
          children: (
            <InstanceVariables
              refetch={refetch}
              processId={processId}
              version={version}
              instance={instance}
            />
          ),
        },
        {
          key: 'Milestones',
          label: 'Milestones',
          children: 'How to proceed',
        },
        {
          key: 'Activity',
          label: 'Activity',
          children: <ElementActivity processId={processId} element={element} instance={instance} />,
        },
      ]}
    />
  ) : null;

  // TODO to be determined by higher forces
  const hideFooter = true;

  return breakpoint.xl ? (
    <ResizableElement
      initialWidth={500}
      minWidth={400}
      maxWidth={'75vw'}
      style={{
        // BPMN.io Symbol with 23 px height + 15 px offset to bottom (=> 38 px), Footer with 32px and Header with 64px, Padding of Toolbar 12px (=> Total 146px)
        height: 'calc(100vh - 150px)',
        boxShadow: '0 3px 12px -4px rgba(0, 0, 0, 0.1), 0 6px 48px -2px rgba(0, 0, 0, 0.07)',
      }}
      ref={resizableElementRef}
    >
      <CollapsibleCard show={open} onCollapse={close} title={title} collapsedWidth="40px">
        {instance ? (
          <>
            <StatusTag processId={processId} element={element} instance={instance} />
            {tabs}
          </>
        ) : (
          <InstanceSelector />
        )}
      </CollapsibleCard>
    </ResizableElement>
  ) : (
    <Modal
      open={open}
      onCancel={close}
      onOk={close}
      title={title}
      width={breakpoint.xs ? '100vw' : '75vw'}
      styles={{ body: { height: '75vh', overflowY: 'scroll', paddingRight: '1rem' } }}
      centered
      footer={
        hideFooter ? null : (
          <Button key="ok" type="primary" onClick={close}>
            OK
          </Button>
        )
      }
    >
      {tabs}
    </Modal>
  );
}
