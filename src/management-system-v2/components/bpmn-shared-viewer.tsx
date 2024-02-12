'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback, use } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';

import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as ToastEditorType } from '@toast-ui/editor';

import {
  Button,
  message,
  Tooltip,
  Typography,
  Table,
  Modal,
  Checkbox,
  Space,
  Image,
  Anchor,
  Row,
  Col,
  Grid,
} from 'antd';

const { Text, Title } = Typography;

import type { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';

import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { PrinterOutlined, SettingOutlined } from '@ant-design/icons';

import Layout from '@/components/layout';
import Content from '@/components/content';
import { copyProcesses } from '@/lib/data/processes';
import { getProcess } from '@/lib/data/legacy/process';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';

import { addTooltipsAndLinksToSVG, getSVGFromBPMN } from '@/lib/process-export/util';

import styles from './bpmn-shared-viewer.module.scss';

import {
  getMetaDataFromElement,
  getMilestonesFromElement,
  getElementDI,
} from '@proceed/bpmn-helper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import AnchorLink from 'antd/es/anchor/AnchorLink';
import { truthyFilter } from '@/lib/typescript-utils';

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
  planeSvg?: string;
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

const settings = [
  {
    label: 'Separate Title Page',
    value: 'titlepage',
    tooltip:
      'The first page contains only the title. The table of contents or the content start on the second page',
  },
  {
    label: 'Table of Contents',
    value: 'tableOfContents',
    tooltip: 'Will add a table of contents between the title and the main content',
  },
  {
    label: 'Element Visualization',
    value: 'showElementSVG',
    tooltip: 'Every sub-chapter of an element contains a visualization of that element',
  },
  {
    label: 'Nested Subprocesses',
    value: 'subprocesses',
    tooltip: 'Add the content of collapsed subprocesses as sub-chapters.',
  },
  {
    label: 'Exclude Empty Elements',
    value: 'hideEmpty',
    tooltip:
      'Will exclude sub-chapters of elements that have no meta data and of collapsed sub-processes that contain no elements.',
  },
] as const;

type SettingsModalProps = {
  checkedSettings: string[];
  onConfirm: (settings: SettingsModalProps['checkedSettings']) => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ checkedSettings, onConfirm }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(checkedSettings);

  const handleSettingsChange = (checkedValues: string[]) => {
    setChecked(checkedValues);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setChecked(checkedSettings);
  };

  const handleConfirm = () => {
    setModalOpen(false);
    onConfirm(checked);
  };

  return (
    <>
      <Modal
        closeIcon={null}
        title="Settings"
        open={modalOpen}
        onOk={handleConfirm}
        onCancel={handleCancel}
      >
        <Checkbox.Group value={checked} onChange={handleSettingsChange}>
          <Space direction="vertical">
            {settings.map(({ label, value, tooltip }) => (
              <Tooltip placement="right" title={tooltip} key={label}>
                <Checkbox value={value}>{label}</Checkbox>
              </Tooltip>
            ))}
          </Space>
        </Checkbox.Group>
      </Modal>

      <Tooltip title="Settings">
        <Button size="large" icon={<SettingOutlined />} onClick={() => setModalOpen(true)} />
      </Tooltip>
    </>
  );
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const breakpoint = Grid.useBreakpoint();

  const [checkedSettings, setCheckedSettings] = useState<(typeof settings)[number]['value'][]>(
    settings.map(({ value }) => value),
  );

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
          svg = await getSVGFromBPMN(processData.bpmn!);
        } else {
          const elementsToShow = [el.id];
          // show incoming/outgoing sequence flows for the current element
          if (el.outgoing?.length) elementsToShow.push(el.outgoing[0].id);
          if (el.incoming?.length) elementsToShow.push(el.incoming[0].id);
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

        // add links from elements in the diagram to sub-chapters for those elements and tooltips that show element names or ids
        // TODO: show tooltips in the pdf when there is no subchapter for the element and the element has no name (or always)
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

      transform(root.businessObject, root.businessObject.$parent, undefined).then((rootElement) => {
        setProcessHierarchy(rootElement);
      });
    }
  }, [finishedInitialLoading, Editor]);

  // trigger the build of the document when the viewer has finished loading the bpmn
  const handleOnLoad = useCallback(() => setFinishedInitialLoading(true), []);

  const activeSettings: Partial<{ [key in (typeof checkedSettings)[number]]: boolean }> =
    Object.fromEntries(checkedSettings.map((key) => [key, true]));

  // transform the document data into a table of contents
  function getTableOfContents(hierarchyElement: ElementInfo): AnchorLinkItemProps | undefined {
    let children: AnchorLinkItemProps[] = [];

    if ((activeSettings.subprocesses || !hierarchyElement.planeSvg) && hierarchyElement.children) {
      children = hierarchyElement.children
        .map((child) => getTableOfContents(child))
        .filter(truthyFilter);
    }

    if (hierarchyElement.milestones) {
      children.unshift({
        key: `${hierarchyElement.id}_milestones`,
        href: `#${hierarchyElement.id}_milestone_page`,
        title: 'Milestones',
      });
    }
    if (hierarchyElement.meta) {
      children.unshift({
        key: `${hierarchyElement.id}_meta`,
        href: `#${hierarchyElement.id}_meta_page`,
        title: 'Meta Data',
      });
    }
    if (hierarchyElement.description) {
      children.unshift({
        key: `${hierarchyElement.id}_description`,
        href: `#${hierarchyElement.id}_description_page`,
        title: 'General Description',
      });
    }

    if (activeSettings.hideEmpty && !children.length && !hierarchyElement.children?.length) {
      return undefined;
    }

    const label = hierarchyElement.name || `<${hierarchyElement.id}>`;

    return {
      key: hierarchyElement.id,
      href: `#${hierarchyElement.id}_page`,
      title: <Text ellipsis={{ tooltip: label }}>{label}</Text>,
      children,
    };
  }

  let tableOfContents: AnchorLinkItemProps | AnchorLinkItemProps[] | undefined = processHierarchy
    ? getTableOfContents(processHierarchy)
    : undefined;

  if (tableOfContents) {
    const directChildren = tableOfContents.children || [];
    delete tableOfContents.children;
    tableOfContents = [tableOfContents, ...directChildren];
  }

  // transform the document data into the respective pages of the document
  const processPages: React.JSX.Element[] = [];
  function getContent(hierarchyElement: ElementInfo, pages: React.JSX.Element[]) {
    if (
      activeSettings.hideEmpty &&
      !hierarchyElement.description &&
      !hierarchyElement.meta &&
      !hierarchyElement.milestones &&
      !hierarchyElement.children?.length
    ) {
      return;
    }

    pages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={hierarchyElement.isContainer ? styles.ContainerPage : styles.ElementPage}
      >
        <div className={styles.ElementOverview}>
          <Title id={`${hierarchyElement.id}_page`} level={2}>
            {hierarchyElement.name || `<${hierarchyElement.id}>`}
          </Title>
          {(activeSettings.showElementSVG || hierarchyElement.isContainer) && (
            <div
              className={styles.ElementCanvas}
              dangerouslySetInnerHTML={{
                __html: activeSettings.subprocesses
                  ? hierarchyElement.planeSvg || hierarchyElement.svg
                  : hierarchyElement.svg,
              }}
            ></div>
          )}
        </div>
        {hierarchyElement.description && (
          <>
            <Title level={3} id={`${hierarchyElement.id}_description_page`}>
              General Description
            </Title>
            <div className={styles.ElementDescription}>
              <div
                className="toastui-editor-contents"
                dangerouslySetInnerHTML={{ __html: hierarchyElement.description }}
              ></div>
            </div>
          </>
        )}
        {hierarchyElement.meta && (
          <div className={styles.ElementMeta}>
            <Title level={3} id={`${hierarchyElement.id}_meta_page`}>
              Meta Data
            </Title>
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
            <Title level={3} id={`${hierarchyElement.id}_milestone_page`}>
              Milestones
            </Title>
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
    if (activeSettings.subprocesses || !hierarchyElement.planeSvg) {
      hierarchyElement.children?.forEach((child) => getContent(child, pages));
    }
  }

  processHierarchy && getContent(processHierarchy, processPages);

  return (
    <div className={styles.ProcessOverview}>
      <Layout hideSider={true}>
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
                <Button size="large" onClick={handleCopyToOwnWorkspace}>
                  Add to your Processes
                </Button>
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
          <table style={{ height: '100%', overflowY: 'auto' }}>
            <thead className={styles.PrintHeader}>
              <tr>
                <td>
                  <div className={styles.ProceedLogo}>
                    <Image
                      src="/proceed-labs-logo.svg"
                      alt="Proceed Logo"
                      width="227"
                      height="20"
                    />
                    <h3 style={{ marginRight: '2pt' }}>www.proceed-labs.org</h3>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className={styles.MainContent} ref={mainContent}>
                    <div className={styles.ProcessInfoCol}>
                      <div className={styles.ProcessDocument}>
                        <div
                          className={activeSettings.titlepage ? styles.TitlePage : ''}
                          // TODO: fix this so that there is no empty page before the table of contents
                          // style={{ pageBreakAfter: activeSettings.titlepage ? 'always' : 'auto' }}
                        >
                          <Title>{processData.name}</Title>
                          <div className={styles.TitleInfos}>
                            <div>Owner: {processData.owner.split('|').pop()}</div>
                            <div>Version: Latest</div>
                            <div>Last Edit: {processData.lastEdited}</div>
                          </div>
                        </div>
                        <div
                          style={
                            activeSettings.tableOfContents && !breakpoint.lg
                              ? { display: 'block' }
                              : {}
                          }
                          className={styles.TableOfContents}
                        >
                          <Title level={2}>Table Of Contents</Title>
                          <Anchor
                            affix={false}
                            items={tableOfContents}
                            getCurrentAnchor={() => ''}
                          />
                        </div>

                        {...processPages}
                      </div>
                    </div>
                    {/* TODO: Still Buggy when the table of contents is bigger than the page */}
                    {breakpoint.lg && (
                      <div className={styles.ContentTableCol}>
                        {tableOfContents && (
                          <Anchor
                            affix={true}
                            items={tableOfContents}
                            getContainer={() => mainContent.current}
                            targetOffset={100}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </Content>
      </Layout>
    </div>
  );
};

export default BPMNSharedViewer;
