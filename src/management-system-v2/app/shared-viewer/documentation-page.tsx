'use client';

import React, { useRef, useState, useEffect, use } from 'react';
import { is as isType } from 'bpmn-js/lib/util/ModelUtil';
import type ViewerType from 'bpmn-js/lib/Viewer';

import Canvas from 'diagram-js/lib/core/Canvas';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { Button, Tooltip, Typography, Space, Grid } from 'antd';

import { PrinterOutlined } from '@ant-design/icons';

import Content from '@/components/content';

import { getProcess } from '@/lib/data/legacy/process';
import { useRouter } from 'next/navigation';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './documentation-page.module.scss';

import { getRootFromElement, getDefinitionsVersionInformation } from '@proceed/bpmn-helper';

import SettingsModal, { settingsOptions, SettingsOption } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';
import ProcessDocument, { VersionInfo } from './process-document';
import WorkspaceSelectionModalButton from './workspace-selection';

import {
  getTitle,
  getMetaDataFromBpmnElement,
  getChildElements,
  getViewer,
  ImportsInfo,
  getElementSVG,
} from './documentation-page-utils';

/**
 * Import the Editor asynchronously since it implicitly uses browser logic which leads to errors when this file is loaded on the server
 */
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
  isOwner: boolean;
  defaultSettings?: SettingsOption;
  availableImports: ImportsInfo;
};

const BPMNSharedViewer = ({
  processData,
  isOwner,
  defaultSettings,
  availableImports,
}: BPMNSharedViewerProps) => {
  const router = useRouter();
  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<SettingsOption>(
    defaultSettings || settingsOptions,
  );

  const mainContent = useRef<HTMLDivElement>(null);
  const contentTableRef = useRef<HTMLDivElement>(null);

  // a hierarchy of the process elements as it should be displayed in the final document containing meta information for each element
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

  const mdEditor = use(markdownEditor);

  useEffect(() => {
    // transforms an element into a representation that contains the necessary meta information that should be presented on this page
    async function transform(
      bpmnViewer: ViewerType,
      el: any, // the element to transform
      definitions: any, // the definitions element at the root of the process tree
      currentRootId?: string, // the layer the current element is in (e.g. the root process/collaboration or a collapsed sub-process)
    ): Promise<ElementInfo> {
      let svg;

      let nestedSubprocess;
      let importedProcess;

      const { meta, milestones, description, image } = getMetaDataFromBpmnElement(el, mdEditor);

      // stores the bpmn of an importing process when the imported process is loaded into the modeler in the case of a call activity
      let oldBpmn: string | undefined;

      if (isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process')) {
        // get the svg representation of the root plane
        svg = await getSVGFromBPMN(bpmnViewer);
      } else {
        // get svg representations of an element (the element as seen in the current layer and optionally an imported process or nested subprocess representing the element)
        ({ svg, el, definitions, oldBpmn, nestedSubprocess, importedProcess, currentRootId } =
          await getElementSVG(
            el,
            bpmnViewer,
            mdEditor,
            definitions,
            availableImports,
            currentRootId,
          ));
      }

      let children: ElementInfo[] | undefined = [];

      // recursively transform all children of this element
      const childElements = getChildElements(el);
      for (const childEl of childElements) {
        children.push(await transform(bpmnViewer, childEl, definitions, currentRootId));
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
        name: getTitle(el),
        description,
        meta,
        milestones,
        importedProcess,
        nestedSubprocess,
        children,
        image,
      };
    }

    async function loadProcessHierarchy() {
      const viewer = await getViewer(processData.bpmn!);

      const canvas = viewer.get<Canvas>('canvas');
      const root = canvas.getRootElement();

      const definitions = getRootFromElement(root.businessObject);
      getDefinitionsVersionInformation(definitions).then(({ versionId, name, description }) =>
        setVersionInfo({ id: versionId, name, description }),
      );

      const hierarchy = await transform(
        viewer,
        root.businessObject,
        root.businessObject.$parent,
        undefined,
      );
      setProcessHierarchy(hierarchy);
      // cleanup of the viewer and a temporary element inserted into the dom that wraps around it
      viewer.destroy();
    }

    loadProcessHierarchy();
  }, [mdEditor, processData]);

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      // open the print dialog automatically when loading has finished if the page is opened from the export modal
      setTimeout(window.print, 100);
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
        (link) => `#${link.href.split('#')[1]}` === currentActiveLink,
      );

      if (activeLink) {
        const contentTableBox = contentTableDiv.getBoundingClientRect();
        const activeLinkBox = activeLink.getBoundingClientRect();

        // if the link is outside of the viewbox of the content table div => scroll the div to show the link
        if (activeLinkBox.bottom > contentTableBox.bottom) {
          contentTableDiv.scrollBy({ top: activeLinkBox.bottom - contentTableBox.bottom });
        } else if (activeLinkBox.top < contentTableBox.top) {
          contentTableDiv.scrollBy({ top: activeLinkBox.top - contentTableBox.top });
        }
      }
    }
  };

  return (
    <div className={styles.DocumentationPageContent}>
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
              {!isOwner && (
                <WorkspaceSelectionModalButton
                  processData={processData}
                  versionInfo={versionInfo}
                />
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
    </div>
  );
};

export default BPMNSharedViewer;
