import React, { useState } from 'react';

import {
  Checkbox,
  Radio,
  RadioChangeEvent,
  Space,
  Flex,
  Divider,
  Tooltip,
  Button,
  Grid,
  Select,
} from 'antd';

import { useEnvironment } from '@/components/auth-can';
import { exportProcesses as exportProcessesAsFile } from '@/lib/process-export';
import { ProcessExportOptions, ExportProcessInfo } from '@/lib/process-export/export-preparation';
import { useAddControlCallback } from '@/lib/controls-store';

import {
  settings as pdfSettings,
  settingsOptions as pdfOptions,
} from '@/app/shared-viewer/settings-modal';
import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { createPortal } from 'react-dom';
import useModelerStateStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import useProcessVersion from './use-process-version';

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
  processes: (ExportProcessInfo[number] & { versions?: ProcessMetadata['versions'] })[]; // the processes to export
  buttonContainerRef: React.RefObject<HTMLDivElement>;
  active: boolean;
};

const ProcessExport: React.FC<ProcessExportModalProps> = ({
  processes,
  buttonContainerRef,
  active,
}) => {
  const onlyOneProcess = processes.length === 1;

  const isMobile = !!Grid.useBreakpoint().xs;
  const modeler = useModelerStateStore((state) => state.modeler);
  const environment = useEnvironment();

  const [selectedVersionId, setSelectedVersionId] = useProcessVersion(processes[0]?.versions);

  const [selectedType, setSelectedType] = useState<ProcessExportTypes | undefined>();
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['metaData'].concat(pdfOptions));
  const [pngScalingFactor, setPngScalingFactor] = useState(1.5);

  const [isExporting, setIsExporting] = useState(false);

  // TODO: fix this
  // NOTE: this works, because when the share modal is opened this component is rerendered
  let selectedElements: string[] | undefined = undefined;
  let rootSubprocessLayerId: string | undefined = undefined;
  if (modeler && onlyOneProcess) {
    // provide additional information for the export that is used if the user decides to only export selected elements (also controls if the option is given in the first place)
    selectedElements = modeler
      .getSelection()
      .get()
      .map(({ id }) => id);

    // provide additional information for the export so only the parts of the process that can be reached from the currently open layer are exported
    const currentRootElement = modeler.getCanvas().getRootElement();
    rootSubprocessLayerId = bpmnIs(currentRootElement, 'bpmn:SubProcess')
      ? currentRootElement.businessObject?.id
      : undefined;
  }

  const handleTypeSelectionChange = ({ target: { value } }: RadioChangeEvent) => {
    setSelectedType(value);
  };

  const handleOptionSelectionChange = (checkedValues: string[]) => {
    setSelectedOptions(checkedValues);
  };

  async function exportProcesses() {
    setIsExporting(true);

    if (selectedType === 'pdf') {
      const { definitionId, processVersion } = processes[0];

      let versionId = processVersion;
      if (onlyOneProcess && selectedVersionId) versionId = selectedVersionId;

      // the timestamp does not matter here since it is overridden by the user being an owner of the process
      await wrapServerCall({
        fn: () => {
          debugger;
          return generateSharedViewerUrl(
            { processId: definitionId, timestamp: 0 },
            versionId,
            selectedOptions as string[],
          );
        },
        onSuccess: (url) => window.open(url, `${definitionId}-${processVersion}-tab`),
      });
    } else {
      const processesWithExportInfo = processes.map((process) => ({
        selectedElements,
        rootSubprocessLayerId,
        ...process,
      }));

      if (onlyOneProcess && selectedVersionId)
        processesWithExportInfo[0].processVersion = selectedVersionId;

      await exportProcessesAsFile(
        {
          type: selectedType!,
          artefacts: selectedOptions.includes('artefacts'),
          subprocesses: selectedOptions.includes('subprocesses'),
          imports: selectedOptions.includes('imports'),
          scaling: pngScalingFactor,
          exportSelectionOnly: selectedOptions.includes('onlySelection'),
          useWebshareApi: isMobile,
        },
        processesWithExportInfo,
        environment.spaceId,
      );
    }

    setIsExporting(false);
    // TODO: run these only when the export succeeds
    setSelectedType(undefined);
    setSelectedOptions(selectedOptions.filter((el) => el !== 'onlySelection'));

    //  TODO: should we still use this?
    //  if (preselectedExportType && resetPreselectedExportType) resetPreselectedExportType();
  }

  // level = 2, to skip the block imposed in the share modal
  useAddControlCallback(
    ['process-list', 'modeler'],
    'control+enter',
    () => {
      if (selectedType) exportProcesses();
    },
    { level: 2, blocking: active, dependencies: [selectedType] },
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

  const disabledPdfExport = selectedType === 'pdf' && processes.length > 1;

  const optionSelection = (
    <>
      <Space direction="vertical">
        <Checkbox.Group
          onChange={handleOptionSelectionChange}
          value={selectedOptions}
          style={{ width: '100%' }}
        >
          <Space direction="vertical">
            {(selectedType
              ? getSubOptions(selectedElements ? selectedElements.length > 0 : false)[selectedType]
              : []
            ).map(({ label, value, tooltip }) => (
              <Checkbox value={value} key={label} disabled={disabledPdfExport}>
                <Tooltip placement="right" title={tooltip}>
                  {label}
                </Tooltip>
              </Checkbox>
            ))}
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
    </>
  );

  return (
    <Space direction="vertical" style={{ gap: '1rem', width: '100%' }}>
      {onlyOneProcess && (
        <Select
          value={selectedVersionId || '-1'}
          options={[
            { value: '-1', label: 'Latest Version' },
            ...(processes[0]?.versions || []).map((version) => ({
              value: version.id,
              label: version.name,
            })),
          ]}
          onChange={(value) => {
            setSelectedVersionId(value === '-1' ? null : value);
          }}
          style={{ width: '35 %' }}
        />
      )}
      <Flex>
        {typeSelection}
        <Divider type="vertical" style={{ height: 'auto' }} />
        {!!selectedType && optionSelection}
        {active &&
          createPortal(
            <Button
              disabled={!selectedType || disabledPdfExport}
              loading={isExporting}
              type="primary"
              style={{ marginLeft: '.5rem' }}
              onClick={exportProcesses}
            >
              {disabledPdfExport
                ? 'PDF export is only available when a single process is selected'
                : 'Export'}
            </Button>,
            buttonContainerRef.current!,
          )}
      </Flex>
    </Space>
  );
};

export default ProcessExport;
