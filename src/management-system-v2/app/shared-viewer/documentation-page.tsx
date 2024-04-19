'use client';

import React, { useRef, useState, useEffect, use } from 'react';
import { is as isType } from 'bpmn-js/lib/util/ModelUtil';
import type ViewerType from 'bpmn-js/lib/Viewer';

import Canvas from 'diagram-js/lib/core/Canvas';
import schema from '@/lib/schema';

import { v4 } from 'uuid';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { Button, message, Tooltip, Typography, Space, Grid, Avatar, Modal } from 'antd';

import { PrinterOutlined, LaptopOutlined } from '@ant-design/icons';

import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Content from '@/components/content';
import { copyProcesses } from '@/lib/data/processes';
import { getProcess } from '@/lib/data/legacy/process';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './documentation-page.module.scss';

import {
  getElementDI,
  getRootFromElement,
  getDefinitionsVersionInformation,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
} from '@proceed/bpmn-helper';

import SettingsModal, { settingsOptions, SettingsOption } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';
import ProcessDocument, { VersionInfo } from './process-document';

import { getTitle, getMetaDataFromBpmnElement, getChildElements } from './documentation-page-utils';
import { getAllUserWorkspaces } from '@/lib/sharing/process-sharing';
import { Environment } from '@/lib/data/environment-schema';

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

export type ImportsInfo = {
  [definitionId: string]: {
    [versionId: number]: string;
  };
};

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
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<SettingsOption>(
    defaultSettings || settingsOptions,
  );
  const [workspaces, setWorkspaces] = useState<Environment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (session.status === 'authenticated') {
        const userWorkspaces = await getAllUserWorkspaces(session.data?.user.id as string);
        if (!cancelled) {
          setWorkspaces(userWorkspaces);
        }
        // if the page is opened after a user logged in trying to copy the process to their workspace open the modal (unless the user already has the process in their workspace)
        if (searchParams.get('redirected') === 'true' && !isOwner) {
          setIsModalOpen(true);
        }
      } else {
        setWorkspaces([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, searchParams]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const mainContent = useRef<HTMLDivElement>(null);
  const contentTableRef = useRef<HTMLDivElement>(null);

  // a hierarchy of the process elements as it should be displayed in the final document containing meta information for each element
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

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
      let id = el.id;
      let name = getTitle(el);

      let nestedSubprocess;
      let importedProcess;

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
            planeSvg: await getSVGFromBPMN(bpmnViewer, el.id),
          };
          // set the new root for the following export of any children contained in this layer
          currentRootId = el.id;
        } else if (isType(el, 'bpmn:CallActivity')) {
          // check if the call activity references another process which this user can access
          let importDefinitionId: string | undefined;
          let version: number | undefined;
          try {
            ({ definitionId: importDefinitionId, version: version } =
              getTargetDefinitionsAndProcessIdForCallActivityByObject(
                getRootFromElement(el),
                el.id,
              ));
          } catch (err) {}

          if (
            importDefinitionId &&
            version &&
            availableImports[importDefinitionId] &&
            availableImports[importDefinitionId][version]
          ) {
            // remember the bpmn currently loaded into the viewer so we can return to it after getting the svg for the elements in the imported process
            ({ xml: oldBpmn } = await bpmnViewer.saveXML());

            // get the bpmn for the import and load it into the viewer
            const importBpmn = availableImports[importDefinitionId][version];

            await bpmnViewer.importXML(importBpmn);

            // set the current element and layer to the root of the imported process
            const canvas = bpmnViewer.get<Canvas>('canvas');
            const root = canvas.getRootElement();
            el = root.businessObject;
            definitions = el.$parent;
            currentRootId = undefined;

            const { name: versionName, description: versionDescription } =
              await getDefinitionsVersionInformation(definitions);

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

      let children: ElementInfo[] | undefined = [];

      // recursively transform any children of this element
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
        id,
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
  }, [mdEditor, processData]);

  useEffect(() => {
    if (processHierarchy && defaultSettings) {
      // open the print dialog automatically after everything has loaded when the page is opened from the export modal
      window.print();
    }
  }, [processHierarchy, defaultSettings]);

  const redirectToLoginPage = () => {
    const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}&redirected=true`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    router.push(loginPath);
  };

  const handleCopyToOwnWorkspace = async (workspace: Environment) => {
    const processesToCopy = [
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
      },
    ];

    // TODO: what should be done if the currently open bpmn is that of a specific process version
    // 1. the copied process should have a copy of the specific version as its initial diagram
    // 2. just copy the process in the latest form and maybe add the specific version (or all versions) to the copy
    const copiedProcesses = await copyProcesses(processesToCopy, workspace.id);

    if ('error' in copiedProcesses) {
      message.error(copiedProcesses.error.message);
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      if (copiedProcesses.length === 1) {
        router.push(
          `${workspace.organization ? workspace.id : ''}/processes/${copiedProcesses[0].id}`,
        );
      }
    }
  };

  const userWorkspaces = workspaces.map((workspace, index) => ({
    label: workspace.organization ? workspace.name : 'My Space',
    key: `${workspace.id}-${index}`,
    logo:
      workspace.organization && workspace.logoUrl ? (
        <Avatar size={'large'} src={workspace.logoUrl} />
      ) : (
        <Avatar size={50} icon={<LaptopOutlined style={{ color: 'black' }} />} />
      ),
    optionOnClick: () => handleCopyToOwnWorkspace(workspace),
  }));

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
      <Layout
        hideSider={true}
        loggedIn={true}
        layoutMenuItems={[]}
        userEnvironments={workspaces}
        activeSpace={{ spaceId: '', isOrganization: false }}
      >
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
                  <>
                    {session.status === 'authenticated' ? (
                      <>
                        <Button size="large" onClick={() => setIsModalOpen(true)}>
                          Add to your workspace
                        </Button>
                        <Modal
                          title={
                            <div style={{ textAlign: 'center', padding: '10px' }}>
                              Select your workspace
                            </div>
                          }
                          open={isModalOpen}
                          closeIcon={false}
                          onCancel={handleModalClose}
                          zIndex={200}
                          footer={
                            <Button
                              onClick={handleModalClose}
                              style={{ border: '1px solid black' }}
                            >
                              Close
                            </Button>
                          }
                        >
                          <Space
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              justifyContent: 'center',
                              gap: 10,
                            }}
                          >
                            {userWorkspaces.map((workspace) => (
                              <Button
                                type="default"
                                key={workspace.key}
                                icon={workspace.logo}
                                style={{
                                  border: '1px solid black',
                                  width: '150px',
                                  height: '100px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  overflow: 'hidden',
                                  whiteSpace: 'normal',
                                  textOverflow: 'ellipsis',
                                  borderColor: 'black',
                                  boxShadow: '2px 2px 2px grey',
                                }}
                                onClick={workspace.optionOnClick}
                              >
                                <Typography.Text
                                  style={{
                                    margin: '5px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {workspace.label}
                                </Typography.Text>
                              </Button>
                            ))}
                          </Space>
                        </Modal>
                      </>
                    ) : (
                      <Button size="large" onClick={redirectToLoginPage}>
                        Add to your workspace
                      </Button>
                    )}
                  </>
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
