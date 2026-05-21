import React from 'react';
import { Typography } from 'antd';
import styles from '@/app/shared-viewer/document-content.module.scss';
import cn from 'classnames';

const { Title } = Typography;

type ImportedProcessSectionHeaderProps = {
  id: string;
  importLabel: string;
  description?: string;
  planeSvg: string;
  hasChildren: boolean;
};

const ImportedProcessSectionHeader: React.FC<ImportedProcessSectionHeaderProps> = ({
  id,
  importLabel,
  description,
  planeSvg,
  hasChildren,
}) => (
  <div className={cn(styles.ElementPage, styles.ContainerPage)}>
    <Title id={`subprocess_${id}_page`} level={2}>
      {importLabel}
    </Title>

    {description && (
      <div className={styles.MetaInformation}>
        <Title level={3} id={`subprocess_${id}_description_page`}>
          Summary
        </Title>
        <div
          className="toastui-editor-contents"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>
    )}

    <div className={styles.MetaInformation}>
      <Title level={3} id={`subprocess_${id}_diagram_page`}>
        Process Diagram
      </Title>
      <div
        className={styles.ElementCanvas}
        style={{ display: 'flex', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: planeSvg }}
      />
    </div>

    {hasChildren && (
      <div className={styles.MetaInformation}>
        <Title level={3} id={`subprocess_${id}_elements_page`}>
          {`${importLabel} — Element Details`}
        </Title>
      </div>
    )}
  </div>
);

export default ImportedProcessSectionHeader;
