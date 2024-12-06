'use client';

import {
  Space,
  Button,
  Modal,
  Switch,
  Dropdown,
  MenuProps,
  Descriptions,
  Skeleton,
  Result,
} from 'antd';
import { UnorderedListOutlined, AppstoreOutlined, DownOutlined } from '@ant-design/icons';
import Bar from '@/components/bar';
import { useUserPreferences } from '@/lib/user-preferences';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { ProcessMetadata } from '@/lib/data/process-schema';
import { Folder } from '@/lib/data/folder-schema';
import { useInitialiseFavourites } from '@/lib/useFavouriteProcesses';
import ProcessIconView from './deployment-selection-icon-view';
import { useState } from 'react';
import { useEnvironment } from '@/components/auth-can';
import { getFolder, getFolderContents } from '@/lib/data/folders';
import { ProcessDeploymentList } from '@/components/process-list';
import { useQuery } from '@tanstack/react-query';
import { isUserErrorResponse } from '@/lib/user-error';
import { getAvailableSpaceEngines } from '@/lib/engines/server-actions';
import { SpaceEngine } from '@/lib/engines/machines';
import { MdOutlineComputer } from 'react-icons/md';
import { LeftOutlined } from '@ant-design/icons';

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

const DeploymentButtons = ({
  isAdvancedView,
  process,
  onDeploy,
}: {
  isAdvancedView: boolean;
  process: ProcessListProcess;
  onDeploy: (process: ProcessListProcess, method?: 'static' | 'dynamic') => void;
}) => {
  return isAdvancedView ? (
    <Space style={{ float: 'right' }}>
      <Button
        type="primary"
        size="small"
        onClick={() => {
          onDeploy(process, 'static');
        }}
      >
        Static
      </Button>
      <Button
        type="primary"
        size="small"
        onClick={() => {
          onDeploy(process, 'dynamic');
        }}
      >
        Dynamic
      </Button>
    </Space>
  ) : (
    <Button
      style={{ float: 'right' }}
      type="primary"
      size="small"
      onClick={() => {
        onDeploy(process);
      }}
    >
      Deploy Process
    </Button>
  );
};

const EngineSelection = ({ onEngine }: { onEngine: (args?: SpaceEngine) => void }) => {
  const space = useEnvironment();
  const { isLoading, error, data } = useQuery({
    queryFn: async () => {
      const response = await getAvailableSpaceEngines(space.spaceId);
      if (isUserErrorResponse(response)) throw response.error;
      return response;
    },
    queryKey: [space.spaceId, 'spaceEngines'],
  });

  if (error) return <Result status="error" subTitle="Failed to fetch engines" />;
  if (isLoading || !data) return <Skeleton active />;

  const engines = data.map((engine, idx) => (
    <Button
      key={idx}
      style={{ padding: '.5rem 1rem', height: 'fit-content', width: '100%' }}
      onClick={() => onEngine(engine)}
    >
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <MdOutlineComputer />
          {engine.type === 'http' ? engine.address : engine.id}
        </div>

        <Descriptions
          items={[
            {
              label: 'type',
              children: engine.type.toUpperCase(),
              key: '0',
              style: { padding: 0 },
            },
          ]}
        />
      </>
    </Button>
  ));
  engines.push(
    <Button
      key={engines.length}
      style={{ padding: '.5rem 1rem', height: 'fit-content', width: '100%' }}
      onClick={() => onEngine()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <MdOutlineComputer />
        Random PROCEED Engine
      </div>
    </Button>,
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '90vw',
        maxWidth: '70ch',
      }}
    >
      {engines}
    </div>
  );
};

const DeploymentsModal = ({
  open,
  close,
  processes: initialProcesses,
  favourites,
  folder: initialFolder,
  selectProcess: _selectProcess,
}: {
  open: boolean;
  close: () => void;
  processes: InputItem[];
  favourites?: string[];
  folder: Folder;
  selectProcess: (process: ProcessListProcess, engine?: SpaceEngine) => void;
}) => {
  const environment = useEnvironment();

  const [isAdvancedView, setIsAdvancedView] = useState(false);
  const [selectedProcessForStaticDeployment, setSelectedProcessForStaticDeployment] = useState<
    ProcessListProcess | undefined
  >();

  function selectProcess(process: ProcessListProcess, engine?: SpaceEngine) {
    _selectProcess(process, engine);
    close();
  }

  if (initialFolder.parentId)
    initialProcesses = [
      {
        name: '< Parent Folder >',
        parentId: null,
        type: 'folder',
        id: initialFolder.parentId,
        createdOn: null,
        createdBy: '',
        lastEditedOn: null,
        environmentId: '',
      },
      ...initialProcesses,
    ];

  const [processes, setProcesses] = useState(initialProcesses);
  const [folder, setFolder] = useState(initialFolder);

  const favs = favourites ?? [];
  useInitialiseFavourites(favs);

  const addPreferences = useUserPreferences.use.addPreferences();
  // NOTE: should this be the same as in the process list
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: processes ?? [],
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) =>
      matches
        .map((match) => match.item)
        .sort((a, b) => {
          if (a.type === 'folder' && b.type == 'folder') return 0;
          if (a.type === 'folder') return -1;
          if (b.type === 'folder') return 1;

          return 0;
        }),
  });

  const openFolder = async (id: string) => {
    const folder = await getFolder(id);
    if ('error' in folder) {
      throw new Error('Failed to fetch folder');
    }

    const folderContents = await getFolderContents(environment.spaceId, folder.id);
    if ('error' in folderContents) {
      throw new Error('Failed to fetch folder children');
    }

    if (folder.parentId) {
      setProcesses([
        {
          name: '< Parent Folder >',
          parentId: null,
          type: 'folder',
          id: folder.parentId,
          createdOn: new Date(),
          createdBy: '',
          lastEditedOn: new Date(),
          environmentId: '',
        },
        ...folderContents,
      ]);
    } else {
      setProcesses(folderContents);
    }
    setFolder(folder);
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 1,
      onClick: () => setIsAdvancedView((prev) => !prev),
      label: (
        <Space>
          <span>Advanced Deployment</span>
          <Switch
            size="small"
            value={isAdvancedView}
            onChange={(checked, event) => {
              event.stopPropagation();
              setIsAdvancedView(checked);
            }}
          ></Switch>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={close}
      afterClose={() => setSelectedProcessForStaticDeployment(undefined)}
      title={
        selectedProcessForStaticDeployment ? (
          `Select an engine to deploy ${selectedProcessForStaticDeployment.name.value}`
        ) : (
          <Space size="large">
            <span>Deployment Selection</span>
            <Dropdown menu={{ items: dropdownItems }}>
              <Button size="small" type="link" style={{ padding: 0 }}>
                <Space>
                  Options
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        )
      }
      closeIcon={null}
      width="max-content"
      // NOTE: these widths should probably standardised for the whole app
      style={{ maxWidth: '80vw', minWidth: 'min(70ch, 100%)', padding: '1px' }}
      footer={[
        selectedProcessForStaticDeployment ? (
          <Button key="back" onClick={() => setSelectedProcessForStaticDeployment(undefined)}>
            <LeftOutlined />
            Return
          </Button>
        ) : null,
        <Button key="submit" onClick={close}>
          Cancel
        </Button>,
      ]}
    >
      {!selectedProcessForStaticDeployment && (
        <>
          {/* 73% for list / icon view, 27% for meta data panel (if active) */}
          <Bar
            leftNode={
              <span style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
                <span>
                  <Space.Compact>
                    <Button
                      style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                      onClick={() => addPreferences({ 'icon-view-in-process-list': false })}
                    >
                      <UnorderedListOutlined />
                    </Button>
                    <Button
                      style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                      onClick={() => addPreferences({ 'icon-view-in-process-list': true })}
                    >
                      <AppstoreOutlined />
                    </Button>
                  </Space.Compact>
                </span>
              </span>
            }
            searchProps={{
              onChange: (e) => setSearchTerm(e.target.value),
              onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
              placeholder: 'Search Processes ...',
            }}
          />

          {iconView ? (
            <ProcessIconView
              data={filteredData}
              openFolder={(id) => {
                openFolder(id);
              }}
              selectProcess={(id) => {
                selectProcess(id);
              }}
              containerProps={{ style: { width: '90vw', maxWidth: '100ch' } }}
            />
          ) : (
            <div style={{ width: 'min-content' }}>
              <ProcessDeploymentList
                data={filteredData}
                folder={folder}
                openFolder={(id) => {
                  openFolder(id);
                }}
                deploymentButtons={({ process }) => (
                  <DeploymentButtons
                    isAdvancedView={isAdvancedView}
                    onDeploy={(process, method) => {
                      if (method !== 'static') return selectProcess(process);
                      setSelectedProcessForStaticDeployment(process);
                    }}
                    process={process}
                  />
                )}
              />
            </div>
          )}
        </>
      )}

      {!!selectedProcessForStaticDeployment && (
        <EngineSelection
          onEngine={(engine) => selectProcess(selectedProcessForStaticDeployment, engine)}
        />
      )}
    </Modal>
  );
};

export default DeploymentsModal;
