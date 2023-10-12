import React, { useState } from 'react';

import { Modal, Checkbox, Radio, RadioChangeEvent } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { ProcessExportOptions, ProcessesExporter } from '@/lib/process-export/ProcessesExporter';
import { exportProcesses } from '@/lib/process-export';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
];

const exportSubOptions = {
  bpmn: [{ label: 'Export with Artefacts', value: 'artefacts' }],
  pdf: [],
  svg: [],
};

type ProcessExportModalProps = {
  processes: { definitionId: string; processVersion?: number | string }[]; // the processes to export; also used to decide if the modal should be opened
  onClose: () => void;
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({ processes = [], onClose }) => {
  const [selectedType, setSelectedType] = useState<ProcessExportOptions['type']>();
  const [selectedOptions, setSelectedOptions] = useState<CheckboxValueType[]>([]);
  const [finishedTypeSelection, setfinishedTypeSelection] = useState(false);

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedOptions(checkedValues);
  };

  const handleClose = () => {
    setSelectedType(undefined);
    setfinishedTypeSelection(false);
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

    // export the processes
    // await new ProcessesExporter(
    // {
    //   type: selectedTypes[0] as ProcessExportOptions['type'],
    //   artefacts: selectedOptions.some((el) => el === 'artefacts'),
    // },
    // processes,
    // ).exportProcesses();
    await exportProcesses(
      {
        type: selectedType!,
        artefacts: selectedOptions.some((el) => el === 'artefacts'),
      },
      processes,
    );

    handleClose();
  };

  const modalTitle = finishedTypeSelection
    ? `Select ${selectedType} export options`
    : 'Select the file type';

  const typeSelection = (
    <Radio.Group
      options={exportTypeOptions}
      onChange={handleTypeSelectionChange}
      value={selectedType}
      style={{ flexDirection: 'column' }}
    />
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
        okButtonProps={{ disabled: !selectedType }}
      >
        {finishedTypeSelection ? optionSelection : typeSelection}
      </Modal>
    </>
  );
};

export default ProcessExportModal;
