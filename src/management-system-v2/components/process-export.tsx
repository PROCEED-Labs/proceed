import React, { useState } from 'react';

import { Modal, Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { ProcessExportOptions, ProcessesExporter } from '@/lib/process-export/ProcessesExporter';

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
  const [selectedTypes, setSelectedTypes] = useState<CheckboxValueType[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<CheckboxValueType[]>([]);
  const [typeSelected, setTypeSelected] = useState(false);

  const handleTypeSelectionChange = (checkedValues: CheckboxValueType[]) => {
    // allow selection of exactly one element
    if (!checkedValues.length) return;
    setSelectedTypes(checkedValues.filter((el) => !selectedTypes.includes(el)));
    // reset the selected suboptions
    setSelectedOptions([]);
  };

  const handleOptionSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedOptions(checkedValues);
  };

  const handleClose = () => {
    setSelectedTypes([]);
    setTypeSelected(false);
    onClose();
  };

  const handleOk = async () => {
    if (!typeSelected) {
      const subOptions = exportSubOptions[selectedTypes[0] as ProcessExportOptions['type']];
      if (subOptions && subOptions.length) {
        // there are suboptions that the user might want to select => switch to the other modal view
        setTypeSelected(true);
        return;
      }
    }

    // export the process
    await new ProcessesExporter(
      {
        type: selectedTypes[0] as ProcessExportOptions['type'],
        artefacts: selectedOptions.some((el) => el === 'artefacts'),
      },
      processes,
    ).exportProcesses();

    handleClose();
  };

  const modalTitle = typeSelected
    ? `Select ${selectedTypes[0]} export options`
    : 'Select the file type';

  const typeSelection = (
    <Checkbox.Group
      options={exportTypeOptions}
      onChange={handleTypeSelectionChange}
      value={selectedTypes}
      style={{ flexDirection: 'column' }}
    />
  );

  const optionSelection = (
    <Checkbox.Group
      options={exportSubOptions[selectedTypes[0] as ProcessExportOptions['type']]}
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
        okButtonProps={{ disabled: !selectedTypes.length }}
      >
        {typeSelected ? optionSelection : typeSelection}
      </Modal>
    </>
  );
};

export default ProcessExportModal;
