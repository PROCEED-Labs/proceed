'use client';

import React, { useEffect } from 'react';

import { SettingGroup } from './type-util';
import useSettingsPageStore from './use-settings-page-store';

type InjectorProps = {
  sectionName: string;
  group: SettingGroup;
  priority?: number;
};

const SettingsInjector: React.FC<InjectorProps> = ({ sectionName, group, priority = 1000 }) => {
  const { registerSection, setPriority } = useSettingsPageStore();

  useEffect(() => {
    registerSection(sectionName, group);
    setPriority(sectionName, priority);
  }, [registerSection, setPriority, sectionName, priority, group]);

  return null;
};

export default SettingsInjector;
