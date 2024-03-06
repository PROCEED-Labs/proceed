import React from 'react';

import { Anchor, Typography } from 'antd';
const { Text } = Typography;
import { AnchorProps, AnchorLinkItemProps } from 'antd/es/anchor/Anchor';

import { truthyFilter } from '@/lib/typescript-utils';

import styles from './table-of-content.module.scss';

import { ActiveSettings } from './settings-modal';

type MetaInformation = {
  name?: string;
  description?: string;
  milestones?: {
    id: string;
    name: string;
    description?: string;
  }[];
  meta?: {
    [key: string]: any;
  };
};

export type ElementInfo = MetaInformation & {
  // the visual representation of an element (and its children) as seen in its parent elements plane
  svg: string;
  id: string;
  children?: ElementInfo[];
  // marks the element as a subprocess and contains the visual representation of the plane of that subprocess and the contained children
  nestedSubprocess?: { planeSvg: string };
  // information about the imported process that is used by the call-activity that this object represents; can overwrite the information of the call-activity based on the selected settings
  importedProcess?: MetaInformation & {
    planeSvg: string;
    version?: number;
    versionName?: string;
    versionDescription?: string;
  };
};

type TableOfContentProps = Omit<AnchorProps, 'items'> & {
  settings: ActiveSettings;
  processHierarchy?: ElementInfo;
  linksDisabled?: boolean;
};

const TableOfContents: React.FC<TableOfContentProps> = ({
  settings,
  processHierarchy,
  linksDisabled = false,
  ...anchorProps
}) => {
  // transform the document data into a table of contents
  function getTableOfContents(hierarchyElement: ElementInfo): AnchorLinkItemProps | undefined {
    let children: AnchorLinkItemProps[] = [];

    // recursively create content table entries for child elements if necessary/chosen by the user
    if (
      (settings.nestedSubprocesses || !hierarchyElement.nestedSubprocess) &&
      (settings.importedProcesses || !hierarchyElement.importedProcess) &&
      hierarchyElement.children
    ) {
      children = hierarchyElement.children
        .map((child) => getTableOfContents(child))
        .filter(truthyFilter);
    }

    let { milestones, meta, description, importedProcess } = hierarchyElement;

    let label = hierarchyElement.name || `<${hierarchyElement.id}>`;

    if (settings.importedProcesses && importedProcess) {
      label = importedProcess.name!;
      ({ milestones, meta, description } = importedProcess);
    }

    if (milestones) {
      children.unshift({
        key: `${hierarchyElement.id}_milestones`,
        href: linksDisabled ? '' : `#${hierarchyElement.id}_milestone_page`,
        title: 'Milestones',
      });
    }
    if (meta) {
      children.unshift({
        key: `${hierarchyElement.id}_meta`,
        href: linksDisabled ? '' : `#${hierarchyElement.id}_meta_page`,
        title: 'Meta Data',
      });
    }
    if (description) {
      children.unshift({
        key: `${hierarchyElement.id}_description`,
        href: linksDisabled ? '' : `#${hierarchyElement.id}_description_page`,
        title: 'General Description',
      });
    }
    if (settings.importedProcesses && importedProcess && importedProcess.version) {
      children.unshift({
        key: `${hierarchyElement.id}_version`,
        href: linksDisabled ? '' : `#${hierarchyElement.id}_version_page`,
        title: 'Version Information',
      });
    }

    if (settings.hideEmpty && !children.length && !hierarchyElement.children?.length) {
      return undefined;
    }

    return {
      key: hierarchyElement.id,
      href: linksDisabled ? '' : `#${hierarchyElement.id}_page`,
      title: <Text ellipsis={{ tooltip: label }}>{label}</Text>,
      children,
    };
  }

  let tableOfContents: AnchorLinkItemProps | AnchorLinkItemProps[] | undefined = processHierarchy
    ? getTableOfContents(processHierarchy)
    : undefined;

  if (tableOfContents) {
    // put the children of the root process in the root layer of the table of contents instead of nesting them
    const directChildren = tableOfContents.children || [];
    delete tableOfContents.children;
    tableOfContents = [tableOfContents, ...directChildren];
  }

  return tableOfContents ? (
    <Anchor
      className={linksDisabled ? styles.DisabledAnchors : ''}
      {...anchorProps}
      items={tableOfContents}
    ></Anchor>
  ) : (
    <></>
  );
};

export default TableOfContents;
