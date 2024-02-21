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
    label: 'Exclude Empty Elements',
    value: 'hideEmpty',
    tooltip:
      'Will exclude sub-chapters of elements that have no meta data and of collapsed sub-processes that contain no elements.',
  },
] as const;

export const settingsOptions = settings.map(({ value }) => value);

export type SettingsOption = typeof settingsOptions;

export type ActiveSettings = Partial<{ [key in SettingsOption[number]]: boolean }>;

type SettingsModalProps = {
  checkedSettings: SettingsOption;
  onConfirm: (settings: SettingsModalProps['checkedSettings']) => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ checkedSettings, onConfirm }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState<SettingsOption>(checkedSettings);

  const handleSettingsChange = (checkedValues: SettingsOption) => {
    setChecked(checkedValues);
  };

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
        <Checkbox.Group value={checked} onChange={handleSettingsChange}>
          <Space direction="vertical">
            {settings.map(({ label, value, tooltip }) => (
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
