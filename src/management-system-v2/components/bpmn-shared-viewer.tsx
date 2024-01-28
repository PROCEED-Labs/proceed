'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

import { Button, message, Tooltip, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

import Layout from '@/components/layout';
import Content from '@/components/content';
import { copyProcesses } from '@/lib/data/processes';
import { getProcess } from '@/lib/data/legacy/process';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';

import { getMetaDataFromElement, getElementDI } from '@proceed/bpmn-helper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: Awaited<ReturnType<typeof getProcess>>;
  embeddedMode?: boolean;
};

type ElementInfo = {
  svg: string;
  name?: string;
  id: string;
  description?: string;
  children?: ElementInfo[];
  meta: {
    [key: string]: any;
  };
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;
  const bpmn = useMemo(() => {
    return { bpmn: processBpmn };
  }, [processBpmn]);

  const bpmnViewer = useRef<BPMNCanvasRef>(null);

  const [finishedInitialLoading, setFinishedInitialLoading] = useState(false);
  const [elements, setElements] = useState<ElementInfo>();

  const handleCopyToOwnWorkspace = async () => {
    if (session.status === 'unauthenticated') {
      const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}`;
      const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

      router.replace(loginPath);
    }
    const res = await copyProcesses([
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
      },
    ]);
    if ('error' in res) {
      message.error(res.error.message);
      return res;
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      //router.push(`/processes/${newDefinitionID}`);
      if (res.length == 1) router.push(`/processes/${res[0].id}`);
    }
  };

  useEffect(() => {
    if (finishedInitialLoading && bpmnViewer.current) {
      async function transform(
        el: any,
        definitions: any,
        currentRootId?: string,
      ): Promise<ElementInfo> {
        let svg;

        if (el.$type === 'bpmn:Collaboration' || el.$type === 'bpmn:Process') {
          svg = await getSVGFromBPMN(processData.bpmn!);
        } else if (el.$type === 'bpmn:SubProcess' && !getElementDI(el, definitions).isExpanded) {
          console.log(el);
          svg = await getSVGFromBPMN(processData.bpmn!, el.id);
          currentRootId = el.id;
        } else {
          svg = await getSVGFromBPMN(processData.bpmn!, currentRootId, [el.id]);
        }

        let children: ElementInfo[] | undefined = [];

        if (el.$type === 'bpmn:Collaboration') {
          children = await asyncMap(el.participants, (participant) =>
            transform(participant, definitions, currentRootId),
          );
        } else if (el.$type === 'bpmn:Participant') {
          if (el.processRef.flowElements) {
            children = await asyncMap(el.processRef.flowElements, (participant) =>
              transform(participant, definitions, currentRootId),
            );
          }
        } else {
          if (el.flowElements) {
            children = await asyncMap(el.flowElements, (participant) =>
              transform(participant, definitions, currentRootId),
            );
          }
        }

        return {
          svg,
          id: el.id,
          name: el.name,
          description: el.documentation?.find((el: any) => el.text)?.text,
          meta: await getMetaDataFromElement(el),
          children,
        };
      }

      const canvas = bpmnViewer.current.getCanvas();
      const root = canvas.getRootElement();

      transform(root.businessObject, root.businessObject.$parent).then((rootElement) => {
        setElements(rootElement);
      });
    }
  }, [finishedInitialLoading]);

  const handleOnLoad = useCallback(() => setFinishedInitialLoading(true), []);

  console.log(elements);

  function getTableOfContents(entry: ElementInfo) {
    return (
      <ul key={`${entry.id}_content_table_entry`}>
        <li>
          <a href={`#${entry.id}_page`}>{entry.name || `<${entry.id}>`}</a>
          {entry.children?.map((child) => getTableOfContents(child))}
        </li>
      </ul>
    );
  }

  const tableOfContents = elements ? getTableOfContents(elements) : <></>;

  const processPages: React.JSX.Element[] = [];
  function getContent(entry: ElementInfo, pages: React.JSX.Element[]) {
    pages.push(
      <div key={`element_${entry.id}_page`} className={styles.ElementPage}>
        <div className={styles.ElementOverview}>
          <h1 id={`${entry.id}_page`}>{entry.name || `<${entry.id}>`}</h1>
          <div
            className={styles.ElementCanvas}
            dangerouslySetInnerHTML={{ __html: entry.svg }}
          ></div>
        </div>
        {entry.description && (
          <div className={styles.ElementDescription}>
            <h2 id={`${entry.id}_description_page`}>General Description</h2>
          </div>
        )}
        {entry.meta && (
          <div className={styles.ElementMeta}>
            <h2 id={`${entry.id}_meta_page`}>Meta Data</h2>
          </div>
        )}
      </div>,
    );
    entry.children?.forEach((child) => getContent(child, pages));
  }
  elements && getContent(elements, processPages);

  return (
    <div className={styles.ProcessOverview}>
      <Layout hideSider={true}>
        <Content
          headerLeft={
            <div>
              <Button
                size="large"
                onClick={() => {
                  router.push('/processes');
                }}
              >
                Go to PROCEED
              </Button>
              <Button size="large" onClick={handleCopyToOwnWorkspace}>
                Copy to own workspace
              </Button>
              <Tooltip title="Print">
                <Button size="large" icon={<PrinterOutlined />} onClick={() => window.print()} />
              </Tooltip>
            </div>
          }
          headerCenter={
            <Typography.Text strong style={{ padding: '0 5px' }}>
              {processData.name}
            </Typography.Text>
          }
        >
          <div style={{ display: 'none' }}>
            <BPMNCanvas
              onLoaded={handleOnLoad}
              ref={bpmnViewer}
              className={divProps.className}
              type={'viewer'}
              bpmn={bpmn}
            />
          </div>

          <div className={styles.ProcessDocument}>
            {/* <div className={styles.TitlePage}>
              <h1 style={{ fontSize: '8em', marginBottom: '0' }}>{processData.name}</h1>
              <h2>Owner: {processData.owner.split('|').pop()}</h2>
              <h2>Version: Latest</h2>
              <h2>Last Edit: {processData.lastEdited}</h2>
            </div> */}
            {/* <div className={styles.TableOfContents}>
              <h2>Table Of Contents</h2>
              {tableOfContents}
            </div> */}
            {...processPages}
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default BPMNSharedViewer;
