import React from 'react';

import { Anchor, Typography } from 'antd';
const { Text } = Typography;
import { AnchorProps, AnchorLinkItemProps } from 'antd/es/anchor/Anchor';

import { truthyFilter } from '@/lib/typescript-utils';

import { ActiveSettings } from './settings-modal';

export type ElementInfo = {
  // the visual representation of an element (and its children) as seen in its parent elements plane
  svg: string;
  // the visual representation of the plane of an element (sub-process) and the contained children
  planeSvg?: string;
  name?: string;
  id: string;
  description?: string;
  children?: ElementInfo[];
  // if the element contains other elements (process, sub-process, pool)
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

type TableOfContentProps = Omit<AnchorProps, 'items'> & {
  settings: ActiveSettings;
  processHierarchy?: ElementInfo;
};

const TableOfContents: React.FC<TableOfContentProps> = ({
  settings,
  processHierarchy,
  ...anchorProps
}) => {
  // transform the document data into a table of contents
  function getTableOfContents(hierarchyElement: ElementInfo): AnchorLinkItemProps | undefined {
    let children: AnchorLinkItemProps[] = [];

    // recursively create content table entries for child elements if necessary/chosen by the user
    if ((settings.subprocesses || !hierarchyElement.planeSvg) && hierarchyElement.children) {
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

    if (settings.hideEmpty && !children.length && !hierarchyElement.children?.length) {
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
    // put the children of the root process in the root layer of the table of contents instead of nesting them
    const directChildren = tableOfContents.children || [];
    delete tableOfContents.children;
    tableOfContents = [tableOfContents, ...directChildren];
  }

  return tableOfContents ? <Anchor {...anchorProps} items={tableOfContents}></Anchor> : <></>;
};

export default TableOfContents;
