type SettingsEntryInfo = {
  key: string;
  name: string;
  description?: string;
};

type TypeNameTypeMap = {
  boolean: boolean;
  string: string;
  number: number;
};

export type AtomicSetting<TypeName extends keyof TypeNameTypeMap> = {
  type: TypeName;
  value: TypeNameTypeMap[TypeName];
};

type SelectSetting = {
  type: 'select';
  optionType: 'string';
  value: string;
  options?: { value: string; label: string }[];
};

type CustomSetting = {
  type: 'custom';
  value: any;
};

export type Setting = (
  | AtomicSetting<'boolean'>
  | AtomicSetting<'string'>
  | AtomicSetting<'number'>
  | SelectSetting
  | CustomSetting
) &
  SettingsEntryInfo;

export type SettingGroup = {
  children: (Setting | SettingGroup)[];
} & SettingsEntryInfo;

export function isGroup(setting: Setting | SettingGroup): setting is SettingGroup {
  return (setting as SettingGroup).children !== undefined;
}

export const mergeKeys = (setting: Setting | SettingGroup, parentKey?: string) => {
  return parentKey ? `${parentKey}.${setting.key}` : setting.key;
};

export type Settings = Record<string, SettingGroup>;
