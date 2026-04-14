import React, { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { getProcess } from '@/lib/data/db/process';

import { Typography, Table, Grid, Image, Spin } from 'antd';

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
import ElementSections from './element-sections';
import ProcessDetailsTable from '@/components/doc-process-details-table';
import { isProcessElementEmpty } from './documentation-page-utils';

export type VersionInfo = {
  id?: string;
  name?: string;
  description?: string;
  versionCreatedOn?: string;
};

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

  /**
   * Transforms the hierarchical information about a process' elements into markup
   */
  async function getContent(
    hierarchyElement: ElementInfo,
    currentPages: React.JSX.Element[],
    isRoot = false,
    isFirstChild = false,
  ) {
    // hide the element if there is no information and the respective option is selected
    if (settings.hideEmpty && isProcessElementEmpty(hierarchyElement)) return;

    const isContainer = !!hierarchyElement.children?.length;

    // show the element as it is visible in its parent
    let elementSvg = hierarchyElement.svg;
    let elementLabel = hierarchyElement.name || `<${hierarchyElement.id}>`;
    let { milestones, meta, description, importedProcess, image } = hierarchyElement;

    if (settings.nestedSubprocesses && hierarchyElement.nestedSubprocess) {
      // show the sub-process plane with the sub-process' children if the respective option is selected
      elementSvg = hierarchyElement.nestedSubprocess?.planeSvg;
    } else if (settings.importedProcesses && importedProcess) {
      // show the root plane, label and meta information of the imported process if the respective option is selected
      elementSvg = importedProcess.planeSvg;
      elementLabel = importedProcess.name!;
      ({ milestones, meta, description } = importedProcess);
    }
    const { fileUrl: newImageUrl } = await getImage({
      entityId: processData.id,
      filePath: image,
      shareToken,
    }).catch(() => {
      console.log('Failed to get image');
      return { fileUrl: undefined };
    });

    let imageURL =
      image &&
      (newImageUrl ??
        `/api/private/${environment.spaceId || 'unauthenticated'}/processes/${
          processData.id
        }/images/${image}?shareToken=${shareToken}`);

    if (!isRoot && isFirstChild) {
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
    }

    currentPages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={cn(styles.ElementPage, { [styles.ContainerPage]: isContainer })}
      >
        <div className={styles.ElementOverview}>
          <Title id={`${hierarchyElement.id}_page`} level={isRoot ? 2 : 3}>
            {isRoot ? 'Process Overview' : elementLabel}
          </Title>
        </div>
        {isRoot && description && (
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
            description: isRoot ? undefined : description,
            meta,
            milestones,
            importedProcess,
          }}
          settings={settings as Record<string, boolean>}
          resolvedImageUrl={imageURL}
          headingLevel={isRoot ? 3 : 4}
          diagramHeading={isRoot ? 'Process Diagram' : 'Diagram Element'}
          descriptionHeading={isRoot ? 'Summary' : 'Description'}
        />
        {isRoot && <ProcessDetailsTable processData={processData} versionInfo={version} />}
      </div>,
    );

    // create pages for the children of an element if the element is a collapsed sub-process with a separate plane and the respective option is selected
    // or if it is a container in the same plane (expanded sub-process, pool)
    if (
      (settings.nestedSubprocesses || !hierarchyElement.nestedSubprocess) &&
      (settings.importedProcesses || !hierarchyElement.importedProcess)
    ) {
      if (hierarchyElement.children) {
        for (let i = 0; i < hierarchyElement.children.length; i++) {
          await getContent(hierarchyElement.children[i], currentPages, false, i === 0);
        }
      }
    }
  }

  // transform the document data into the respective pages of the document
  useEffect(() => {
    const updateProcessPages = async () => {
      const newProcessPages: React.JSX.Element[] = [];
      processHierarchy && (await getContent(processHierarchy, newProcessPages, true, false));
      setProcessPages(newProcessPages);
    };

    updateProcessPages();
  }, [processHierarchy, settings]);

  return (
    <>
      <div className={styles.ProcessDocument}>
        {!processHierarchy ? (
          <Spin tip="Loading process data" size="large" style={{ top: '50px' }}>
            <div></div>
          </Spin>
        ) : (
          <>
            {/* TODO: the header that is repeating on each page seems to break the links in the final pdf (i think it is not correctly considered when calculating the position of the link target) */}
            <div className={styles.Header}>
              <Image
                src="/proceed-labs-logo.svg"
                alt="Proceed Logo"
                width="169,5pt"
                height="15pt"
              />
              <h3>www.proceed-labs.org</h3>
            </div>
            <div className={styles.Main}>
              <div className={cn(styles.Title, { [styles.TitlePage]: settings.titlepage })}>
                <Title>{processData.name}</Title>
                <div className={styles.TitleInfos}>
                  <div style={{ fontSize: '14px' }}>Process Id: {processData.userDefinedId}</div>
                  <div style={{ fontSize: '14px' }}>
                    Owner: {processData.creatorId?.split('|').pop()}
                  </div>
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
                    extraRootItems={[
                      {
                        key: 'process_overview',
                        href: '',
                        title: 'Process Overview',
                        children: [
                          ...(processHierarchy.description
                            ? [{ key: 'summary', href: '', title: 'Summary' }]
                            : []),
                          { key: 'process_diagram', href: '', title: 'Process Diagram' },
                          { key: 'process_details', href: '', title: 'Process Details' },
                        ],
                      },
                      {
                        key: 'process_element_details',
                        href: '',
                        title: 'Process Element Details',
                        children: (processHierarchy.children || [])
                          .filter((child) => !settings.hideEmpty || !isProcessElementEmpty(child))
                          .map((child) => ({
                            key: child.id,
                            href: '',
                            title:
                              child.name && !child.name.startsWith('<') ? child.name : child.id,
                          })),
                      },
                    ]}
                  />
                </div>
              ) : null}

              {...processPages}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ProcessDocument;
