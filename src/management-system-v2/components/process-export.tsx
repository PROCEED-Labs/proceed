'use client';

import React, { useState } from 'react';

import {
  Modal,
  Checkbox,
  Radio,
  RadioChangeEvent,
  Space,
  Flex,
  Divider,
  Tooltip,
  Slider,
} from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

import { useEnvironment } from './auth-can';
import { exportProcesses } from '@/lib/process-export';
import { ProcessExportOptions, ExportProcessInfo } from '@/lib/process-export/export-preparation';
import { useAddControlCallback } from '@/lib/controls-store';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
  { label: 'PNG', value: 'png' },
];

function getSubOptions(giveSelectionOption?: boolean) {
  const exportSubOptions = {
    bpmn: [
      {
        label: 'with artefacts',
        value: 'artefacts',
        tooltip:
          'Also export html and images used in User-Tasks and images used for other process elements',
      },
      {
        label: 'with referenced processes',
        value: 'imports',
        tooltip: 'Also export all referenced processes used in call-activities',
      },
    ],
    pdf: [
      {
        label: 'with meta data',
        value: 'metaData',
        tooltip: 'Add process meta information to each page (process name, version, etc.)',
      },
      {
        label: 'A4 pages',
        value: 'a4',
        tooltip: 'Use A4 format for all pages (Scales down the process image if necessary)',
      },
      {
        label: 'with referenced processes',
        value: 'imports',
        tooltip: 'Also export all referenced processes used in call-activities',
      },
      {
        label: 'with collapsed subprocesses',
        value: 'subprocesses',
        tooltip: 'Also export content of all collapsed subprocesses',
      },
    ],
    svg: [
      {
        label: 'with referenced processes',
        value: 'imports',
        tooltip: 'Also export all referenced processes used in call-activities',
      },
      {
        label: 'with collapsed subprocesses',
        value: 'subprocesses',
        tooltip: 'Also export content of all collapsed subprocesses',
      },
    ],
    png: [
      {
        label: 'with referenced processes',
        value: 'imports',
        tooltip: 'Also export all referenced processes used in call-activities',
      },
      {
        label: 'with collapsed subprocesses',
        value: 'subprocesses',
        tooltip: 'Also export content of all collapsed subprocesses',
      },
    ],
  };

  const selectionOption = {
    label: 'limit to selection',
    value: 'onlySelection',
    tooltip:
      'Exclude elements from the image(s) that are not selected and not inside a selected element',
  };

  if (giveSelectionOption) {
    exportSubOptions.png.push(selectionOption);
    exportSubOptions.svg.push(selectionOption);
    exportSubOptions.pdf.push(selectionOption);
  }

  return exportSubOptions;
}

type ProcessExportModalProps = {
  processes: ExportProcessInfo; // the processes to export
  onClose: () => void;
  open: boolean;
  giveSelectionOption?: boolean; // if the user can select to limit the export to elements selected in the modeler (only usable in the modeler)
};

const ProcessExportModal: React.FC<ProcessExportModalProps> = ({
  processes = [],
  onClose,
  open,
  giveSelectionOption,
}) => {
  const [selectedType, setSelectedType] = useState<ProcessExportOptions['type']>();
  const [selectedOptions, setSelectedOptions] = useState<CheckboxValueType[]>(['metaData']);
  const [isExporting, setIsExporting] = useState(false);
  const [pngScalingFactor, setPngScalingFactor] = useState(1.5);

  const environment = useEnvironment();

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedOptions(checkedValues);
  };

  const handleClose = () => {
    setIsExporting(false);
    setSelectedOptions(selectedOptions.filter((el) => el !== 'onlySelection'));
    onClose();
  };

  const handleOk = async () => {
    setIsExporting(true);
    await exportProcesses(
      {
        type: selectedType!,
        artefacts: selectedOptions.includes('artefacts'),
        subprocesses: selectedOptions.includes('subprocesses'),
        imports: selectedOptions.includes('imports'),
        metaData: selectedOptions.includes('metaData'),
        a4: selectedOptions.includes('a4'),
        scaling: pngScalingFactor,
        exportSelectionOnly: selectedOptions.includes('onlySelection'),
      },
      processes,
      environment.spaceId,
    );

    handleClose();
  };

  useAddControlCallback(
    'process-list',
    ['selectall', 'esc', 'del', 'copy', 'paste', 'enter', 'cut', 'export', 'import', 'shiftenter'],
    (e) => {
      // e.preventDefault();
    },
    { level: 2, blocking: open },
  );
  useAddControlCallback(
    'process-list',
    'controlenter',
    () => {
      if (selectedType) handleOk();
    },
    { level: 1, blocking: open, dependencies: [selectedType] },
  );

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
    <Space direction="vertical">
      <Checkbox.Group
        onChange={handleOptionSelectionChange}
        value={selectedOptions}
        style={{ width: '100%' }}
      >
        <Space direction="vertical">
          {(selectedType ? getSubOptions(giveSelectionOption)[selectedType] : []).map(
            ({ label, value, tooltip }) => (
              <Checkbox value={value} key={label}>
                <Tooltip placement="right" title={tooltip}>
                  {label}
                </Tooltip>
              </Checkbox>
            ),
          )}
        </Space>
      </Checkbox.Group>
      {selectedType === 'png' && (
        <div style={{ marginTop: '10px' }}>
          <Tooltip placement="left" title="Export with different image resolutions">
            <span>Quality:</span>
          </Tooltip>

          <Radio.Group
            onChange={(e) => setPngScalingFactor(e.target.value)}
            value={pngScalingFactor}
          >
            <Radio value={1.5}>
              <Tooltip placement="bottom" title="Smallest resolution and smallest file size">
                Normal
              </Tooltip>
            </Radio>
            <Radio value={2.5}>
              <Tooltip placement="bottom" title="Medium resolution and medium file size">
                Good
              </Tooltip>
            </Radio>
            <Radio value={4}>
              <Tooltip placement="bottom" title="Highest resolution and biggest file size">
                Excellent
              </Tooltip>
            </Radio>
          </Radio.Group>
        </div>
      )}
    </Space>
  );

  return (
    <>
      <Modal
        title={`Export selected Processes`}
        open={open}
        onOk={handleOk}
        onCancel={handleClose}
        centered
        okButtonProps={{ disabled: !selectedType, loading: isExporting }}
        width={540}
        data-testId="Export Modal"
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
