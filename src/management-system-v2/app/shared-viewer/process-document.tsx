import React from 'react';

import { getProcess } from '@/lib/data/legacy/process';

import { Typography, Table, Grid, Image } from 'antd';

const { Title } = Typography;

import styles from './process-document.module.scss';
import cn from 'classnames';

import { ActiveSettings } from './settings-modal';
import TableOfContents, { ElementInfo } from './table-of-content';

export type VersionInfo = {
  id?: number;
  name?: string;
  description?: string;
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

  /**
   * Transforms the hierarchical information about a process' elements into markup
   */
  function getContent(hierarchyElement: ElementInfo, pages: React.JSX.Element[]) {
    // hide the element if there is no information and the respective option is selected
    if (
      settings.hideEmpty &&
      !hierarchyElement.description &&
      !hierarchyElement.meta &&
      !hierarchyElement.milestones &&
      !hierarchyElement.children?.length
    ) {
      return;
    }

    const isContainer = !!hierarchyElement.children?.length;

    // show the element as it is visible in its parent
    let elementSvg = hierarchyElement.svg;
    let elementLabel = hierarchyElement.name || `<${hierarchyElement.id}>`;
    let { milestones, meta, description, importedProcess } = hierarchyElement;

    if (settings.nestedSubprocesses && hierarchyElement.nestedSubprocess) {
      // show the sub-process plane with the sub-process' children if the respective option is selected
      elementSvg = hierarchyElement.nestedSubprocess?.planeSvg;
    } else if (settings.importedProcesses && importedProcess) {
      // show the root plane, label and meta information of the imported process if the respective option is selected
      elementSvg = importedProcess.planeSvg;
      elementLabel = importedProcess.name!;
      ({ milestones, meta, description } = importedProcess);
    }

    pages.push(
      <div
        key={`element_${hierarchyElement.id}_page`}
        className={cn(styles.ElementPage, { [styles.ContainerPage]: isContainer })}
      >
        <div className={styles.ElementOverview}>
          <Title id={`${hierarchyElement.id}_page`} level={2}>
            {elementLabel}
          </Title>
          {/* Hide the svg if the element is not a container (process, sub-process, pool,...) and the respective option is deselected */}
          {(settings.showElementSVG || isContainer) && (
            <div
              className={styles.ElementCanvas}
              dangerouslySetInnerHTML={{
                __html: elementSvg,
              }}
            ></div>
          )}
        </div>
        {settings.importedProcesses && importedProcess && importedProcess.version && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${hierarchyElement.id}_version_page`}>
              Version Information
            </Title>
            {importedProcess.versionName && (
              <p>
                <b>Version:</b> {importedProcess.versionName}
              </p>
            )}
            {importedProcess.versionDescription && (
              <p>
                <b>Version Description:</b> {importedProcess.versionDescription}
              </p>
            )}
            <p>
              <b>Creation Time:</b> {new Date(importedProcess.version).toUTCString()}
            </p>
          </div>
        )}
        {description && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${hierarchyElement.id}_description_page`}>
              General Description
            </Title>
            <div>
              <div
                className="toastui-editor-contents"
                dangerouslySetInnerHTML={{ __html: description }}
              ></div>
            </div>
          </div>
        )}
        {meta && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${hierarchyElement.id}_meta_page`}>
              Meta Data
            </Title>
            <Table
              pagination={false}
              rowKey="key"
              columns={[
                { title: 'Name', dataIndex: 'key', key: 'key' },
                { title: 'Value', dataIndex: 'val', key: 'value' },
              ]}
              dataSource={Object.entries(meta).map(([key, val]) => ({ key, val }))}
            />
          </div>
        )}
        {milestones && (
          <div className={styles.MetaInformation}>
            <Title level={3} id={`${hierarchyElement.id}_milestone_page`}>
              Milestones
            </Title>
            <Table
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
              dataSource={milestones}
            />
          </div>
        )}
      </div>,
    );

    // create pages for the children of an element if the element is a collapsed sub-process with a separate plane and the respective option is selected
    // or if it is a container in the same plane (expanded sub-process, pool)
    if (
      (settings.nestedSubprocesses || !hierarchyElement.nestedSubprocess) &&
      (settings.importedProcesses || !hierarchyElement.importedProcess)
    ) {
      hierarchyElement.children?.forEach((child) => getContent(child, pages));
    }
  }

  // transform the document data into the respective pages of the document
  const processPages: React.JSX.Element[] = [];
  processHierarchy && getContent(processHierarchy, processPages);

  return (
    <>
      <div className={styles.ProcessDocument}>
        {/* TODO: the header that is repeating on each page seems to break the links in the final pdf (i think it is not correctly considered when calculating the position of the link target) */}
        <div className={styles.Header}>
          <Image src="/proceed-labs-logo.svg" alt="Proceed Logo" width="169,5pt" height="15pt" />
          <h3>www.proceed-labs.org</h3>
        </div>
        <div className={styles.Main}>
          <div className={cn(styles.Title, { [styles.TitlePage]: settings.titlepage })}>
            <Title>{processData.name}</Title>
            <div className={styles.TitleInfos}>
              <div>Owner: {processData.owner.split('|').pop()}</div>
              {version.id ? (
                <>
                  <div>Version: {version.name || version.id}</div>
                  {version.description ? (
                    <div>Version Description: {version.description}</div>
                  ) : null}
                </>
              ) : (
                <div>Version: Latest</div>
              )}
              {version.id ? (
                <div>Creation Time: {new Date(version.id).toUTCString()}</div>
              ) : (
                <div>Last Edit: {processData.lastEdited}</div>
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
              />
            </div>
          ) : null}

          {...processPages}
        </div>
      </div>
    </>
  );
};

export default ProcessDocument;
