'use client';

import React, { useRef } from 'react';
import { Anchor, Col, Row, AnchorProps, Form } from 'antd';

import { Setting as SettingType, SettingGroup as SettingGroupType, isGroup } from './type-util';
import useSettingsPageStore from './use-settings-page-store';

const mergeKeys = (setting: SettingType | SettingGroupType, parentKey?: string) => {
  return parentKey ? `${parentKey}.${setting.key}` : setting.key;
};

const SettingsPage: React.FC<React.PropsWithChildren> = ({ children }) => {
  const settings = useSettingsPageStore((state) => state.settings);

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

  const links = Object.values(settings).map((setting) => mapToLink(setting));

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <Row style={{ height: '100%' }}>
      <Col style={{ height: '100%' }} span={4}>
        <Anchor items={links} getContainer={() => scrollContainerRef.current!} />
      </Col>
      <Col style={{ height: '100%', overflowY: 'auto' }} ref={scrollContainerRef} span={20}>
        <Form>{children}</Form>
      </Col>
    </Row>
  );
};

export default SettingsPage;
