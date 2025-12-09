import { App, Button, Select, SelectProps, Tooltip } from 'antd';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';

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

const VersionAndDeploy: React.FC<VersionAndDeployProps> = ({ process }) => {
  const processId = process.id;
  const router = useRouter();
  const query = useSearchParams();
  const environment = useEnvironment();

  const app = App.useApp();
  const message = app.message;

  const { isListView, processContextPath } = useProcessView();
  const showMobileView = useMobileModeler();

  const [versionToDeploy, setVersionToDeploy] = useState('');
  const [startForm, setStartForm] = useState('');

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
        // Ensure latest BPMN on server.
        const xml = (await modeler?.getXML()) as string;
        if (isUserErrorResponse(await updateProcess(processId, environment.spaceId, xml)))
          throw new Error();

        const newVersion = await createVersion(
          values.versionName,
          values.versionDescription,
          processId,
          environment.spaceId,
        );

        if (isUserErrorResponse(newVersion)) throw new Error();

        toDeploy = newVersion || false;

        // reimport the new version since the backend has added versionBasedOn information that would
        // be overwritten by following changes
        const newBpmn = await getProcessBPMN(processId, environment.spaceId);
        if (newBpmn && typeof newBpmn === 'string') {
          await modeler?.loadBPMN(newBpmn);
        }

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

  const [deployTo, setDeployTo] = useState<Engine | undefined>();

  const startInstance = async (variables?: Record<string, { value: any }>) => {
    if (deployTo) {
      const instanceId = await startInstanceOnMachine(process.id, '_latest', deployTo, variables);
      router.push(spaceURL(environment, `/executions/${process.id}?instance=${instanceId}`));
    }
    setStartForm('');
    setDeployTo(undefined);
  };

  const cancelStartForm = async () => {
    setStartForm('');
    setDeployTo(undefined);
  };

  const deployVersion = async (engine: Engine) => {
    await wrapServerCall({
      fn: async () =>
        await deployProcess(
          process.id,
          versionToDeploy === 'latest' ? '' : versionToDeploy,
          environment.spaceId,
          'dynamic',
          engine,
        ),
      onSuccess: async () => {
        message.success('Process Deployed');
        let path = `/executions/${process.id}`;
        if (versionToDeploy === 'latest') {
          const bpmn = await modeler?.getXML();

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

          const instanceId = await startInstanceOnMachine(process.id, '_latest', engine);
          path += `?instance=${instanceId}`;
        }
        router.push(spaceURL(environment, path));
      },
      onError: 'Failed to deploy the process',
    });
    setVersionToDeploy('');
  };

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
        <>
          <Tooltip title="Create New Version">
            <VersionCreationButton
              processId={processId}
              icon={<PlusOutlined />}
              createVersion={createProcessVersion}
              disabled={isListView}
              isExecutable={isExecutable}
            />
          </Tooltip>
          {env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && (
            <>
              <Tooltip title="Test Deploy and Start">
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => setVersionToDeploy('latest')}
                />
              </Tooltip>
              <EngineSelection
                open={!!versionToDeploy}
                onClose={() => setVersionToDeploy('')}
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
      )}{' '}
    </>
  );
};

export default VersionAndDeploy;
