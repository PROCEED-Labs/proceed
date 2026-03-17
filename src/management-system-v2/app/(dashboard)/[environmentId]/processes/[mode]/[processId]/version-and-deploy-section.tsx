import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Modal,
  Select,
  SelectProps,
  Skeleton,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import { IoPlayOutline } from 'react-icons/io5';

import { useEnvironment } from '@/components/auth-can';
import { Process } from '@/lib/data/process-schema';
import { spaceURL } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProcessView } from './process-view-context';
import useMobileModeler from '@/lib/useMobileModeler';
import VersionCreationButton from '@/components/version-creation-button';
import { use, useMemo, useState } from 'react';
import { isUserErrorResponse } from '@/lib/user-error';

import {
  createVersion,
  updateProcess,
  getProcessBPMN,
  getProcessHtmlFormHTML,
  getProcess,
} from '@/lib/data/processes';
import useModelerStateStore from './use-modeler-state-store';
import { startInstanceOnMachine } from '@/lib/engines/instances';
import { deployProcess } from '@/lib/engines/server-actions';
import { EnvVarsContext } from '@/components/env-vars-context';
import StartFormModal, { StartForm } from '@/components/start-form-modal';
import {
  getElementsByTagName,
  getStartFormFileNameMapping,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import useProcessVariables from './use-process-variables';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useQuery } from '@tanstack/react-query';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import BPMNCanvas from '@/components/bpmn-canvas';
import useEngines from '@/lib/engines/use-engines';

export const LATEST_VERSION = { id: '-1', name: 'Latest Version', description: '' };

type VersionAndDeployProps = {
  process: Process;
};

export function useVersionAndDeploy(
  processId: string | undefined,
  isExecutable: boolean,
  afterCreateVersion?: () => Promise<void>,
) {
  const router = useRouter();
  const environment = useEnvironment();

  const { message } = App.useApp();

  const env = use(EnvVarsContext);
  const { data: engines } = useEngines(environment);
  const engine = engines?.[0];

  const canDeploy =
    !!processId && !!env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && !!isExecutable && !!engine;

  const handleVersionCreation = async (
    processId: string,
    values?: {
      versionName: string;
      versionDescription: string;
    },
    deploy?: boolean | string,
  ) => {
    if (values) {
      const newVersion = await createVersion(
        values.versionName,
        values.versionDescription,
        processId,
        environment.spaceId,
      );

      await afterCreateVersion?.();

      if (isUserErrorResponse(newVersion)) throw new Error();

      if (deploy && newVersion) deploy = newVersion;
    }

    if (typeof deploy === 'string' && canDeploy) handleDeploy(processId, deploy);
  };

  if (!canDeploy) {
    return {
      canDeploy,
      handleVersionCreation,
      handleDeploy: async () => { },
      handleStartInstance: async () => { },
    };
  }

  const handleDeploy = async (processId: string, deploy: string, noReroute = false) => {
    await wrapServerCall({
      fn: async () =>
        await deployProcess(processId, deploy, environment.spaceId, 'dynamic', engine),
      onSuccess: async () => {
        message.success('Process Deployed');
        if (!noReroute) {
          let path = `/executions/${processId}`;
          router.push(spaceURL(environment, path));
        }
      },
      onError: 'Failed to deploy the process',
    });
  };

  const handleStartInstance = async (
    version: string,
    variables?: Record<string, { value: any }>,
  ) => {
    await handleDeploy(processId, version === 'latest' ? '' : version, true);

    const instanceId = await startInstanceOnMachine(
      processId,
      version === 'latest' ? '_latest' : version,
      engine,
      variables,
    );

    router.push(spaceURL(environment, `/executions/${processId}?instance=${instanceId}`));
  };

  return {
    handleVersionCreation,
    handleDeploy,
    handleStartInstance,
    canDeploy: !!engine,
  };
}

const VersionAndDeploy: React.FC<VersionAndDeployProps> = ({ process }) => {
  const processId = process.id;
  const router = useRouter();
  const query = useSearchParams();
  const environment = useEnvironment();

  const { isListView, processContextPath } = useProcessView();
  const showMobileView = useMobileModeler();

  const modeler = useModelerStateStore((state) => state.modeler);
  const isExecutable = useModelerStateStore((state) => state.isExecutable);

  const { variables } = useProcessVariables();

  const selectedVersionId = query.get('version');

  const selectedVersion =
    process.versions.find((version) => version.id === (selectedVersionId ?? '-1')) ??
    LATEST_VERSION;

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const beforeVersioning = async () => {
    // Ensure latest BPMN on server.
    const xml = (await modeler?.getXML()) as string;
    if (isUserErrorResponse(await updateProcess(processId, environment.spaceId, xml)))
      throw new Error();
  };

  const { handleVersionCreation, handleStartInstance, canDeploy } = useVersionAndDeploy(
    process.id,
    isExecutable,
    async () => {
      // reimport the new version since the backend has added versionBasedOn information that would
      // be overwritten by following changes
      const newBpmn = await getProcessBPMN(processId, environment.spaceId);
      if (newBpmn && typeof newBpmn === 'string') {
        await modeler?.loadBPMN(newBpmn);
      }
    },
  );

  const { message } = App.useApp();
  const [startForm, setStartForm] = useState('');

  const tryStartInstance = async (version: string) => {
    if (!canDeploy) return;

    const rootElement = modeler?.getCurrentRoot();

    if (!rootElement) return;

    const [startFormId] = Object.values(
      await getStartFormFileNameMapping(rootElement?.businessObject),
    );

    if (startFormId) {
      let startForm = await getProcessHtmlFormHTML(processId, startFormId, environment.spaceId);

      if (typeof startForm !== 'string') {
        message.error('Failed to fetch the start form of the process');
        return;
      }

      setStartForm(startForm);
      return;
    }

    await handleStartInstance(version);
  };

  return (
    <>
      <Select
        popupMatchSelectWidth={false}
        placeholder="Select Version"
        showSearch={{ filterOption }}
        variant="borderless"
        value={selectedVersion.id}
        onChange={(value) => {
          // change the version info in the query but keep other info (e.g. the currently open subprocess)
          const searchParams = new URLSearchParams(query);
          if (!value || value === '-1') searchParams.delete('version');
          else searchParams.set(`version`, `${value}`);
          router.push(
            spaceURL(
              environment,
              `/processes${processContextPath}/${processId as string}${searchParams.size ? '?' + searchParams.toString() : ''
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
            createVersion={async (values, deploy) => {
              await beforeVersioning();
              await handleVersionCreation(processId, values, deploy);
            }}
            disabled={isListView}
            isDeployable={canDeploy}
          />
        </Tooltip>
      )}
      {!showMobileView && canDeploy && isExecutable && (
        <>
          {LATEST_VERSION.id === selectedVersion.id ? (
            <Tooltip title="Test Deploy and Start">
              <Button
                icon={<ExperimentOutlined />}
                onClick={() => {
                  tryStartInstance(selectedVersionId || 'latest');
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Deploy and Start">
              <Button
                icon={<IoPlayOutline />}
                onClick={() => {
                  tryStartInstance(selectedVersionId || 'latest');
                }}
              />
            </Tooltip>
          )}
          <StartFormModal
            html={startForm}
            variableDefinitions={variables}
            onSubmit={async (variables) => {
              await handleStartInstance(selectedVersionId || 'latest', variables);
              setStartForm('');
            }}
            onCancel={() => setStartForm('')}
          />
        </>
      )}
    </>
  );
};

export const VersionStartModal: React.FC<{
  show: boolean;
  onOk: (version: string, variables?: Record<string, { value: any }>) => void;
  onClose: () => void;
  processId: string | undefined;
}> = ({ show, onOk, onClose, processId }) => {
  const environment = useEnvironment();

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const getStartForm = async (processId: string, bpmn: string) => {
        const [startFormId] = Object.values(await getStartFormFileNameMapping(bpmn));

        let startForm: string | undefined = undefined;
        if (startFormId) {
          let startFormHtml = await getProcessHtmlFormHTML(
            processId,
            startFormId,
            environment.spaceId,
          );

          if (!isUserErrorResponse(startFormHtml) && typeof startFormHtml === 'string') {
            startForm = startFormHtml;
          }
        }

        return startForm;
      };

      if (processId) {
        const metadata = await getProcess(processId, environment.spaceId);
        if (isUserErrorResponse(metadata)) throw metadata.error;

        const bpmn = await getProcessBPMN(processId, environment.spaceId);
        if (isUserErrorResponse(bpmn)) throw bpmn.error;

        const latestVersion = {
          label: 'Latest',
          value: 'latest',
          versionId: 'latest',
          versionName: 'Latest',
          versionDescription: 'Current editing state of the process.',
          bpmn,
          executable: metadata.executable,
          startForm: await getStartForm(processId, bpmn),
        };
        const versions = await asyncMap(metadata.versions, async (version) => {
          const bpmn = await getProcessBPMN(processId, environment.spaceId, version.id);
          if (isUserErrorResponse(bpmn)) throw bpmn.error;

          const bpmnObj = await toBpmnObject(bpmn);
          const processEls = getElementsByTagName(bpmnObj, 'bpmn:Process');

          let executable = false;

          if (processEls.length === 1) {
            executable = processEls[0].isExecutable || false;
          }

          const startForm = await getStartForm(processId, bpmn);

          return {
            label: version.name,
            value: version.id,
            versionId: version.id,
            versionName: version.name,
            versionDescription: version.description,
            bpmn,
            executable,
            startForm,
          };
        });

        return [latestVersion, ...versions];
      }

      return [];
    },
    queryKey: ['process_executable_versions', environment.spaceId, processId],
    enabled: show && !!processId,
  });

  const [selectedVersionId, setSelectedVersionId] = useState('latest');

  const selectedVersion = useMemo(() => {
    if (data && selectedVersionId) {
      const version = data.find((v) => v.versionId === selectedVersionId);
      return version;
    }
  }, [data, selectedVersionId]);

  return (
    <Modal
      open={show}
      onCancel={() => {
        setSelectedVersionId('latest');
        onClose();
      }}
      width={selectedVersion?.startForm ? '60vw' : undefined}
      height={selectedVersion?.startForm ? '80vh' : undefined}
      styles={{
        container: { height: '100%', display: 'flex', flexDirection: 'column' },
        body: { flexGrow: 1, display: 'flex', flexDirection: 'column' },
      }}
      title="Please select a version"
      okText="Deploy and Start"
      okButtonProps={{
        disabled: !selectedVersion || !selectedVersion.executable,
        hidden: !!selectedVersion?.startForm,
      }}
      onOk={() => onOk(selectedVersionId)}
    >
      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <Space style={{ width: '100%' }} orientation="vertical">
            <Typography.Text>Version:</Typography.Text>
            <Select
              style={{ width: '100%' }}
              options={data}
              defaultValue={'latest'}
              popupMatchSelectWidth={false}
              value={selectedVersionId}
              onChange={(id) => setSelectedVersionId(id)}
              optionRender={({ data: { versionName, versionDescription } }) => (
                <Tooltip placement="right" title={versionDescription}>
                  {versionName}
                </Tooltip>
              )}
            />
            {selectedVersion && (
              <Space style={{ width: '100%' }} orientation="vertical">
                <Card>{selectedVersion.versionDescription}</Card>
                {!selectedVersion.executable && (
                  <Alert title="This version is not executable." type="warning" />
                )}
                <BPMNCanvas type="viewer" bpmn={{ bpmn: selectedVersion.bpmn }} />
              </Space>
            )}
          </Space>
          {!!selectedVersion?.startForm && (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Divider />
              <StartForm
                html={selectedVersion.startForm}
                onSubmit={async (variables) => {
                  onOk(selectedVersionId, variables);
                }}
              />
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default VersionAndDeploy;
