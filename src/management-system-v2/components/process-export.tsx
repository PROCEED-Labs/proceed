import React, { useState } from 'react';

import { Modal, Checkbox, Radio, RadioChangeEvent, Space } from 'antd';
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
    { label: 'Export with referenced Processes', value: 'imports' },
    { label: 'Export with Artefacts', value: 'artefacts' },
  ],
  pdf: [
    { label: 'Export with referenced Processes', value: 'imports' },
    { label: 'Export with collapsed subprocesses', value: 'subprocesses' },
  ],
  svg: [
    { label: 'Export with referenced Processes', value: 'imports' },
    { label: 'Export with collapsed subprocesses', value: 'subprocesses' },
  ],
};

type ProcessExportModalProps = {
  processes: { definitionId: string; processVersion?: number | string }[]; // the processes to export; also used to decide if the modal should be opened
  onClose: () => void;
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({ processes = [], onClose }) => {
  const [selectedType, setSelectedType] = useState<ProcessExportOptions['type']>();
  const [selectedOptions, setSelectedOptions] = useState<CheckboxValueType[]>([]);
  const [finishedTypeSelection, setfinishedTypeSelection] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedOptions(checkedValues);
  };

  const handleClose = () => {
    setSelectedType(undefined);
    setSelectedOptions([]);
    setfinishedTypeSelection(false);
    setIsExporting(false);
    onClose();
  };

  const handleOk = async () => {
    if (!finishedTypeSelection) {
      const subOptions = exportSubOptions[selectedType!];
      if (subOptions && subOptions.length) {
        // there are suboptions that the user might want to select => switch to the other modal view
        setfinishedTypeSelection(true);
        return;
      }
    }

    setIsExporting(true);
    await exportProcesses(
      {
        type: selectedType!,
        artefacts: selectedOptions.some((el) => el === 'artefacts'),
        subprocesses: selectedOptions.some((el) => el === 'subprocesses'),
        imports: selectedOptions.some((el) => el === 'imports'),
      },
      processes,
    );

    handleClose();
  };

  const modalTitle = finishedTypeSelection
    ? `Select ${selectedType} export options`
    : 'Select the file type';

  const typeSelection = (
    <Radio.Group onChange={handleTypeSelectionChange} value={selectedType}>
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
      style={{ flexDirection: 'column' }}
    />
  );

  return (
    <>
      <Modal
        title={modalTitle}
        open={!!processes.length}
        onOk={handleOk}
        onCancel={handleClose}
        centered
        okButtonProps={{ disabled: !selectedType, loading: isExporting }}
      >
        {finishedTypeSelection ? optionSelection : typeSelection}
      </Modal>
    </>
  );
};

export default ProcessExportModal;
