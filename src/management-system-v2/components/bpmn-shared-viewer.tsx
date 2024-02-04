'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback, use } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { Button, message, Tooltip, Typography, Table } from 'antd';
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

import {
  getMetaDataFromElement,
  getMilestonesFromElement,
  getElementDI,
} from '@proceed/bpmn-helper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

const ToastEditor: Promise<typeof ToastEditorType> =
  typeof window !== 'undefined'
    ? import('@toast-ui/editor').then((mod) => mod.Editor)
    : (Promise.resolve(null) as any);

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
  isContainer: boolean;
  milestones?: {
    id: string;
    name: string;
    description?: string;
  }[];
  meta?: {
    [key: string]: any;
  };
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;

  // prevent unnecessary changes to the bpmn ref on rerender so the BpmnCanvas does not reload the bpmn without it actually changing
  const bpmn = useMemo(() => {
    return { bpmn: processBpmn };
  }, [processBpmn]);

  const bpmnViewer = useRef<BPMNCanvasRef>(null);

  const [finishedInitialLoading, setFinishedInitialLoading] = useState(false);
  // a hierarchy of the process elements as it should be displayed in the final document containing meta information for each element
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();

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

  const Editor = use(ToastEditor);

  useEffect(() => {
    if (finishedInitialLoading && bpmnViewer.current) {
      // transforms an element into a representation that contains the necessary meta information that should be presented in on this page
      async function transform(
        el: any, // the element to transform
        definitions: any, // the defintitions element at the root of the process tree
        currentRootId?: string, // the layer the current element is in (e.g. the root process/collaboration or a collapsed sub-process)
      ): Promise<ElementInfo> {
        let svg;
        let name = el.name || `<${el.id}>`;
        const isContainer = isAny(el, [
          'bpmn:Collaboration',
          'bpmn:Process',
          'bpmn:Participant',
          'bpmn:SubProcess',
        ]);

        if (isType(el, 'bpmn:Participant')) {
          name = 'Participant: ' + name;
        } else if (isType(el, 'bpmn:SubProcess')) {
          name = 'Subprocess: ' + name;
        }

        if (isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process')) {
          svg = await getSVGFromBPMN(processData.bpmn!);
        } else if (isType(el, 'bpmn:SubProcess') && !getElementDI(el, definitions).isExpanded) {
          // getting the whole layer for a collapsed sub-process
          svg = await getSVGFromBPMN(processData.bpmn!, el.id);
          // set the new root for the following export of any children contained in this layer
          currentRootId = el.id;
        } else {
          const elementsToShow = [el.id];
          // show incoming/outgoing sequence flows for the current element
          if (el.outgoing?.length) elementsToShow.push(el.outgoing[0].id);
          if (el.incoming?.length) elementsToShow.push(el.incoming[0].id);
          svg = await getSVGFromBPMN(processData.bpmn!, currentRootId, elementsToShow);
        }

        // try to establish a link between an element in a root layer and the sub-chapter for this element

        const svgDom = new DOMParser().parseFromString(svg, 'image/svg+xml');
        const domEls = svgDom.querySelectorAll(`[data-element-id]`);
        Array.from(domEls).forEach((el) => {
          // add a title to the svg element so a user can see its id or name when hovering over it
          const elementId = el.getAttribute('data-element-id');
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          const viewerEl = bpmnViewer.current?.getElement(elementId!);
          title.textContent = viewerEl?.businessObject.name || `<${elementId}>`;
          el.appendChild(title);
          if (isContainer) {
            const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
            // wrapping the parent g element in a link to link to the correct subchapter (wrapping the element itself leads to container elements not being rendered correctly)
            el?.parentElement?.parentElement?.appendChild(link);
            link.appendChild(el.parentElement as Element);
            link.setAttribute('href', `#${elementId}_page`);
          }
        });
        svg = new XMLSerializer().serializeToString(svgDom);

        let children: ElementInfo[] | undefined = [];

        // recursively transform any children of this element
        if (isType(el, 'bpmn:Collaboration')) {
          children = await asyncMap(el.participants, (participant) =>
            transform(participant, definitions, currentRootId),
          );
        } else if (isType(el, 'bpmn:Participant')) {
          if (el.processRef.flowElements) {
            children = await asyncMap(
              el.processRef.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow')),
              (participant) => transform(participant, definitions, currentRootId),
            );
          }
        } else {
          if (el.flowElements) {
            children = await asyncMap(
              el.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow')),
              (participant) => transform(participant, definitions, currentRootId),
            );
          }
        }

        // get the meta data to show in the (sub-)chapter of the element
        const meta = getMetaDataFromElement(el);

        const milestones = getMilestonesFromElement(el).map(({ id, name, description }) => {
          if (description) {
            const div = document.createElement('div');
            const editor = new Editor({ el: div });
            editor.setMarkdown(description);
            description = editor.getHTML();
          }

          return { id, name, description };
        });

        let description: string | undefined = undefined;
        const documentation = el.documentation?.find((el: any) => el.text)?.text;
        if (documentation) {
          const div = document.createElement('div');
          const editor = new Editor({ el: div });
          editor.setMarkdown(documentation);
          description = editor.getHTML();
        }

        // ignore elements that have no meta information in creation of sub-chapters
        // TODO: how to handle container elements that have no meta information
        // children = children.filter(
        //   (el) => el.children?.length || el.description || el.milestones || el.meta,
        // );

        children.sort((a, b) => {
          return !a.isContainer ? -1 : !b.isContainer ? 1 : 0;
        });

        return {
          svg,
          id: el.id,
          name,
          description,
          isContainer,
          meta: Object.keys(meta).length ? meta : undefined,
          milestones: milestones.length ? milestones : undefined,
          children,
        };
      }

      const canvas = bpmnViewer.current.getCanvas();
      const root = canvas.getRootElement();

      transform(root.businessObject, root.businessObject.$parent, undefined).then((rootElement) => {
        setProcessHierarchy(rootElement);
      });
    }
  }, [finishedInitialLoading, Editor]);

  // trigger the build of the document when the viewer has finished loading the bpmn
  const handleOnLoad = useCallback(() => setFinishedInitialLoading(true), []);

  // transform the document data into a table of contents
  function getTableOfContents(hierarchyElement: ElementInfo) {
    return (
      <ul key={`${hierarchyElement.id}_content_table_entry`}>
        <li>
          <a href={`#${hierarchyElement.id}_page`}>
            {hierarchyElement.name || `<${hierarchyElement.id}>`}
          </a>
          {hierarchyElement.description && (
            <ul>
              <li>
                <a href={`#${hierarchyElement.id}_description_page`}>General Description</a>
              </li>
            </ul>
          )}
          {hierarchyElement.meta && (
            <ul>
              <li>
                <a href={`#${hierarchyElement.id}_meta_page`}>Meta Data</a>
              </li>
            </ul>
          )}
          {hierarchyElement.milestones && (
            <ul>
              <li>
                <a href={`#${hierarchyElement.id}_milestone_page`}>Milestones</a>
              </li>
            </ul>
          )}
          {hierarchyElement.children?.map((child) => getTableOfContents(child))}
        </li>
      </ul>
    );
  }

  const tableOfContents = processHierarchy ? getTableOfContents(processHierarchy) : <></>;

  // transform the document data into the respective pages of the document
  const processPages: React.JSX.Element[] = [];
  function getContent(hierarchyElement: ElementInfo, pages: React.JSX.Element[]) {
    pages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={hierarchyElement.isContainer ? styles.ContainerPage : styles.ElementPage}
      >
        <div className={styles.ElementOverview}>
          <h1 id={`${hierarchyElement.id}_page`}>
            {hierarchyElement.name || `<${hierarchyElement.id}>`}
          </h1>
          <div
            className={styles.ElementCanvas}
            dangerouslySetInnerHTML={{ __html: hierarchyElement.svg }}
          ></div>
        </div>
        {hierarchyElement.description && (
          <div className={styles.ElementDescription}>
            <h2 id={`${hierarchyElement.id}_description_page`}>General Description</h2>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: hierarchyElement.description }}
            ></div>
          </div>
        )}
        {hierarchyElement.meta && (
          <div className={styles.ElementMeta}>
            <h2 id={`${hierarchyElement.id}_meta_page`}>Meta Data</h2>
            <Table
              style={{ width: '90%', margin: 'auto' }}
              pagination={false}
              rowKey="key"
              columns={[
                { title: 'Name', dataIndex: 'key', key: 'key' },
                { title: 'Value', dataIndex: 'val', key: 'value' },
              ]}
              dataSource={Object.entries(hierarchyElement.meta).map(([key, val]) => ({ key, val }))}
            />
          </div>
        )}
        {hierarchyElement.milestones && (
          <div className={styles.ElementMilestones}>
            <h2 id={`${hierarchyElement.id}_milestone_page`}>Milestones</h2>
            <Table
              style={{ width: '90%', margin: 'auto' }}
              pagination={false}
              rowKey="id"
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id' },
                { title: 'Name', dataIndex: 'name', key: 'name' },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  key: 'description',
                  render: (value) => (
                    <div
                      className="toastui-editor-contents"
                      dangerouslySetInnerHTML={{ __html: value }}
                    ></div>
                  ),
                },
              ]}
              dataSource={hierarchyElement.milestones}
            />
          </div>
        )}
      </div>,
    );
    hierarchyElement.children?.forEach((child) => getContent(child, pages));
  }

  processHierarchy && getContent(processHierarchy, processPages);

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
                Add to your Processes
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
            <div className={styles.TitlePage}>
              <h1 style={{ fontSize: '4em', marginBottom: '0' }}>{processData.name}</h1>
              <h2>Owner: {processData.owner.split('|').pop()}</h2>
              <h2>Version: Latest</h2>
              <h2>Last Edit: {processData.lastEdited}</h2>
            </div>
            <div className={styles.TableOfContents}>
              <h2>Table Of Contents</h2>
              {tableOfContents}
            </div>
            {...processPages}
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default BPMNSharedViewer;
