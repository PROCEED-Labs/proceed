import React, { useState } from 'react';

import { Modal, Checkbox, Radio, RadioChangeEvent, Space, Flex, Divider } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { exportProcesses } from '@/lib/process-export';
import { ProcessExportOptions } from '@/lib/process-export/export-preparation';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
];

const exportSubOptions = {
  bpmn: [
    { label: 'with referenced Processes', value: 'imports' },
    { label: 'with Artefacts', value: 'artefacts' },
  ],
  pdf: [
    { label: 'with Title', value: 'titles' },
    { label: 'A4 Pages', value: 'a4' },
    { label: 'with referenced Processes', value: 'imports' },
    { label: 'with collapsed Subprocesses', value: 'subprocesses' },
  ],
  svg: [
    { label: 'with referenced Processes', value: 'imports' },
    { label: 'with collapsed Subprocesses', value: 'subprocesses' },
  ],
};

type ProcessExportModalProps = {
  processes: { definitionId: string; processVersion?: number | string }[]; // the processes to export; also used to decide if the modal should be opened
  onClose: () => void;
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({ processes = [], onClose }) => {
  const [selectedType, setSelectedType] = useState<ProcessExportOptions['type']>();
  const [selectedOptions, setSelectedOptions] = useState<CheckboxValueType[]>(['titles']);
  const [isExporting, setIsExporting] = useState(false);

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedOptions(checkedValues);
  };

  const handleClose = () => {
    setIsExporting(false);
    onClose();
  };

  const handleOk = async () => {
    setIsExporting(true);
    await exportProcesses(
      {
        type: selectedType!,
        artefacts: selectedOptions.some((el) => el === 'artefacts'),
        subprocesses: selectedOptions.some((el) => el === 'subprocesses'),
        imports: selectedOptions.some((el) => el === 'imports'),
        titles: selectedOptions.some((el) => el === 'titles'),
        a4: selectedOptions.some((el) => el === 'a4'),
      },
      processes,
    );

    handleClose();
  };

  const typeSelection = (
    <Radio.Group onChange={handleTypeSelectionChange} value={selectedType} style={{ width: '50%' }}>
      <Space direction="vertical">
        {exportTypeOptions.map(({ label, value }) => (
          <Radio value={value} key={value}>
            {label}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  );

  const optionSelection = (
    <Checkbox.Group
      options={exportSubOptions[selectedType!]}
      onChange={handleOptionSelectionChange}
      value={selectedOptions}
      style={{ flexDirection: 'column', width: '50%' }}
    />
  );

  return (
    <>
      <Modal
        title={`Export selected processes`}
        open={!!processes.length}
        onOk={handleOk}
        onCancel={handleClose}
        centered
        okButtonProps={{ disabled: !selectedType, loading: isExporting }}
      >
        <Flex>
          {typeSelection}
          <Divider type="vertical" style={{ height: 'auto' }} />
          {!!selectedType && optionSelection}
        </Flex>
      </Modal>
    </>
  );
};

export default ProcessExportModal;
