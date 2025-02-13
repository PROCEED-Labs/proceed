import React, { useState } from 'react';
import { Checkbox, Radio, Space, Tooltip, Button, Select, Alert, App } from 'antd';
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
import useModelerStateStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { ProcessMetadata } from '@/lib/data/process-schema';
import useProcessVersion from './use-process-version';
import { UserError, UserErrorType } from '@/lib/user-error';
import { FaRegQuestionCircle } from 'react-icons/fa';

export type ProcessExportTypes = ProcessExportOptions['type'] | 'pdf';

export const defaultExportState: ExportOptionState = {
  bpmn: { selectedOptions: [] },
  svg: { selectedOptions: [] },
  png: { selectedOptions: [] },
  pdf: { selectedOptions: [...pdfOptions] },
  pngScalingFactor: 1.5,
};

function getSubOptions(giveSelectionOption?: boolean) {
  const exportSubOptions = {
    bpmn: [
      {
        label: 'with artefacts',
        value: 'artefacts',
        tooltip:
          'Also export html and images used in User-Tasks and images used for other process elements',
      },
      // NOTE: not supported yet
      // {
      //   label: 'with referenced processes',
      //   value: 'imports',
      //   tooltip: 'Also export all referenced processes used in call-activities',
      // },
    ],
    pdf: pdfSettings,
    svg: [
      // NOTE: not supported yet
      // {
      //   label: 'with referenced processes',
      //   value: 'imports',
      //   tooltip: 'Also export all referenced processes used in call-activities',
      // },
      {
        label: 'with collapsed subprocesses',
        value: 'subprocesses',
        tooltip: 'Also export content of all collapsed subprocesses',
      },
    ],
    png: [
      // NOTE: not supported yet
      //{
      //  label: 'with referenced processes',
      //  value: 'imports',
      //  tooltip: 'Also export all referenced processes used in call-activities',
      //},
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

/* -------------------------------------------------------------------------------------------------
 * Options State
 * -----------------------------------------------------------------------------------------------*/
type ExportOptionState = Record<ProcessExportTypes, { selectedOptions: string[] }> & {
  pngScalingFactor: number;
};
type ExportVersionSelectionState = Record<ProcessExportTypes, ReturnType<typeof useProcessVersion>>;
export function useExportOptionsState(versions?: ProcessMetadata['versions']) {
  const exportState = useState<ExportOptionState>(defaultExportState);
  const selectedVersionIdsState: ExportVersionSelectionState = {
    bpmn: useProcessVersion(versions),
    svg: useProcessVersion(versions),
    png: useProcessVersion(versions),
    pdf: useProcessVersion(versions),
  };

  return [exportState, selectedVersionIdsState] as const;
}

/* -------------------------------------------------------------------------------------------------
 * ProcessExportProvider
 * -----------------------------------------------------------------------------------------------*/
type ExportingState = 'copying' | 'exporting' | false;
type ExportProcessesFunction = (
  type: ProcessExportTypes,
  method: ProcessExportOptions['exportMethod'],
) => Promise<void>;
export function useExportProcess(
  processes: ExportProcessInfo,
  optionsState: ExportOptionState,
  selectedVersions: ExportVersionSelectionState,
) {
  const [isExporting, setIsExporting] = useState<ExportingState>(false);
  const modeler = useModelerStateStore((state) => state.modeler);
  const spaceId = useEnvironment().spaceId;
  const app = App.useApp();

  const exportProcesses: ExportProcessesFunction = async (
    type: ProcessExportTypes,
    method: ProcessExportOptions['exportMethod'],
  ) => {
    setIsExporting(method === 'download' ? 'exporting' : 'copying');

    if (isExporting) return;

    await wrapServerCall({
      fn: async () => {
        if (processes.length === 0)
          throw { message: 'No processes selected', type: UserErrorType.UnknownError } as UserError;

        const selectedOptions = optionsState[type].selectedOptions;

        if (processes.length === 1) {
          const process = processes[0];

          //handle selected elements
          if (modeler) {
            process.selectedElements = modeler
              .getSelection()
              .get()
              .map(({ id }) => id);

            // provide additional information for the export so only the parts of the process that can be reached from the currently open layer are exported
            const currentRootElement = modeler.getCanvas().getRootElement();
            process.rootSubprocessLayerId = bpmnIs(currentRootElement, 'bpmn:SubProcess')
              ? currentRootElement.businessObject?.id
              : undefined;
          }

          // handle selected version id
          if (selectedVersions[type][0])
            process.processVersion = selectedVersions[type][0] ?? undefined;
        }

        if (type === 'pdf') {
          const { definitionId, processVersion } = processes[0];

          // the timestamp does not matter here since it is overridden by the user being an owner of the process
          return generateSharedViewerUrl(
            { processId: definitionId, timestamp: 0 },
            processVersion,
            selectedOptions as string[],
          );
        } else {
          const error = await exportProcessesAsFile(
            {
              type: type,
              artefacts: selectedOptions.includes('artefacts'),
              subprocesses: selectedOptions.includes('subprocesses'),
              imports: selectedOptions.includes('imports'),
              scaling: optionsState.pngScalingFactor,
              exportSelectionOnly: selectedOptions.includes('onlySelection'),
              exportMethod: method,
            },
            processes,
            spaceId,
          );

          if (error) throw { message: error, type: UserErrorType.UnknownError } as UserError;
        }
      },
      onSuccess: (url) => {
        if (type === 'pdf') {
          const { definitionId, processVersion } = processes[0];
          window.open(url, `${definitionId}-${processVersion}-tab`);
        } else {
          if (method === 'clipboard') app.message.success('Copied to clipboard');
        }
      },
      app,
    });

    setIsExporting(false);
  };
  return [isExporting, exportProcesses] as const;
}

/* -------------------------------------------------------------------------------------------------
 * SubmitButton
 * -----------------------------------------------------------------------------------------------*/
export function ProcessExportSubmitButton({
  type,
  state,
  exportProcesses,
  moreThanOne,
  isExporting,
}: {
  type: ProcessExportTypes;
  state: ExportOptionState;
  exportProcesses: ExportProcessesFunction;
  moreThanOne: boolean;
  isExporting: ExportingState;
}) {
  return (
    <>
      {!['pdf', 'svg'].includes(type) && !moreThanOne && (
        <Button
          loading={isExporting === 'copying'}
          disabled={state[type].selectedOptions.length > 0 || !!isExporting}
          type="primary"
          onClick={() => exportProcesses(type, 'clipboard')}
        >
          Copy To Clipboard
        </Button>
      )}
      <Button
        loading={isExporting === 'exporting'}
        disabled={!!isExporting || (type === 'pdf' && moreThanOne)}
        type="primary"
        onClick={() => exportProcesses(type, 'download')}
      >
        Download
      </Button>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ProcessExportOption
 * -----------------------------------------------------------------------------------------------*/
type ProcessExportModalProps = {
  processes: {
    id: string;
    environmentId: string;
    versions: ProcessMetadata['versions'];
  }[]; // the processes to export
  type: ProcessExportTypes;
  active: boolean;
  exportOptionsState: [ExportOptionState, React.Dispatch<React.SetStateAction<ExportOptionState>>];
  versionIdState: ExportVersionSelectionState;
};

export const ProcessExportOption: React.FC<ProcessExportModalProps> = ({
  processes,
  type,
  active,
  exportOptionsState: [state, setState],
  versionIdState,
}) => {
  const [selectedVersionId, setSelectedVersionId] = versionIdState[type];
  const selectedOptions = state[type].selectedOptions;
  const modeler = useModelerStateStore((state) => state.modeler);
  const hasSelection = modeler ? modeler.getSelection().get().length > 0 : false;

  const onlyOneProcess = processes.length === 1;

  // level = 2, to skip the block imposed in the share modal
  useAddControlCallback(
    ['process-list', 'modeler'],
    'control+enter',
    () => {
      // exportProcesses();
    },
    { level: 2, blocking: active, dependencies: [type] },
  );

  const disabledPdfExport = type === 'pdf' && processes.length > 1;

  if (type === 'pdf' && processes.length > 1) {
    return (
      <Alert type="info" message="PDF export is only available when a single process is selected" />
    );
  }

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

      <Space direction="vertical">
        <Checkbox.Group
          onChange={(checkedValues) =>
            setState((prev) => {
              return {
                ...prev,
                [type]: {
                  selectedOptions: checkedValues,
                },
              };
            })
          }
          value={selectedOptions}
          style={{ width: '100%' }}
        >
          <Space direction="vertical">
            {getSubOptions(hasSelection)[type].map(({ label, value, tooltip }) => (
              <Checkbox value={value} key={label} disabled={disabledPdfExport}>
                <Tooltip placement="right" title={tooltip}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {label} <FaRegQuestionCircle style={{ verticalAlign: 'center' }} />
                  </div>
                </Tooltip>
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>

        {type === 'png' && (
          <div style={{ marginTop: '10px' }}>
            <Tooltip placement="left" title="Export with different image resolutions">
              <span>Quality: </span>
            </Tooltip>

            <Radio.Group
              onChange={(e) => setState((prev) => ({ ...prev, pngScalingFactor: e.target.value }))}
              value={state.pngScalingFactor}
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
    </Space>
  );
};
