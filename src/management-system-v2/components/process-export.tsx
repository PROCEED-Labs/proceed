import React, { useState } from 'react';
import { useParams } from 'next/navigation';

import { Modal, Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import { exportBpmn, exportPDF, exportSVG } from '@/lib/process-export';

type ProcessExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
];

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedTypes, setSelectedTypes] = useState<CheckboxValueType[]>([]);

  const handleTypeSelectionChange = (checkedValues: CheckboxValueType[]) => {
    // allow selection of exactly one element
    if (!checkedValues.length) return;
    setSelectedTypes(checkedValues.filter((el) => !selectedTypes.includes(el)));
  };

  const { processId } = useParams();
  const modeler = useModelerStateStore((state) => state.modeler);

  const handleProcessExport = async () => {
    if (modeler) {
      const { xml } = await modeler.saveXML({ format: true });

      if (!xml) throw 'Failed to export the bpmn from the modeler';

      switch (selectedTypes[0]) {
        case 'bpmn':
          exportBpmn(processId, xml);
          break;
        case 'pdf':
          await exportPDF(processId, xml);
          break;
        case 'svg':
          await exportSVG(processId, xml);
          break;
        default:
          throw 'Unexpected value for process export!';
      }
    } else {
      throw 'Could not get the modeler to export the bpmn!';
    }

    onClose();
  };

  return (
    <>
      <Modal
        title="Export selected process"
        open={isOpen}
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
