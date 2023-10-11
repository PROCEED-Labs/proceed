import React, { useState } from 'react';

import { Modal, Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { exportProcesses, exportType } from '@/lib/process-export';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
];

type ProcessExportModalProps = {
  processes: { definitionId: string; processVersion?: number | string }[]; // the processes to export; also used to decide if the modal should be opened
  onClose: () => void;
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({ processes = [], onClose }) => {
  const [selectedTypes, setSelectedTypes] = useState<CheckboxValueType[]>([]);

  const handleTypeSelectionChange = (checkedValues: CheckboxValueType[]) => {
    // allow selection of exactly one element
    if (!checkedValues.length) return;
    setSelectedTypes(checkedValues.filter((el) => !selectedTypes.includes(el)));
  };

  const handleProcessExport = async () => {
    await exportProcesses(processes, selectedTypes[0] as exportType);

    onClose();
  };

  return (
    <>
      <Modal
        title="Export selected process"
        open={!!processes.length}
        onOk={handleProcessExport}
        onCancel={onClose}
        centered
        okButtonProps={{ disabled: !selectedTypes.length }}
      >
        <Checkbox.Group
          options={exportTypeOptions}
          onChange={handleTypeSelectionChange}
          value={selectedTypes}
          style={{ flexDirection: 'column' }}
        />
      </Modal>
    </>
  );
};

export default ProcessExportModal;
