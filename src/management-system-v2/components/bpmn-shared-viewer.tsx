'use client';
import React, { useRef, useState, useEffect } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import Image from 'next/image';

import { Button, message, Table } from 'antd';
import { copyProcesses } from '@/lib/data/processes';
import { ApiData } from '@/lib/fetch-data';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

import { getMetaDataFromElement } from '@proceed/bpmn-helper/src/getters';

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: ApiData<'/process/{definitionId}', 'get'>;
  embeddedMode?: boolean;
};

type PlaneInfo = {
  svg: string;
  name: string;
  id: string;
  isSubprocess: boolean;
  children: string[];
  flowElements: {
    id: string;
    name?: string;
    description?: string;
    costsPlanned?: string;
    timePlannedDuration?: string;
  }[];
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;
  const bpmnViewer = useRef<BPMNCanvasRef>(null);

  const [finishedInitialLoading, setFinishedInitialLoading] = useState(false);
  const [processPlanes, setProcessPlanes] = useState<PlaneInfo[]>([]);
  const [currentPlaneId, setCurrentPlaneId] = useState('');

  const handleCopyToOwnWorkspace = async () => {
    if (session.status === 'unauthenticated') {
      const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}`;
      const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

      router.replace(loginPath);
    }
    const res = await copyProcesses([
      {
        definitionName: processData.definitionName,
        description: processData.description,
        originalId: processData.definitionId,
      },
    ]);
    if ('error' in res) {
      message.error(res.error.message);
      return res;
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      //router.push(`/processes/${newDefinitionID}`);
      if (res.length == 1) router.push(`/processes/${res[0].definitionId}`);
    }
  };

  useEffect(() => {
    if (finishedInitialLoading && bpmnViewer.current) {
      const canvas = bpmnViewer.current.getCanvas();
      const initialRoot = canvas.getRootElement();
      const rootElements = canvas.getRootElements();
      asyncMap(rootElements, async (rootEl) => {
        canvas.setRootElement(rootEl);
        canvas.zoom('fit-viewport', { x: 0, y: 0 });

        let flowElements = await asyncMap(rootEl.di.planeElement, async (diEl: any) => ({
          id: diEl.bpmnElement.id,
          name: diEl.bpmnElement.name,
          description: diEl.bpmnElement.documentation?.find((el: any) => el.text)?.text,
          ...(await getMetaDataFromElement(diEl.bpmnElement)),
        }));

        flowElements = flowElements.filter((el) =>
          Object.entries(el).some(([key, val]) => val && key !== 'name' && key !== 'id'),
        );

        console.log(flowElements);

        const children = rootEl.di.planeElement
          .filter((diEl: any) =>
            rootElements.some((rootEl) => rootEl.businessObject.id === diEl.bpmnElement.id),
          )
          .map((diEl: any) => diEl.bpmnElement.id);

        let svg = await getSVGFromBPMN(
          processBpmn,
          rootEl.businessObject.$type === 'bpmn:SubProcess' ? rootEl.businessObject.id : undefined,
        );
        const svgDom = new DOMParser().parseFromString(svg, 'image/svg+xml');

        flowElements.forEach(({ id }: { id: string }) => {
          const el = svgDom.querySelector(`[data-element-id='${id}']`);
          if (el) {
            console.log(el, id);
            const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
            el?.parentElement?.appendChild(link);
            link.appendChild(el as Element);
            link.setAttribute('href', `#meta-table-${id}`);
          }
        });

        console.log(svgDom);
        svg = new XMLSerializer().serializeToString(svgDom);

        if (rootEl.businessObject!.$type === 'bpmn:SubProcess') {
          return {
            isSubprocess: true,
            id: rootEl.businessObject.id,
            name: rootEl.businessObject.name || `[${rootEl.businessObject.id}]`,
            svg,
            children,
            flowElements,
          };
        } else {
          return {
            isSubprocess: false,
            id: processData.definitionId,
            name: processData.definitionName,
            svg,
            children,
            flowElements,
          };
        }
      }).then((subprocessPlanes) => {
        setProcessPlanes(subprocessPlanes);
        setCurrentPlaneId(processData.definitionId);
      });
    }
  }, [finishedInitialLoading]);

  type SubprocessEntry = { id: string; name: string; children: string[] | SubprocessEntry[] };
  const planeInfoMap: { [id: string]: SubprocessEntry } = Object.fromEntries(
    processPlanes.map(({ id, name, children }) => [id, { id, name, children }]),
  );
  Object.entries(planeInfoMap).forEach(([id, { children }]) => {
    planeInfoMap[id].children = children.map((id) => planeInfoMap[id as string]);
  });

  function getTableOfContents(entry: SubprocessEntry) {
    return (
      <ul key={`${entry.id}_content_table_entry`}>
        <li>
          <a href={`#${entry.id}_page`}>{entry.name}</a>
          {entry.children.map((child) => getTableOfContents(child as SubprocessEntry))}
        </li>
      </ul>
    );
  }

  const tableOfContents = planeInfoMap[processData.definitionId]
    ? getTableOfContents(planeInfoMap[processData.definitionId])
    : [];

  console.log(processPlanes);

  const metaTableColumns = [
    {
      title: 'Element',
      dataIndex: 'name',
      key: 'elementName',
      render: (_, { name, id }) => {
        return <span id={`meta-table-${id}`}>{name || id}</span>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Costs',
      dataIndex: 'costsPlanned',
      key: 'costs',
    },
    {
      title: 'Planned Time',
      dataIndex: 'timePlannedDuration',
      key: 'time',
    },
  ];

  const currentPlane = currentPlaneId && processPlanes.find((plane) => plane.id === currentPlaneId);
  console.log(currentPlane);
  return (
    <>
      <div className={styles.BpmnViewer}>
        <BPMNCanvas
          onLoaded={() => setFinishedInitialLoading(true)}
          onRootChange={(root) => {
            console.log(setCurrentPlaneId(root.businessObject.id));
          }}
          ref={bpmnViewer}
          className={divProps.className}
          type={'viewer'}
          bpmn={{ bpmn: processBpmn }}
        />
        {!!currentPlane && (
          <div>
            <Table
              style={{ width: '100%' }}
              rowKey="id"
              pagination={false}
              dataSource={currentPlane.flowElements}
              columns={metaTableColumns}
            />
          </div>
        )}
      </div>

      <div className={styles.ProcessOverviewPage}>
        {/* {!embeddedMode ? (
          <Button onClick={handleCopyToOwnWorkspace}>Copy to own workspace</Button>
        ) : null} */}
        <h1 className={styles.ContentTablePageHeader}>Contents</h1>
        <div className={styles.TableOfContents}>{tableOfContents}</div>

        {processPlanes.map(({ isSubprocess, name, id, svg, flowElements }) => (
          <div key={`${id}_page`}>
            <div id={`${id}_page`} className={styles.ProcessPage}>
              <div className={styles.ProceedLogo}>
                <Image src="/proceed-labs-logo.svg" alt="Proceed Logo" width="227" height="20" />
                <h3 style={{ marginRight: '2pt' }}>www.proceed-labs.org</h3>
              </div>

              <h1 style={{ marginBottom: 0 }}>{processData.definitionName}</h1>
              {isSubprocess && (
                <div style={{ display: 'flex', alignSelf: 'center' }}>
                  <h2>Subprocess:</h2> <h2>{name}</h2>
                </div>
              )}
              <div className={styles.ProcessCanvas} dangerouslySetInnerHTML={{ __html: svg }}></div>
            </div>
            {flowElements.length > 0 && (
              <div className={styles.ProcessMetaPage}>
                <Table
                  style={{ width: '100%' }}
                  rowKey="id"
                  pagination={false}
                  dataSource={flowElements}
                  columns={metaTableColumns}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default BPMNSharedViewer;
