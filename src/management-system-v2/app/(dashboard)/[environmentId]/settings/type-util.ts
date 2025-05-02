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

export type Setting = (
  | AtomicSetting<'boolean'>
  | AtomicSetting<'string'>
  | AtomicSetting<'number'>
  | SelectSetting
) &
  SettingsEntryInfo;

export type SettingGroup = {
  children: (Setting | SettingGroup)[];
} & SettingsEntryInfo;

export function isGroup(setting: Setting | SettingGroup): setting is SettingGroup {
  return (setting as SettingGroup).children !== undefined;
}

export type Settings = Record<string, SettingGroup>;
