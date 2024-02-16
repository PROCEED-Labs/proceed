'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback, use } from 'react';
import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { Button, message, Tooltip, Typography, Space, Grid } from 'antd';

const { Text } = Typography;

import { PrinterOutlined } from '@ant-design/icons';

import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Content from '@/components/content';
import { copyProcesses } from '@/lib/data/processes';
import { getProcess } from '@/lib/data/legacy/process';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from '../../components/bpmn-canvas';

import { addTooltipsAndLinksToSVG, getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';

import {
  getMetaDataFromElement,
  getMilestonesFromElement,
  getElementDI,
  getRootFromElement,
  getDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

import SettingsModal, { settingsOptions, SettingsOption } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';
import ProcessDocument, { VersionInfo } from './process-document';

const ToastEditor: Promise<typeof ToastEditorType> =
  typeof window !== 'undefined'
    ? import('@toast-ui/editor').then((mod) => mod.Editor)
    : (Promise.resolve(null) as any);

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: Awaited<ReturnType<typeof getProcess>>;
  embeddedMode?: boolean;
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<SettingsOption>(settingsOptions);

  const processBpmn = processData.bpmn;

  // prevent unnecessary changes to the bpmn ref on rerender so the BpmnCanvas does not reload the bpmn without it actually changing
  const bpmn = useMemo(() => {
    return { bpmn: processBpmn };
  }, [processBpmn]);

  const bpmnViewer = useRef<BPMNCanvasRef>(null);
  const mainContent = useRef<HTMLElement>(null);

  const [finishedInitialLoading, setFinishedInitialLoading] = useState(false);
  // a hierarchy of the process elements as it should be displayed in the final document containing meta information for each element
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

  if (!processData.shared) {
    return <Text type="danger">Process is no longer shared</Text>;
  }

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
        let planeSvg;
        let name = el.name || `<${el.id}>`;

        const isContainer = isAny(el, [
          'bpmn:Collaboration',
          'bpmn:Process',
          'bpmn:Participant',
          'bpmn:SubProcess',
        ]);

        if (isAny(el, ['bpmn:Collaboration', 'bpmn:Process'])) {
          name = 'Process Diagram';
        } else if (isType(el, 'bpmn:Participant')) {
          name = 'Pool: ' + name;
        } else if (isType(el, 'bpmn:SubProcess')) {
          name = 'Subprocess: ' + name;
        }

        if (isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process')) {
          // get the svg representation of the root plane
          svg = await getSVGFromBPMN(processData.bpmn!);
        } else {
          const elementsToShow = [el.id];
          // show incoming/outgoing sequence flows for the current element
          if (el.outgoing?.length) elementsToShow.push(el.outgoing[0].id);
          if (el.incoming?.length) elementsToShow.push(el.incoming[0].id);
          // get the representation of the element (and its incoming/outgoing sequence flows) as seen in the current plane
          svg = await getSVGFromBPMN(processData.bpmn!, currentRootId, elementsToShow);

          if (isType(el, 'bpmn:SubProcess') && !getElementDI(el, definitions).isExpanded) {
            // getting the whole layer for a collapsed sub-process
            planeSvg = addTooltipsAndLinksToSVG(
              await getSVGFromBPMN(processData.bpmn!, el.id),
              (id) => bpmnViewer.current?.getElement(id)?.businessObject.name,
              isContainer ? (elementId) => `#${elementId}_page` : undefined,
            );
            // set the new root for the following export of any children contained in this layer
            currentRootId = el.id;
          }
        }

        // add links from elements in the diagram to (sub-)chapters for those elements and tooltips that show element names or ids
        svg = addTooltipsAndLinksToSVG(
          svg,
          (id) => bpmnViewer.current?.getElement(id)?.businessObject.name,
          isContainer ? (elementId) => `#${elementId}_page` : undefined,
        );

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

        function getHtmlFromMarkdown(markdown: string) {
          const div = document.createElement('div');
          const editor = new Editor({ el: div });
          editor.setMarkdown(markdown);
          return editor.getHTML();
        }

        const milestones = getMilestonesFromElement(el).map(({ id, name, description }) => {
          if (description) {
            description = getHtmlFromMarkdown(description);
          }

          return { id, name, description };
        });

        let description: string | undefined = undefined;
        const documentation = el.documentation?.find((el: any) => el.text)?.text;
        if (documentation) {
          description = getHtmlFromMarkdown(documentation);
        }

        // sort so that elements that contain no other elements come first and elements containing others come after
        children.sort((a, b) => {
          return !a.isContainer ? -1 : !b.isContainer ? 1 : 0;
        });

        return {
          svg,
          planeSvg,
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

      const definitions = getRootFromElement(root.businessObject);
      getDefinitionsVersionInformation(definitions).then(({ version, name, description }) =>
        setVersionInfo({ id: version, name, description }),
      );

      transform(root.businessObject, root.businessObject.$parent, undefined).then((rootElement) => {
        setProcessHierarchy(rootElement);
      });
    }
  }, [finishedInitialLoading, Editor]);

  // trigger the build of the document when the viewer has finished loading the bpmn
  const handleOnLoad = useCallback(() => setFinishedInitialLoading(true), []);

  const activeSettings: Partial<{ [key in (typeof checkedSettings)[number]]: boolean }> =
    Object.fromEntries(checkedSettings.map((key) => [key, true]));

  return (
    <div className={styles.ProcessOverview}>
      <Layout hideSider={true} layoutMenuItems={[]}>
        <Content
          headerLeft={
            <div>
              <Space>
                <Button
                  size="large"
                  onClick={() => {
                    router.push('/processes');
                  }}
                >
                  Go to PROCEED
                </Button>
                {!embeddedMode && (
                  <Button size="large" onClick={handleCopyToOwnWorkspace}>
                    Add to your Processes
                  </Button>
                )}
                <Tooltip title="Print">
                  <Button size="large" icon={<PrinterOutlined />} onClick={() => window.print()} />
                </Tooltip>
                <SettingsModal checkedSettings={checkedSettings} onConfirm={setCheckedSettings} />
              </Space>
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
          <div className={styles.MainContent} ref={mainContent}>
            <div className={styles.ProcessInfoCol}>
              <ProcessDocument
                settings={activeSettings}
                processHierarchy={processHierarchy}
                processData={processData}
                version={versionInfo}
              />
            </div>
            {/* TODO: Still Buggy when the table of contents is bigger than the page */}
            {breakpoint.lg && (
              <div className={styles.ContentTableCol}>
                <TableOfContents
                  settings={activeSettings}
                  processHierarchy={processHierarchy}
                  affix={true}
                  getContainer={() => mainContent.current}
                  targetOffset={100}
                />
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default BPMNSharedViewer;
