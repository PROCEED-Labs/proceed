'use client';

import React, { useRef } from 'react';
import { Anchor, Col, Row, AnchorProps } from 'antd';

import { SettingGroup as SettingGroupType, isGroup, mergeKeys } from './type-util';
import useSettingsPageStore from './use-settings-page-store';

type SettingsPageProps = {
  [sectionName: string]: React.ReactNode;
} & React.PropsWithChildren;

const SettingsPage: React.FC<SettingsPageProps> = ({ children, ...sections }) => {
  const { settings, priorities } = useSettingsPageStore();

  const mapToLink: (
    group: SettingGroupType,
    parentKey?: string,
  ) => NonNullable<AnchorProps['items']>[number] = (group, parentKey = '') => {
    return {
      key: group.key,
      title: group.name,
      href: '#' + mergeKeys(group, parentKey),
      children: group.children
        .filter(isGroup)
        .map((child) => mapToLink(child, mergeKeys(group, parentKey))),
    };
  };

  const [content, links] = (Object.entries(sections) as [string, React.ReactNode][])
    .sort((a, b) => {
      return (priorities[b[0]] || 0) - (priorities[a[0]] || 0);
    })
    .reduce(
      (acc, curr) => {
        const setting = settings[curr[0]];
        return [
          [...acc[0], { [curr[0]]: curr[1] }],
          setting ? [...acc[1], mapToLink(setting)] : acc[1],
        ];
      },
      [[], []] as [{ [key: string]: React.ReactNode }[], ReturnType<typeof mapToLink>[]],
    );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <Row style={{ height: '100%' }}>
      <Col style={{ height: '100%', overflowY: 'auto' }} span={4}>
        <Anchor items={links} getContainer={() => scrollContainerRef.current!} />
      </Col>
      <Col style={{ height: '100%', overflowY: 'auto' }} ref={scrollContainerRef} span={20}>
        {content.map((entry) => {
          const [[key, node]] = Object.entries(entry);
          return (
            <div style={{ display: key in priorities ? 'block' : 'none' }} key={key}>
              {node}
            </div>
          );
        })}
      </Col>
    </Row>
  );
};

export default SettingsPage;
