import React, { useState } from 'react';

import { Modal, Checkbox, Space, Tooltip, Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

export const settings = [
  {
    label: 'Separate Title Page',
    value: 'titlepage',
    tooltip:
      'The first page contains only the title. The table of contents or the content start on the second page',
  },
  {
    label: 'Table of Contents',
    value: 'tableOfContents',
    tooltip: 'Will add a table of contents between the title and the main content',
  },
  {
    label: 'Element Visualization',
    value: 'showElementSVG',
    tooltip: 'Every sub-chapter of an element contains a visualization of that element',
  },
  {
    label: 'Nested Subprocesses',
    value: 'nestedSubprocesses',
    tooltip: 'Add the content of collapsed subprocesses as sub-chapters.',
  },
  {
    label: 'Imported Processes',
    value: 'importedProcesses',
    tooltip:
      'Add the content of processes that are imported as the internal logic of a call-activity in the process.',
  },
  {
    label: 'Include Empty Elements',
    value: 'hideEmpty',
    tooltip:
      'Will include sub-chapters of elements that have no meta data and of collapsed sub-processes that contain no elements.',
  },
] as const;

export const instanceSettings = [
  ...settings,
  {
    label: 'Instance Status',
    value: 'showInstanceStatus',
    tooltip: 'Show the execution status for each element in the instance.',
  },
  {
    label: 'Instance Variables',
    value: 'showInstanceVariables',
    tooltip: 'Show the instance variables at the end of the document.',
  },
] as const;

export const settingsOptions = settings.map(({ value }) => value);

export type SettingsOption = typeof settingsOptions;
export type ActiveSettings = Partial<{
  [key in SettingsOption[number] | 'showInstanceStatus' | 'showInstanceVariables']: boolean;
}>;

type AnySettingItem = { label: string; value: string; tooltip: string };

type SettingsModalProps = {
  checkedSettings: string[];
  onConfirm: (settings: string[]) => void;
  availableSettings?: readonly AnySettingItem[];
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  checkedSettings,
  onConfirm,
  availableSettings = settings,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>(checkedSettings);

  const handleCancel = () => {
    setModalOpen(false);
    setChecked(checkedSettings);
  };

  const handleConfirm = () => {
    setModalOpen(false);
    onConfirm(checked);
  };

  return (
    <>
      <Modal
        closeIcon={null}
        title="Settings"
        open={modalOpen}
        onOk={handleConfirm}
        onCancel={handleCancel}
      >
        <Checkbox.Group value={checked} onChange={(vals) => setChecked(vals as string[])}>
          <Space orientation="vertical">
            {availableSettings.map(({ label, value, tooltip }) => (
              <Tooltip placement="right" title={tooltip} key={label}>
                <Checkbox value={value}>{label}</Checkbox>
              </Tooltip>
            ))}
          </Space>
        </Checkbox.Group>
      </Modal>

      <Tooltip title="Settings">
        <Button size="large" icon={<SettingOutlined />} onClick={() => setModalOpen(true)} />
      </Tooltip>
    </>
  );
};

export default SettingsModal;
