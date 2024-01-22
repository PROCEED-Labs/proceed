'use client';
import React, { useRef, useState, useEffect } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import Image from 'next/image';

import { Button, message } from 'antd';
import { copyProcesses } from '@/lib/data/processes';
import { ApiData } from '@/lib/fetch-data';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: ApiData<'/process/{definitionId}', 'get'>;
  embeddedMode?: boolean;
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;
  const bpmnViewer = useRef<BPMNCanvasRef>(null);

  const [finishedInitialLoading, setFinishedInitialLoading] = useState(false);
  const [processPlanes, setProcessPlanes] = useState<
    { svg: string; name: string; id: string; isSubprocess: boolean; children: string[] }[]
  >([]);

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
      const rootElements = canvas.getRootElements();
      asyncMap(rootElements, async (rootEl) => {
        canvas.setRootElement(rootEl);
        canvas.zoom('fit-viewport', { x: 0, y: 0 });

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
        console.log(svgDom);
        children.forEach((id: string) => {
          const el = svgDom.querySelector(`[data-element-id='${id}']`);
          const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
          el?.parentElement?.appendChild(link);
          link.appendChild(el as Element);
          link.setAttribute('href', `#${id}_page`);
        });

        svg = new XMLSerializer().serializeToString(svgDom);

        if (rootEl.businessObject!.$type === 'bpmn:SubProcess') {
          return {
            isSubprocess: true,
            id: rootEl.businessObject.id,
            name: rootEl.businessObject.name || `[${rootEl.businessObject.id}]`,
            svg,
            children,
          };
        } else {
          return {
            isSubprocess: false,
            id: processData.definitionId,
            name: processData.definitionName,
            svg,
            children,
          };
        }
      }).then((subprocessPlanes) => setProcessPlanes(subprocessPlanes));
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

  return (
    <>
      <div style={{ display: 'none' }}>
        <BPMNCanvas
          onLoaded={() => setFinishedInitialLoading(true)}
          ref={bpmnViewer}
          className={divProps.className}
          type={'viewer'}
          bpmn={{ bpmn: processBpmn }}
        />
      </div>

      <div className={styles.ProcessOverviewPage}>
        {/* {!embeddedMode ? (
          <Button onClick={handleCopyToOwnWorkspace}>Copy to own workspace</Button>
        ) : null} */}
        <h1 className={styles.ContentTablePageHeader}>Contents</h1>
        <div className={styles.TableOfContents}>{tableOfContents}</div>

        {processPlanes.map(({ isSubprocess, name, id, svg }) => (
          <div id={`${id}_page`} className={styles.ProcessPage} key={`${id}_page`}>
            <Image
              className={styles.ProceedLogo}
              src="/proceed-labs-logo.svg"
              alt="Proceed Logo"
              width="227"
              height="20"
            />
            <h1 style={{ marginBottom: 0 }}>{processData.definitionName}</h1>
            {isSubprocess && (
              <div style={{ display: 'flex', alignSelf: 'center' }}>
                <h2>Subprocess:</h2> <h2>{name}</h2>
              </div>
            )}
            <div className={styles.ProcessCanvas} dangerouslySetInnerHTML={{ __html: svg }}></div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BPMNSharedViewer;
