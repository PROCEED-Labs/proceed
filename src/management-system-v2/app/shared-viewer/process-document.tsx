import React, { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { getProcess } from '@/lib/data/db/process';

import { Typography, Grid, Image, Spin } from 'antd';

const { Title } = Typography;

import styles from './process-document.module.scss';
import cn from 'classnames';

import { ActiveSettings } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';

import { useEnvironment } from '@/components/auth-can';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';
import { fromCustomUTCString } from '@/lib/helpers/timeHelper';
import { generateDateString } from '@/lib/utils';
import ElementSections from '@/components/doc-element-sections';
import ProcessDetailsTable from '@/components/doc-process-details-table';
import {
  buildProcessTocItems,
  getElementTypeLabel,
  getSubprocessLabel,
  isCollapsedSubprocess,
  isExcludedFromMainList,
  isProcessElementEmpty,
  resolveElementImageUrl,
  separateChildren,
} from './documentation-page-utils';

export type VersionInfo = {
  id?: string;
  name?: string;
  description?: string;
  versionCreatedOn?: string;
};

type GetContentParams = {
  settings: ActiveSettings;
  processData: Awaited<ReturnType<typeof getProcess>>;
  version: VersionInfo;
  getImage: (params: {
    entityId: string;
    filePath: string;
    shareToken?: string | null;
  }) => Promise<{ fileUrl?: string }>;
  environment: { spaceId: string };
  shareToken: string | null;
};

/**
 * Transforms the hierarchical information about a process' elements into markup
 */
async function getContent(
  hierarchyElement: ElementInfo,
  currentPages: React.JSX.Element[],
  subprocessPages: React.JSX.Element[],
  params: GetContentParams,
  isRoot = false,
  isFirstChild = false,
): Promise<void> {
  const { settings, processData, version, getImage, environment, shareToken } = params;


  if (!settings.hideEmpty && isProcessElementEmpty(hierarchyElement)) return;
  const isContainer = !!hierarchyElement.children?.length;
  // show the element as it is visible in its parent
  let elementSvg = hierarchyElement.svg;
  let elementLabel = getElementTypeLabel(hierarchyElement);
  let { milestones, meta, description, importedProcess, image } = hierarchyElement;

  if (
    settings.nestedSubprocesses &&
    hierarchyElement.nestedSubprocess &&
    !isCollapsedSubprocess(hierarchyElement)
  ) {
    elementSvg = hierarchyElement.nestedSubprocess?.planeSvg;
  } else if (settings.importedProcesses && importedProcess) {
    // show the root plane, label and meta information of the imported process if the respective option is selected
    elementSvg = importedProcess.planeSvg;
    elementLabel = importedProcess.name!;
    ({ milestones, meta, description } = importedProcess);
  }

  const imageURL = await resolveElementImageUrl(
    image,
    processData.id,
    environment.spaceId,
    shareToken,
    getImage,
  );

  if (isRoot) {
    // ── Root: Process Overview ──
    currentPages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={cn(styles.ElementPage, styles.ContainerPage)}
      >
        <Title id={`${hierarchyElement.id}_page`} level={2}>
          Process Overview
        </Title>
        {description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${hierarchyElement.id}_description_page`}>
              Summary
            </Title>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}
        <ElementSections
          node={{
            ...hierarchyElement,
            svg: elementSvg,
            description: undefined,
            meta,
            milestones,
            importedProcess,
          }}
          settings={settings as Record<string, boolean>}
          resolvedImageUrl={imageURL}
          headingLevel={3}
          diagramHeading="Process Diagram"
          descriptionHeading="Summary"
        />
        <ProcessDetailsTable processData={processData} versionInfo={version} />
      </div>,
    );

    // ── Process Element Details heading ──
    currentPages.push(
      <div
        key="process_element_details_section"
        className={cn(styles.ElementPage, styles.ContainerPage, styles.HeadingOnlyPage)}
      >
        <Title id="process_element_details_page" level={2}>
          Process Element Details
        </Title>
      </div>,
    );

    // ── Recurse children — skip event-triggered subprocesses from main list ──
    if (
      (settings.nestedSubprocesses || !hierarchyElement.nestedSubprocess) &&
      (settings.importedProcesses || !hierarchyElement.importedProcess) &&
      hierarchyElement.children
    ) {
      const { mainChildren, subprocessChildren } = separateChildren(hierarchyElement.children);
      // Render normal elements into main pages
      for (let i = 0; i < mainChildren.length; i++) {
        await getContent(mainChildren[i], currentPages, subprocessPages, params, false, false);
      }

      // Render subprocesses into subprocess pages
      for (const sub of subprocessChildren) {
        await getContent(sub, currentPages, subprocessPages, params, false, false);
      }
    }

    // ── Append subprocess sections at the very end ──
  } else if (isExcludedFromMainList(hierarchyElement)) {
    // ── Expanded/event-triggered subprocess: goes to subprocessPages ──
    const subLabel = getSubprocessLabel(hierarchyElement);

    subprocessPages.push(
      <div
        key={`subprocess_${hierarchyElement.id}_section`}
        className={cn(styles.ElementPage, styles.ContainerPage)}
      >
        <Title id={`subprocess_${hierarchyElement.id}_page`} level={2}>
          {subLabel}
        </Title>

        {/* Summary */}
        {description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${hierarchyElement.id}_description_page`}>
              Summary
            </Title>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        {/* Full subprocess diagram */}
        <div className={styles.MetaInformation}>
          <Title level={3} id={`subprocess_${hierarchyElement.id}_diagram_page`}>
            Process Diagram
          </Title>
          <div
            className={styles.ElementCanvas}
            style={{ display: 'flex', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{
              __html: hierarchyElement.nestedSubprocess?.planeSvg || elementSvg,
            }}
          />
        </div>

        {/* Meta Data and Milestones if any */}
        {(meta || milestones) && (
          <ElementSections
            node={{
              ...hierarchyElement,
              svg: elementSvg,
              description: undefined,
              meta,
              milestones,
              importedProcess,
            }}
            settings={settings as Record<string, boolean>}
            resolvedImageUrl={imageURL}
            headingLevel={3}
            diagramHeading="Process Diagram"
            descriptionHeading="Summary"
          />
        )}

        {/* Element Details heading */}
        {hierarchyElement.children?.length ? (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${hierarchyElement.id}_elements_page`}>
              {`${subLabel} — Element Details`}
            </Title>
          </div>
        ) : null}
      </div>,
    );

    // Render each child of the subprocess into subprocessPages
    if (hierarchyElement.children) {
      for (const child of hierarchyElement.children) {
        if (!settings.hideEmpty && isProcessElementEmpty(child)) continue;
        const childImageURL = await resolveElementImageUrl(
          child.image,
          processData.id,
          environment.spaceId,
          shareToken,
          getImage,
        );

        subprocessPages.push(
          <div key={`element_${child.id}_page`} className={styles.ElementPage}>
            <Title id={`${child.id}_page`} level={3}>
              {getElementTypeLabel(child)}
            </Title>
            <ElementSections
              node={child}
              settings={settings as Record<string, boolean>}
              resolvedImageUrl={childImageURL}
              headingLevel={4}
              diagramHeading="Diagram Element"
              descriptionHeading="Description"
            />
          </div>,
        );
      }
    }
  } else {
    // ── Normal child element ──
    currentPages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={cn(styles.ElementPage, { [styles.ContainerPage]: isContainer })}
      >
        <Title id={`${hierarchyElement.id}_page`} level={3}>
          {elementLabel}
        </Title>
        <ElementSections
          node={{
            ...hierarchyElement,
            svg: elementSvg,
            description,
            meta,
            milestones,
            importedProcess,
          }}
          settings={settings as Record<string, boolean>}
          resolvedImageUrl={imageURL}
          headingLevel={4}
          diagramHeading="Diagram Element"
          descriptionHeading="Description"
        />
      </div>,
    );
  }
  // Collapsed subprocesses also get their own section in addition to appearing in main list
  if (isCollapsedSubprocess(hierarchyElement) && !isRoot) {
    const subLabel = getSubprocessLabel(hierarchyElement);
    subprocessPages.push(
      <div
        key={`subprocess_${hierarchyElement.id}_section`}
        className={cn(styles.ElementPage, styles.ContainerPage)}
      >
        <Title id={`subprocess_${hierarchyElement.id}_page`} level={2}>
          {subLabel}
        </Title>
        {description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${hierarchyElement.id}_description_page`}>
              Summary
            </Title>
            <div
              className="toastui-editor-contents"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}
        <div className={styles.MetaInformation}>
          <Title level={3} id={`subprocess_${hierarchyElement.id}_diagram_page`}>
            Process Diagram
          </Title>
          <div
            className={styles.ElementCanvas}
            style={{ display: 'flex', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{
              __html: hierarchyElement.nestedSubprocess?.planeSvg || elementSvg,
            }}
          />
        </div>
        {hierarchyElement.children?.length ? (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`subprocess_${hierarchyElement.id}_elements_page`}>
              {`${subLabel} — Element Details`}
            </Title>
          </div>
        ) : null}
      </div>,
    );

    if (hierarchyElement.children) {
      for (const child of hierarchyElement.children) {
        if (!settings.hideEmpty && isProcessElementEmpty(child)) continue;
        const childImageURL = await resolveElementImageUrl(
          child.image,
          processData.id,
          environment.spaceId,
          shareToken,
          getImage,
        );
        subprocessPages.push(
          <div key={`element_${child.id}_page`} className={styles.ElementPage}>
            <Title id={`${child.id}_page`} level={3}>
              {getElementTypeLabel(child)}
            </Title>
            <ElementSections
              node={child}
              settings={settings as Record<string, boolean>}
              resolvedImageUrl={childImageURL}
              headingLevel={4}
              diagramHeading="Diagram Element"
              descriptionHeading="Description"
            />
          </div>,
        );
      }
    }
  }
}

type ProcessDocumentProps = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  settings: ActiveSettings;
  processHierarchy?: ElementInfo;
  version: VersionInfo;
};

/**
 * A printable document containing information about a process
 */
const ProcessDocument: React.FC<ProcessDocumentProps> = ({
  processData,
  settings,
  processHierarchy,
  version,
}) => {
  const breakpoint = Grid.useBreakpoint();

  const environment = useEnvironment();

  const query = useSearchParams();
  const shareToken = query.get('token');

  const { download: getImage } = useFileManager({ entityType: EntityType.PROCESS });
  const [processPages, setProcessPages] = useState<React.JSX.Element[]>([]);
  const [subprocessPages, setSubprocessPages] = useState<React.JSX.Element[]>([]);
  // transform the document data into the respective pages of the document
  useEffect(() => {
    const updateProcessPages = async () => {
      const newProcessPages: React.JSX.Element[] = [];
      const newSubprocessPages: React.JSX.Element[] = [];
      processHierarchy &&
        (await getContent(
          processHierarchy,
          newProcessPages,
          newSubprocessPages,
          { settings, processData, version, getImage, environment, shareToken },
          true,
          false,
        ));
      setProcessPages(newProcessPages);
      setSubprocessPages(newSubprocessPages);
    };

    updateProcessPages();
  }, [processHierarchy, settings]);

  return (
    <div className={styles.ProcessDocument}>
      {!processHierarchy ? (
        <Spin tip="Loading process data" size="large" style={{ top: '50px' }}>
          <div></div>
        </Spin>
      ) : (
        <>
          {/* TODO: the header that is repeating on each page seems to break the links in the final pdf (i think it is not correctly considered when calculating the position of the link target) */}
          <div className={styles.Header}>
            <Image src="/proceed-labs-logo.svg" alt="Proceed Logo" width="169,5pt" height="15pt" />
            <h3>www.proceed-labs.org</h3>
          </div>
          <div className={styles.Main}>
            <div className={cn(styles.Title, { [styles.TitlePage]: settings.titlepage })}>
              <div className={styles.TitleHeader}>
                <div className={styles.TitleProcessId}>{processData.userDefinedId}</div>
                <Title style={{ marginTop: 0 }}>{processData.name}</Title>
              </div>
              <div className={styles.TitleInfos}>
                <div style={{ fontSize: '14px' }}>Owner: {(processData as any).ownerName}</div>
                {version.id ? (
                  <>
                    <div style={{ fontSize: '14px' }}>Version: {version.name || version.id}</div>
                    {version.description ? (
                      <div style={{ fontSize: '14px' }}>
                        Version Description: {version.description}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ fontSize: '14px' }}>Version: Latest</div>
                )}
                {version.id ? (
                  <div style={{ fontSize: '14px' }}>
                    Version Created On:{' '}
                    {version.versionCreatedOn
                      ? generateDateString(fromCustomUTCString(version.versionCreatedOn), true)
                      : 'Unknown'}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px' }}>
                    Last Edit: {generateDateString(processData.lastEditedOn, true)}
                  </div>
                )}
              </div>
            </div>
            {settings.tableOfContents ? (
              <div
                className={cn(styles.TableOfContents, {
                  [styles.WebTableOfContents]: !breakpoint.lg,
                  [styles.TableOfContentPage]: settings.titlepage,
                })}
              >
                <Title level={2}>Table Of Contents</Title>
                <TableOfContents
                  affix={false}
                  getCurrentAnchor={() => ''}
                  settings={settings}
                  processHierarchy={processHierarchy}
                  linksDisabled
                  extraRootItems={buildProcessTocItems(
                    processHierarchy,
                    settings as Record<string, boolean>,
                    true,
                  )}
                />
              </div>
            ) : null}
            {processPages}
            {subprocessPages}
          </div>
        </>
      )}
    </div>
  );
};

export default ProcessDocument;
