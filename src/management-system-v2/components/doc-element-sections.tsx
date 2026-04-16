import React from 'react';
import { Image, Table, Typography } from 'antd';
import styles from '@/app/shared-viewer/process-document.module.scss';
import { ElementInfo } from '@/app/shared-viewer/table-of-content';

const { Title } = Typography;

type ElementSectionsProps = {
  node: ElementInfo;
  settings: Record<string, boolean>;
  resolvedImageUrl?: string | false;
  headingLevel?: 3 | 4;
  diagramHeading?: string;
  descriptionHeading?: string;
};

/**
 * Shared per-element content sections used by both ProcessDocument
 * and InstanceDocumentContent which render description, image, meta, milestones.
 */
const ElementSections: React.FC<ElementSectionsProps> = ({
  node,
  settings,
  resolvedImageUrl,
  headingLevel = 3,
  diagramHeading = 'Diagram Element',
  descriptionHeading = 'Description',
}) => {
  const { description, meta, milestones, importedProcess } = node;

  const effectiveDescription =
    settings.importedProcesses && importedProcess ? undefined : description;
  const effectiveMeta = settings.importedProcesses && importedProcess ? importedProcess.meta : meta;
  const effectiveMilestones =
    settings.importedProcesses && importedProcess ? importedProcess.milestones : milestones;

  return (
    <>
      {/* SVG diagram */}
      {(settings.showElementSVG || !!node.children?.length) && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_diagram_page`}>
            {diagramHeading}
          </Title>
          <div
            className={styles.ElementCanvas}
            style={{ display: 'flex', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: node.svg }}
          />
        </div>
      )}

      {/* Imported process version info */}
      {settings.importedProcesses && importedProcess?.versionId && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_version_page`}>
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
        </div>
      )}

      {/* General Description */}
      {effectiveDescription && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_description_page`}>
            {descriptionHeading}
          </Title>
          <div
            className="toastui-editor-contents"
            dangerouslySetInnerHTML={{ __html: effectiveDescription }}
          />
        </div>
      )}

      {/* Overview Image */}
      {resolvedImageUrl && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_image_page`}>
            Overview Image
          </Title>
          <Image
            alt="Element overview image"
            style={{
              width: 'auto',
              maxWidth: '80%',
              height: '300px',
              position: 'relative',
              left: '50%',
              transform: 'translate(-50%)',
            }}
            src={resolvedImageUrl}
            width="100%"
          />
        </div>
      )}

      {/* Meta Data */}
      {effectiveMeta && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_meta_page`}>
            Meta Data
          </Title>
          <Table
            pagination={false}
            rowKey="key"
            columns={[
              { title: 'Name', dataIndex: 'key', key: 'key' },
              { title: 'Value', dataIndex: 'val', key: 'value' },
            ]}
            dataSource={Object.entries(effectiveMeta).map(([key, val]) => ({ key, val }))}
          />
        </div>
      )}

      {/* Milestones */}
      {effectiveMilestones && (
        <div className={styles.MetaInformation}>
          <Title level={headingLevel} id={`${node.id}_milestone_page`}>
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
                  />
                ),
              },
            ]}
            dataSource={effectiveMilestones}
          />
        </div>
      )}
    </>
  );
};

export default ElementSections;
