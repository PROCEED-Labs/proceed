import { App, Button, Select, SelectProps, Tooltip } from 'antd';
import { PlusOutlined, ExperimentOutlined, CaretRightOutlined } from '@ant-design/icons';

import { useEnvironment } from '@/components/auth-can';
import { Process } from '@/lib/data/process-schema';
import { Engine } from '@/lib/engines/machines';
import { spaceURL } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProcessView } from './process-view-context';
import useMobileModeler from '@/lib/useMobileModeler';
import VersionCreationButton from '@/components/version-creation-button';
import EngineSelection from '@/components/engine-selection';
import { use, useState } from 'react';
import { isUserErrorResponse } from '@/lib/user-error';

import {
  createVersion,
  updateProcess,
  getProcessBPMN,
  getProcessHtmlFormHTML,
} from '@/lib/data/processes';
import useModelerStateStore from './use-modeler-state-store';
import { startInstanceOnMachine } from '@/lib/engines/instances';
import { deployProcess } from '@/lib/engines/server-actions';
import { EnvVarsContext } from '@/components/env-vars-context';
import StartFormModal from '@/app/(dashboard)/[environmentId]/(automation)/executions/[processId]/start-form-modal';
import { getStartFormFileNameMapping } from '@proceed/bpmn-helper';
import useProcessVariables from './use-process-variables';
import { wrapServerCall } from '@/lib/wrap-server-call';

export const LATEST_VERSION = { id: '-1', name: 'Latest Version', description: '' };

type VersionAndDeployProps = {
  process: Process;
};

export function useVersionAndDeploy(
  processId: string | undefined,
  isExecutable: boolean,
  getBpmn: (versionId?: string) => Promise<string | undefined>,
  beforeCreateVersion?: () => Promise<void>,
  afterCreateVersion?: () => Promise<void>,
) {
  const router = useRouter();
  const environment = useEnvironment();

  const env = use(EnvVarsContext);

  const { message } = App.useApp();

  const [versionToDeploy, setVersionToDeploy] = useState('');
  const [autoStartInstance, setAutoStartInstance] = useState(false);

  const [startForm, setStartForm] = useState('');

  const [deployTo, setDeployTo] = useState<Engine | undefined>();

  const cancelStartForm = () => {
    setStartForm('');
    setDeployTo(undefined);
  };

  const cancelDeploy = () => {
    setAutoStartInstance(false);
    setVersionToDeploy('');
  };

  if (!processId) {
    return {
      createProcessVersion: async () => {},
      deployVersion: async () => {},
      startInstance: async () => {},
      startForm,
      cancelStartForm,
      versionToDeploy,
      setVersionToDeploy,
      cancelDeploy,
      autoStartInstance: () => setAutoStartInstance(true),
    };
  }

  const createProcessVersion = async (
    values?: {
      versionName: string;
      versionDescription: string;
    },
    deploy?: boolean | string,
  ) => {
    try {
      let toDeploy = deploy;

      if (values) {
        if (beforeCreateVersion) await beforeCreateVersion();

        const newVersion = await createVersion(
          values.versionName,
          values.versionDescription,
          processId,
          environment.spaceId,
        );

        if (isUserErrorResponse(newVersion)) throw new Error();

        toDeploy = newVersion || false;

        if (afterCreateVersion) await afterCreateVersion();

        router.refresh();
        message.success('Version Created');
      }

      if (typeof toDeploy === 'string') {
        setVersionToDeploy(toDeploy);
      }
    } catch (_) {
      message.error('Something went wrong');
    }
  };

  const startInstance = async (variables?: Record<string, { value: any }>) => {
    if (!env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return;

    if (!isExecutable) {
      message.error(
        'Starting an instance is not possible while the process is not set to executable.',
      );
      return;
    }

    if (deployTo) {
      const instanceId = await startInstanceOnMachine(
        processId,
        versionToDeploy === 'latest' ? '_latest' : versionToDeploy,
        deployTo,
        variables,
      );
      router.push(spaceURL(environment, `/executions/${processId}?instance=${instanceId}`));
    }
    setStartForm('');
    setVersionToDeploy('');
    setAutoStartInstance(false);
    setDeployTo(undefined);
  };

  const deployVersion = async (engine: Engine) => {
    if (!env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return;

    if (!isExecutable) {
      message.error('Deploying the version is not possible since it is not set to executable.');
      return;
    }

    await wrapServerCall({
      fn: async () =>
        await deployProcess(
          processId,
          versionToDeploy === 'latest' ? '' : versionToDeploy,
          environment.spaceId,
          'dynamic',
          engine,
        ),
      onSuccess: async () => {
        message.success('Process Deployed');
        let path = `/executions/${processId}`;
        if (autoStartInstance) {
          setAutoStartInstance(false);
          const bpmn = await getBpmn(versionToDeploy === 'latest' ? undefined : versionToDeploy);

          if (bpmn) {
            const [startFormId] = Object.values(await getStartFormFileNameMapping(bpmn));

            if (startFormId) {
              let startForm = await getProcessHtmlFormHTML(
                processId,
                startFormId,
                environment.spaceId,
              );

              if (typeof startForm !== 'string') {
                message.error('Failed to fetch the start form of the process');
                return;
              }

              setStartForm(startForm);
              setDeployTo(engine);
              return;
            }
          }
          const instanceId = await startInstanceOnMachine(
            processId,
            versionToDeploy === 'latest' ? '_latest' : versionToDeploy,
            engine,
          );
          path += `?instance=${instanceId}`;
        }
        router.push(spaceURL(environment, path));
      },
      onError: () => {
        message.error('Failed to deploy the process');
        setVersionToDeploy('');
      },
    });
  };

  return {
    createProcessVersion,
    deployVersion,
    startInstance,
    startForm,
    cancelStartForm,
    versionToDeploy,
    setVersionToDeploy,
    cancelDeploy,
    autoStartInstance: () => setAutoStartInstance(true),
  };
}

const VersionAndDeploy: React.FC<VersionAndDeployProps> = ({ process }) => {
  const processId = process.id;
  const router = useRouter();
  const query = useSearchParams();
  const environment = useEnvironment();

  const { isListView, processContextPath } = useProcessView();
  const showMobileView = useMobileModeler();

  const env = use(EnvVarsContext);

  const modeler = useModelerStateStore((state) => state.modeler);
  const isExecutable = useModelerStateStore((state) => state.isExecutable);

  const { variables } = useProcessVariables();

  const selectedVersionId = query.get('version');

  const selectedVersion =
    process.versions.find((version) => version.id === (selectedVersionId ?? '-1')) ??
    LATEST_VERSION;

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const {
    createProcessVersion,
    deployVersion,
    startInstance,
    startForm,
    cancelStartForm,
    versionToDeploy,
    setVersionToDeploy,
    cancelDeploy,
    autoStartInstance,
  } = useVersionAndDeploy(
    process.id,
    isExecutable,
    async () => await modeler?.getXML(),
    async () => {
      // Ensure latest BPMN on server.
      const xml = (await modeler?.getXML()) as string;
      if (isUserErrorResponse(await updateProcess(processId, environment.spaceId, xml)))
        throw new Error();
    },
    async () => {
      // reimport the new version since the backend has added versionBasedOn information that would
      // be overwritten by following changes
      const newBpmn = await getProcessBPMN(processId, environment.spaceId);
      if (newBpmn && typeof newBpmn === 'string') {
        await modeler?.loadBPMN(newBpmn);
      }
    },
  );

  return (
    <>
      <Select
        popupMatchSelectWidth={false}
        placeholder="Select Version"
        showSearch
        filterOption={filterOption}
        value={selectedVersion.id}
        onChange={(value) => {
          // change the version info in the query but keep other info (e.g. the currently open subprocess)
          const searchParams = new URLSearchParams(query);
          if (!value || value === '-1') searchParams.delete('version');
          else searchParams.set(`version`, `${value}`);
          router.push(
            spaceURL(
              environment,
              `/processes${processContextPath}/${processId as string}${
                searchParams.size ? '?' + searchParams.toString() : ''
              }`,
            ),
          );
        }}
        options={(isListView ? [] : [LATEST_VERSION])
          .concat(process.versions ?? [])
          .map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
      />
      {!showMobileView && LATEST_VERSION.id === selectedVersion.id && (
        <Tooltip title="Release a new Version of the Process">
          <VersionCreationButton
            processId={processId}
            icon={<PlusOutlined />}
            createVersion={createProcessVersion}
            disabled={isListView}
            isExecutable={isExecutable}
          />
        </Tooltip>
      )}
      {!showMobileView && env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && isExecutable && (
        <>
          {LATEST_VERSION.id === selectedVersion.id ? (
            <Tooltip title="Test Deploy and Start">
              <Button
                icon={<ExperimentOutlined />}
                onClick={() => {
                  autoStartInstance();
                  setVersionToDeploy('latest');
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Deploy and Start">
              <Button
                icon={<CaretRightOutlined />}
                onClick={() => {
                  autoStartInstance();
                  setVersionToDeploy(selectedVersion.id);
                }}
              />
            </Tooltip>
          )}
          <EngineSelection
            open={!!versionToDeploy}
            onClose={cancelDeploy}
            onSubmit={deployVersion}
          />
          <StartFormModal
            html={startForm}
            variableDefinitions={variables}
            onSubmit={(variables) => startInstance(variables)}
            onCancel={() => cancelStartForm()}
          />
        </>
      )}
    </>
  );
};

export default VersionAndDeploy;
