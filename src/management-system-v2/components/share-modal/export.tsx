import React, { useEffect, useState } from 'react';

import {
  Modal,
  Checkbox,
  Radio,
  RadioChangeEvent,
  Space,
  Flex,
  Divider,
  Tooltip,
  Button,
} from 'antd';

import { useEnvironment } from '@/components/auth-can';
import { exportProcesses } from '@/lib/process-export';
import { ProcessExportOptions, ExportProcessInfo } from '@/lib/process-export/export-preparation';
import { useAddControlCallback } from '@/lib/controls-store';

import {
  settings as pdfSettings,
  settingsOptions as pdfOptions,
} from '@/app/shared-viewer/settings-modal';
import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

const exportTypeOptions = [
  { label: 'BPMN', value: 'bpmn' },
  { label: 'PDF', value: 'pdf' },
  { label: 'SVG', value: 'svg' },
  { label: 'PNG', value: 'png' },
];

export type ProcessExportTypes = ProcessExportOptions['type'] | 'pdf';

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
    pdf: pdfSettings,
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
  }

  return exportSubOptions;
}

type ProcessExportModalProps = {
  processes: ExportProcessInfo; // the processes to export
  giveSelectionOption?: boolean; // if the user can select to limit the export to elements selected in the modeler (only usable in the modeler)
  preselectedExportType?: ProcessExportTypes;
  resetPreselectedExportType?: () => void;
  buttonContainerRef: React.RefObject<HTMLDivElement>;
  active: boolean;
};

const ProcessExport: React.FC<ProcessExportModalProps> = ({
  processes = [],
  giveSelectionOption,
  preselectedExportType,
  resetPreselectedExportType,
  buttonContainerRef,
  active,
}) => {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<ProcessExportTypes | undefined>(
    preselectedExportType,
  );

  useEffect(() => {
    setSelectedType(preselectedExportType);
  }, [preselectedExportType]);

  const [selectedOptions, setSelectedOptions] = useState<string[]>(['metaData'].concat(pdfOptions));

  const [isExporting, setIsExporting] = useState(false);
  const [pngScalingFactor, setPngScalingFactor] = useState(1.5);

  const environment = useEnvironment();

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: string[]) => {
    setSelectedOptions(checkedValues);
  };

  //const handleClose = () => {
  //  setIsExporting(false);
  //  setSelectedOptions(selectedOptions.filter((el) => el !== 'onlySelection'));
  //  if (preselectedExportType && resetPreselectedExportType) resetPreselectedExportType();
  //  setSelectedType(undefined);
  //  onClose();
  //};

  const handleOk = async () => {
    setIsExporting(true);

    if (selectedType === 'pdf') {
      const { definitionId, processVersion } = processes[0];

      // the timestamp does not matter here since it is overridden by the user being an owner of the process
      await wrapServerCall({
        fn: () =>
          generateSharedViewerUrl(
            { processId: definitionId, timestamp: 0 },
            processVersion || undefined,
            selectedOptions as string[],
          ),
        onSuccess: (url) =>
          router.push(new URL(url, `${definitionId}-${processVersion}-tab`).toString()),
      });
    } else {
      await exportProcesses(
        {
          type: selectedType!,
          artefacts: selectedOptions.includes('artefacts'),
          subprocesses: selectedOptions.includes('subprocesses'),
          imports: selectedOptions.includes('imports'),
          scaling: pngScalingFactor,
          exportSelectionOnly: selectedOptions.includes('onlySelection'),
          useWebshareApi: preselectedExportType !== undefined,
        },
        processes,
        environment.spaceId,
      );
    }

    setIsExporting(false);
  };

  //useAddControlCallback(
  //  ['process-list' /* , 'processes-page' */],
  //  // 'process-list',
  //  [
  //    'selectall',
  //    'esc',
  //    'del',
  //    'copy',
  //    'paste',
  //    'enter',
  //    'cut',
  //    'export',
  //    'import',
  //    'shift+enter',
  //    'new',
  //  ],
  //  (e) => {
  //    // e.preventDefault();
  //  },
  //  { level: 2, blocking: open },
  //);
  //useAddControlCallback(
  //  ['process-list', 'modeler'],
  //  // 'process-list',
  //  'control+enter',
  //  () => {
  //    if (selectedType) handleOk();
  //  },
  //  { level: 1, blocking: open, dependencies: [selectedType] },
  // );

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

  const disabledPdfExport = selectedType === 'pdf' && processes.length > 1;

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
              <Checkbox value={value} key={label} disabled={disabledPdfExport}>
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
      <Flex>
        {preselectedExportType ? null : typeSelection}
        <Divider type="vertical" style={{ height: 'auto' }} />
        {!!selectedType && optionSelection}
        {active &&
          createPortal(
            <Button
              disabled={!selectedType || disabledPdfExport}
              loading={isExporting}
              type="primary"
              style={{ marginLeft: '.5rem' }}
              onClick={handleOk}
            >
              {disabledPdfExport
                ? 'PDF export is only available when a single process is selected'
                : 'Export'}
            </Button>,
            buttonContainerRef.current!,
          )}
      </Flex>
    </>
  );
};

export default ProcessExport;
