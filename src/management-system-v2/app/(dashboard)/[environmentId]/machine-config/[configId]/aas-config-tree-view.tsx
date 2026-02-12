'use client';

import { Config, LinkedParameter, Parameter } from '@/lib/data/machine-config-schema';
import { Dropdown, MenuProps, Modal, Tree, Button, TreeDataNode, App } from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useMemo, useState } from 'react';
import { buildLinkedInputParametersFromIds, findParameter } from '../configuration-helper';
import ConfigModal from '@/components/config-modal';
import AasCreateParameterModal, {
  CreateParameterModalReturnType,
} from './aas-create-parameter-modal';
import { addMachineDataSet, removeParameter } from '@/lib/data/db/machine-config';
import { updateParameter } from '@/lib/data/db/machine-config';
import {
  moveParameterUp,
  moveParameterDown,
  editParameter,
  getInitialTransformationData,
  useParameterActions,
  generateMachineDatasetNames,
} from './shared-parameter-utils';
import { StoredParameter } from '@/lib/data/machine-config-schema';
import { Localization } from '@/lib/data/locale';
import { useAbilityStore } from '@/lib/abilityStore';
import PreviewFeatureModal from '../preview-feature-modal';
type ConfigurationTreeViewProps = {
  parentConfig: Config;
  editMode: boolean;
  treeData: TreeDataNode[];
  expandedKeys: string[];
  onExpandedChange: (newExpanded: string[]) => void;
  onChangeSelection: (selection?: string) => void;
  currentLanguage: Localization;
};

type ModalType =
  | ''
  | 'reference-config'
  | 'machine-config'
  | 'target-config'
  | 'parameter'
  | 'metadata'
  | 'delete';

const AasConfigurationTreeView: React.FC<ConfigurationTreeViewProps> = ({
  parentConfig,
  editMode,
  treeData,
  expandedKeys,
  onExpandedChange,
  onChangeSelection,
  currentLanguage,
}) => {
  const app = App.useApp();
  const router = useRouter();
  const ability = useAbilityStore((state) => state.ability);

  const [selectedOnTree, setSelectedOnTree] = useState<Key[]>([]);
  const [openModal, setOpenModal] = useState<ModalType>('');
  const [editFieldOpen, setEditFieldOpen] = useState<boolean>(false);
  const [rightClickedId, setRightClickedId] = useState('');
  const [rightClickedType, setRightClickedType] = useState<'config' | 'parameter'>('config');
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: '',
    description: '',
  });

  const { setCurrentParameter, addParameter: baseAddParameter } = useParameterActions({
    parentConfig,
    onRefresh: () => router.refresh(),
    currentLanguage,
  });

  const rightClickedNode = useMemo(() => {
    if (!rightClickedId || rightClickedType === 'config') return parentConfig;

    let node;
    if (rightClickedType === 'parameter') {
      const ref = findParameter(rightClickedId, parentConfig, 'config');
      if (ref) node = ref.selection as Parameter;
    }

    return node || parentConfig;
  }, [rightClickedId, rightClickedType, parentConfig]);

  const closeModal = () => setOpenModal('');

  const handleCreateMachineOk = async (
    values: {
      name: string;
      shortname: string;
      description: string;
      copyTarget: boolean;
    }[],
  ) => {
    // TODO function: create target/reference/machine config
    // if (openModal !== 'target-config' && openModal !== 'machine-config') return;
    // const { name, shortname, description, copyTarget } = values[0];

    // if (openModal === 'target-config') {
    //   const newConfig = defaultTargetConfiguration(
    //     parentConfig.environmentId,
    //     name,
    //     shortname,
    //     description,
    //   );
    //   await addTargetConfig(parentConfig.id, newConfig);
    // } else if (copyTarget && parentConfig.targetConfig) {
    //   const newConfig = customMachineConfiguration(
    //     parentConfig.environmentId,
    //     name,
    //     shortname,
    //     description,
    //     parentConfig.targetConfig,
    //   );
    //   await addMachineConfig(parentConfig.id, newConfig, true);
    // } else {
    //   const newConfig = defaultMachineConfiguration(
    //     parentConfig.environmentId,
    //     name,
    //     shortname,
    //     description,
    //   );
    //   await addMachineConfig(parentConfig.id, newConfig);
    // }

    closeModal();
    router.refresh();
  };

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    await baseAddParameter(values);
  };

  const handleCreateParameterOk = async (values: CreateParameterModalReturnType[]) => {
    await addParameter(values);
    closeModal();
    setCurrentParameter(undefined);
  };

  // const handleCreateMetadataOk = async (values: CreateParameterModalReturnType[]) => {
  //   await addParameter(values[0], 'metadata');
  //   closeModal();
  // };

  const handleDeleteConfirm = async () => {
    if (rightClickedType === 'parameter') {
      await removeParameter(rightClickedId);
    }
    // TODO: handle config deletion
    // else if (rightClickedType === 'target-config') await removeTargetConfig(rightClickedId);

    router.refresh();
    closeModal();
  };

  const onSelectTreeNode = (selectedKeys: Key[]) => {
    if (selectedKeys.length) {
      const key = selectedKeys[0].toString();
      const [id, type] = key.includes('|') ? key.split('|') : [key, undefined]; ///
      const element = document.getElementById(`scrollref_${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      setRightClickedId(id);
      if (type === 'parameter') {
        setRightClickedType('parameter');
      } else {
        // For condensed tree view or config nodes, determine type by checking if it's a parameter
        const ref = findParameter(id, parentConfig, 'config');
        setRightClickedType(ref ? 'parameter' : 'config');
      }

      onChangeSelection(id);
    } else {
      // this prevent the default ant design tree behavior of deselecting on second click
      if (selectedOnTree.length > 0) {
        return;
      }
      onChangeSelection(undefined);
      setRightClickedId('');
      setRightClickedType('config');
    }

    setSelectedOnTree(selectedKeys);
  };

  const onRightClickTreeNode = (info: { node: EventDataNode<TreeDataNode> }) => {
    const key = info.node.key.toString();
    const [id, type] = key.includes('|') ? key.split('|') : [key, undefined]; ///

    setRightClickedId(id);
    if (type === 'parameter') {
      setRightClickedType('parameter');
    } else {
      // for condensed tree view or config nodes, determine type by checking if it's a parameter
      const ref = findParameter(id, parentConfig, 'config');
      setRightClickedType(ref ? 'parameter' : 'config');
    }
    setSelectedOnTree([info.node.key]);
  };
  const handleEditParameter = async (values: CreateParameterModalReturnType[]) => {
    if (rightClickedType === 'parameter' && rightClickedNode && !('type' in rightClickedNode)) {
      await editParameter(
        currentLanguage,
        rightClickedNode as Parameter,
        values[0],
        parentConfig,
        () => {
          setEditFieldOpen(false);
          router.refresh();
        },
      );
    }
  };
  const contextMenuItems: MenuProps['items'] = useMemo(() => {
    let items: MenuProps['items'] = [];

    if (rightClickedType === 'config' && parentConfig.templateId) {
      items.push(
        {
          label: 'Create a Target Dataset',
          key: 'create-target',
          // onClick: () => setOpenModal('target-config'),
          onClick: () => {
            setPreviewModalConfig({
              open: true,
              title: 'Create a Target Dataset',
              description:
                'This button can create a Target Dataset with default structures and parameters.',
            });
          },
          disabled: !editMode, // TODO
        },
        {
          label: 'Create a Reference Dataset',
          key: 'create-reference',
          onClick: () => {
            setPreviewModalConfig({
              open: true,
              title: 'Create a Reference Dataset',
              description:
                'This button can create a Reference Dataset with default structures based on the body/content parameters of the Target Dataset.',
            });
          },
          disabled: !editMode, // TODO
        },
        {
          label: 'Update Reference Dataset',
          key: 'copy-target',
          onClick: () => {
            setPreviewModalConfig({
              open: true,
              title: 'Update Reference Dataset with new Target Dataset parameters',
              description:
                'This button can copy all new body/content parameters of the Target Dataset to the Reference Dataset.',
            });
          },
          disabled: !editMode, // TODO
        },
        {
          label: 'Create a Machine Dataset',
          key: 'create-machine',
          // onClick: () => setOpenModal('machine-config'),
          onClick: async () => {
            const { name, displayName } = generateMachineDatasetNames(parentConfig);

            try {
              await addMachineDataSet(parentConfig, name, displayName);
              app.message.success(`Machine Dataset "${displayName}" created successfully.`);
              router.refresh();
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Failed to create machine dataset';
              app.message.error(errorMessage);
            }
          },
          disabled: !editMode, // TODO
        },
        {
          label: 'Update Machine Dataset',
          key: 'copy-reference',
          // onClick: () => setOpenModal('machine-config'),
          onClick: () => {
            setPreviewModalConfig({
              open: true,
              title: 'Update a Machine Dataset with new Reference Dataset parameters',
              description:
                'This button can copy all new body parameters of the Reference Dataset to one Machine Dataset.',
            });
          },
          disabled: !editMode, // TODO
        },
      );
    }

    // metadata option for both config and parameter noddes
    // items.push({
    //   label: 'Create Metadata',
    //   key: 'add_metadata',
    //   onClick: () => setOpenModal('metadata'),
    //   disabled: !editMode,
    // });

    if (rightClickedType === 'parameter') {
      const currentParameter = rightClickedNode as Parameter;
      const isChangeable = currentParameter.changeableByUser ?? true;

      // find parent context and determine position
      const ref = findParameter(rightClickedId, parentConfig, 'config');
      const parentArray =
        ref && 'content' in ref.parent
          ? (ref.parent as Config).content
          : ref
            ? (ref.parent as Parameter).subParameters
            : [];

      const currentIndex = parentArray.findIndex(
        (item: { id: string }) => item.id === rightClickedId,
      );
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === parentArray.length - 1;

      items.push(
        {
          label: 'Move Up',
          key: 'move_up',
          onClick: () => moveParameterUp(currentParameter, parentConfig, () => router.refresh()),
          disabled: !editMode || isFirst,
        },
        {
          label: 'Move Down',
          key: 'move_down',
          onClick: () => moveParameterDown(currentParameter, parentConfig, () => router.refresh()),
          disabled: !editMode || isLast,
        },
        {
          label: 'Edit',
          key: 'edit',
          onClick: () => setEditFieldOpen(true),
          disabled: !editMode || !isChangeable,
        },
        {
          label: 'Add Nested Parameter',
          key: 'add_parameter',
          onClick: () => {
            setCurrentParameter(currentParameter as Parameter);
            setOpenModal('parameter');
          },
          disabled: !editMode || !isChangeable,
        },
        {
          label: 'Delete',
          key: 'delete',
          onClick: () => setOpenModal('delete'),
          disabled: !editMode || !isChangeable,
        },
      );
    }

    return items;
  }, [rightClickedType, rightClickedId, editMode, parentConfig, rightClickedNode]);

  const selectionName =
    'shortName' in rightClickedNode
      ? rightClickedNode.name.value
      : rightClickedNode.displayName?.[0]?.text ?? rightClickedNode.name ?? 'N/A';

  return (
    <>
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Tree
          selectedKeys={selectedOnTree}
          onRightClick={onRightClickTreeNode}
          onSelect={onSelectTreeNode}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys: React.Key[]) => onExpandedChange(keys.map((key) => key.toString()))}
        />
      </Dropdown>

      <Modal
        open={openModal === 'delete'}
        title={'Deleting ' + selectionName}
        onOk={handleDeleteConfirm}
        onCancel={closeModal}
      >
        <p>
          Are you sure you want to delete the configuration <b>{selectionName}</b> with ID{' '}
          <em>{rightClickedNode.id}</em> ?
        </p>
      </Modal>

      {/* TODO modal: handle reference configs */}
      <ConfigModal
        open={openModal === 'machine-config' || openModal === 'target-config'}
        title={`Creating ${openModal === 'target-config' ? 'target' : 'machine'} configuration`}
        onCancel={closeModal}
        onSubmit={handleCreateMachineOk}
        configType={openModal === 'machine-config' ? 'machine' : 'target'}
        targetConfigExists={false} // TODO: check actual target config existence
      />

      {/* <AasCreateParameterModal
        title="Create Metadata"
        open={openModal === 'metadata'}
        onCancel={closeModal}
        onSubmit={handleCreateMetadataOk}
        okText="Create"
        showKey
        parentConfig={parentConfig}
      /> */}

      <AasCreateParameterModal
        title="Create Parameter"
        open={openModal === 'parameter'}
        onCancel={closeModal}
        onSubmit={handleCreateParameterOk}
        okText="Create"
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />

      <AasCreateParameterModal
        title="Edit Parameter"
        open={editFieldOpen}
        onCancel={() => setEditFieldOpen(false)}
        onSubmit={handleEditParameter}
        okText="Save"
        valueTemplateSource={
          rightClickedType === 'parameter' && rightClickedNode && !('type' in rightClickedNode)
            ? (rightClickedNode as Parameter & { valueTemplateSource?: any }).valueTemplateSource
            : undefined
        }
        initialData={
          rightClickedType === 'parameter' && rightClickedNode && !('type' in rightClickedNode)
            ? [
                {
                  name: (rightClickedNode as Parameter).name || '',
                  value:
                    'valueTemplateSource' in rightClickedNode
                      ? (parentConfig as any)[(rightClickedNode as any).valueTemplateSource].value
                      : (rightClickedNode as Parameter).value || '',
                  unit: (rightClickedNode as Parameter).unitRef || '',
                  displayName: (rightClickedNode as Parameter).displayName || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  description: (rightClickedNode as Parameter).description || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  ...getInitialTransformationData(rightClickedNode as Parameter),
                  // advanced settings with defaults
                  parameterType: (rightClickedNode as Parameter).parameterType || 'none',
                  structureVisible:
                    (rightClickedNode as Parameter).structureVisible !== undefined
                      ? (rightClickedNode as Parameter).structureVisible
                        ? 'yes'
                        : 'no'
                      : 'yes',
                  valueTemplateSource:
                    'valueTemplateSource' in rightClickedNode
                      ? (rightClickedNode as any).valueTemplateSource
                      : 'none',
                },
              ]
            : []
        }
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />

      <PreviewFeatureModal
        open={previewModalConfig.open}
        onClose={() => setPreviewModalConfig({ open: false, title: '', description: '' })}
        title={previewModalConfig.title}
        description={previewModalConfig.description}
      />
    </>
  );
};

export default AasConfigurationTreeView;
