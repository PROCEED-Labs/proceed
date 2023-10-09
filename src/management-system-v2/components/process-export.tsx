import React, { useState } from 'react';

import { Modal, Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { exportBpmn, exportPDF, exportSVG } from '@/lib/process-export';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
];

type ProcessExportModalProps = {
  processId?: string; // the id of the process to export; also used to decide if the modal should be opened
  onClose: () => void;
  processVersion?: number | string;
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({
  processId,
  onClose,
  processVersion,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<CheckboxValueType[]>([]);

  const handleTypeSelectionChange = (checkedValues: CheckboxValueType[]) => {
    // allow selection of exactly one element
    if (!checkedValues.length) return;
    setSelectedTypes(checkedValues.filter((el) => !selectedTypes.includes(el)));
  };

  const handleProcessExport = async () => {
    switch (selectedTypes[0]) {
      case 'bpmn':
        await exportBpmn(processId!, processVersion);
        break;
      case 'pdf':
        await exportPDF(processId!, processVersion);
        break;
      case 'svg':
        await exportSVG(processId!, processVersion);
        break;
      default:
        throw 'Unexpected value for process export!';
    }

    onClose();
  };

  return (
    <>
      <Modal
        title="Export selected process"
        open={!!processId}
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
