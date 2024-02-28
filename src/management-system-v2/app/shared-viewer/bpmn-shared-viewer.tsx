'use client';

import React, { useRef, useState, useEffect, useMemo, use } from 'react';
import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';
import type ViewerType from 'bpmn-js/lib/Viewer';
import ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import Canvas from 'diagram-js/lib/core/Canvas';
import schema from '@/lib/schema';

import { v4 } from 'uuid';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { Button, message, Tooltip, Typography, Space, Grid } from 'antd';

const { Text } = Typography;

import { PrinterOutlined } from '@ant-design/icons';

import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Content from '@/components/content';
import { copyProcesses } from '@/lib/data/processes';
import { getProcess } from '@/lib/data/legacy/process';
import { getProcessBPMN } from '@/lib/data/processes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { addTooltipsAndLinksToSVG, getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';

import {
  getMetaDataFromElement,
  getMilestonesFromElement,
  getElementDI,
  getRootFromElement,
  getDefinitionsVersionInformation,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
} from '@proceed/bpmn-helper';

import SettingsModal, { settingsOptions, SettingsOption } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';
import ProcessDocument, { VersionInfo } from './process-document';

const markdownEditor: Promise<ToastEditorType> =
  typeof window !== 'undefined'
    ? import('@toast-ui/editor')
        .then((mod) => mod.Editor)
        .then((Editor) => {
          const div = document.createElement('div');
          return new Editor({ el: div });
        })
    : (Promise.resolve(null) as any);

type BPMNSharedViewerProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  embeddedMode?: boolean;
  isOwner: boolean;
  defaultSettings?: SettingsOption;
};

/**
 * Returns the meta data to show in the (sub-)chapter of an element
 *
 * @param el the moddle object representing the element
 * @param mdEditor an instance of the toast markdown editor
 */
function getMetaDataFromBpmnElement(el: any, mdEditor: ToastEditorType) {
  const meta = getMetaDataFromElement(el);

  function getHtmlFromMarkdown(markdown: string) {
    mdEditor.setMarkdown(markdown);
    return mdEditor.getHTML();
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

  return {
    description,
    meta: Object.keys(meta).length ? meta : undefined,
    milestones: milestones.length ? milestones : undefined,
  };
}

const BPMNSharedViewer = ({
  processData,
  embeddedMode,
  isOwner,
  defaultSettings,
}: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<SettingsOption>(
    defaultSettings || settingsOptions,
  );

  const mainContent = useRef<HTMLDivElement>(null);
  const contentTableRef = useRef<HTMLDivElement>(null);

  // a hierarchy of the process elements as it should be displayed in the final document containing meta information for each element
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

  if (!isOwner && !processData.shared) {
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

  const mdEditor = use(markdownEditor);

  useEffect(() => {
    let viewerElement: HTMLDivElement;

    // transforms an element into a representation that contains the necessary meta information that should be presented in on this page
    async function transform(
      bpmnViewer: ViewerType,
      el: any, // the element to transform
      definitions: any, // the defintitions element at the root of the process tree
      currentRootId?: string, // the layer the current element is in (e.g. the root process/collaboration or a collapsed sub-process)
    ): Promise<ElementInfo> {
      let svg;
      let name = el.name || `<${el.id}>`;

      let nestedSubprocess;
      let importedProcess;

      const elementRegistry = bpmnViewer.get<ElementRegistry>('elementRegistry');

      const isContainer = isAny(el, [
        'bpmn:Collaboration',
        'bpmn:Process',
        'bpmn:Participant',
        'bpmn:SubProcess',
        'bpmn:CallActivity',
      ]);

      if (isAny(el, ['bpmn:Collaboration', 'bpmn:Process'])) {
        name = 'Process Diagram';
      } else if (isType(el, 'bpmn:Participant')) {
        name = 'Pool: ' + name;
      } else if (isType(el, 'bpmn:SubProcess')) {
        name = 'Subprocess: ' + name;
      } else if (isType(el, 'bpmn:CallActivity')) {
        name = 'Call Activity: ' + name;
      }

      const { meta, milestones, description } = getMetaDataFromBpmnElement(el, mdEditor);

      // stores the bpmn of an importing process when the importing process is loaded into the modeler in the case of a call activity
      let oldBpmn: string | undefined;

      if (isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process')) {
        // get the svg representation of the root plane
        svg = await getSVGFromBPMN(bpmnViewer);
      } else {
        const elementsToShow = [el.id];
        // show incoming/outgoing sequence flows for the current element
        if (el.outgoing?.length) elementsToShow.push(el.outgoing[0].id);
        if (el.incoming?.length) elementsToShow.push(el.incoming[0].id);
        // get the representation of the element (and its incoming/outgoing sequence flows) as seen in the current plane
        svg = await getSVGFromBPMN(bpmnViewer, currentRootId, elementsToShow);

        if (isType(el, 'bpmn:SubProcess') && !getElementDI(el, definitions).isExpanded) {
          nestedSubprocess = {
            // getting the whole layer for a collapsed sub-process
            planeSvg: addTooltipsAndLinksToSVG(
              await getSVGFromBPMN(bpmnViewer, el.id),
              (id) => elementRegistry.get(id)?.businessObject.name,
              isContainer ? (elementId) => `#${elementId}_page` : undefined,
            ),
          };
          // set the new root for the following export of any children contained in this layer
          currentRootId = el.id;
        } else if (isType(el, 'bpmn:CallActivity')) {
          // check if the call activity references another process
          let importDefinitionId: string | undefined;
          let version: number | undefined;
          try {
            ({ definitionId: importDefinitionId, version: version } =
              getTargetDefinitionsAndProcessIdForCallActivityByObject(
                getRootFromElement(el),
                el.id,
              ));
          } catch (err) {}

          if (importDefinitionId) {
            // remember the bpmn currently loaded into the viewer so we can return to it after getting the svg for the elements in the imported process
            ({ xml: oldBpmn } = await bpmnViewer.saveXML());

            // get the bpmn for the import and load it into the viewer
            const importBpmn = await getProcessBPMN(importDefinitionId, version);
            if (typeof importBpmn === 'string') {
              await bpmnViewer.importXML(importBpmn);

              // set the current element and layer to the root of the imported process
              const canvas = bpmnViewer.get<Canvas>('canvas');
              const root = canvas.getRootElement();
              el = root.businessObject;
              definitions = el.$parent;
              currentRootId = undefined;

              const {
                version,
                name: versionName,
                description: versionDescription,
              } = await getDefinitionsVersionInformation(definitions);

              importedProcess = {
                name: `Imported Process: ${definitions.name}`,
                ...getMetaDataFromBpmnElement(el, mdEditor),
                planeSvg: await getSVGFromBPMN(bpmnViewer),
                version,
                versionName,
                versionDescription,
              };
            }
          }
        }
      }

      // add links from elements in the diagram to (sub-)chapters for those elements and tooltips that show element names or ids
      svg = addTooltipsAndLinksToSVG(
        svg,
        (id) => elementRegistry.get(id)?.businessObject.name,
        isContainer ? (elementId) => `#${elementId}_page` : undefined,
      );

      let children: ElementInfo[] | undefined = [];

      // recursively transform any children of this element
      if (isType(el, 'bpmn:Collaboration')) {
        for (const participant of el.participants) {
          children.push(await transform(bpmnViewer, participant, definitions, currentRootId));
        }
      } else if (isType(el, 'bpmn:Participant')) {
        if (el.processRef.flowElements) {
          const flowElements = el.processRef.flowElements.filter(
            (el: any) => !isType(el, 'bpmn:SequenceFlow'),
          );
          for (const flowElement of flowElements) {
            if (isType(flowElement, 'bpmn:SequenceFlow')) continue;
            children.push(await transform(bpmnViewer, flowElement, definitions, currentRootId));
          }
        }
      } else {
        if (el.flowElements) {
          const flowElements = el.flowElements.filter(
            (el: any) => !isType(el, 'bpmn:SequenceFlow'),
          );
          for (const flowElement of flowElements) {
            if (isType(flowElement, 'bpmn:SequenceFlow')) continue;
            children.push(await transform(bpmnViewer, flowElement, definitions, currentRootId));
          }
        }
      }

      // sort so that elements that contain no other elements come first and elements containing others come after
      children.sort((a, b) => {
        const aIsContainer = !!a.children?.length;
        const bIsContainer = !!b.children?.length;
        return !aIsContainer ? -1 : !bIsContainer ? 1 : 0;
      });

      // if the current element was a call activity and the bpmn of the imported process was loaded => reset the viewer to the importing process
      if (oldBpmn) {
        await bpmnViewer.importXML(oldBpmn);
      }

      return {
        svg,
        id: el.id,
        name,
        description,
        meta,
        milestones,
        importedProcess,
        nestedSubprocess,
        children,
      };
    }

    import('bpmn-js/lib/Viewer')
      .then(async ({ default: Viewer }) => {
        //Creating temporary element for BPMN Viewer
        viewerElement = document.createElement('div');

        //Assiging process id to temp element and append to DOM
        viewerElement.id = 'canvas_' + v4();
        document.body.appendChild(viewerElement);

        //Create a viewer to transform the bpmn into an svg
        const viewer = new Viewer({
          container: '#' + viewerElement.id,
          moddleExtensions: {
            proceed: schema,
          },
        });
        await viewer.importXML(processData.bpmn!);
        return viewer;
      })
      .then(async (viewer) => {
        const canvas = viewer.get<Canvas>('canvas');
        const root = canvas.getRootElement();

        const definitions = getRootFromElement(root.businessObject);
        getDefinitionsVersionInformation(definitions).then(({ version, name, description }) =>
          setVersionInfo({ id: version, name, description }),
        );

        return await transform(viewer, root.businessObject, root.businessObject.$parent, undefined);
      })
      .then((rootElement) => {
        setProcessHierarchy(rootElement);
        document.body.removeChild(viewerElement);
      });
  }, [mdEditor]);

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      // open the print dialog automatically after everything has loaded when the page is opened from the export modal
      window.print();
    }
  }, [processHierarchy, defaultSettings]);

  const activeSettings: Partial<{ [key in (typeof checkedSettings)[number]]: boolean }> =
    Object.fromEntries(checkedSettings.map((key) => [key, true]));

  // automatically scrolls the content table if a link that becomes active is not currently visible due to the table being too long
  const handleContentTableChange = function (currentActiveLink: string) {
    if (contentTableRef.current) {
      const contentTableDiv = contentTableRef.current;

      // get the link that is currently being highlighted
      const activeLink = Array.from(contentTableDiv.getElementsByTagName('a')).find(
        (link) => link.href.split(link.baseURI)[1] === currentActiveLink,
      );

      if (activeLink) {
        const contentTableBox = contentTableDiv.getBoundingClientRect();
        const activeLinkBox = activeLink.getBoundingClientRect();

        // if the link is outside of the viewbox of the content table div scroll the div to show the link
        if (activeLinkBox.bottom > contentTableBox.bottom) {
          contentTableDiv.scrollBy({ top: activeLinkBox.bottom - contentTableBox.bottom });
        } else if (activeLinkBox.top < contentTableBox.top) {
          contentTableDiv.scrollBy({ top: activeLinkBox.top - contentTableBox.top });
        }
      }
    }
  };

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
                    router.push('/');
                  }}
                >
                  Go to PROCEED
                </Button>
                {!embeddedMode && !isOwner && (
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
          <div className={styles.MainContent}>
            <div className={styles.ProcessInfoCol} ref={mainContent}>
              <ProcessDocument
                settings={activeSettings}
                processHierarchy={processHierarchy}
                processData={processData}
                version={versionInfo}
              />
            </div>
            {breakpoint.lg && (
              <div className={styles.ContentTableCol} ref={contentTableRef}>
                <TableOfContents
                  settings={activeSettings}
                  processHierarchy={processHierarchy}
                  affix={false}
                  getContainer={() => mainContent.current!}
                  targetOffset={100}
                  onChange={handleContentTableChange}
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
