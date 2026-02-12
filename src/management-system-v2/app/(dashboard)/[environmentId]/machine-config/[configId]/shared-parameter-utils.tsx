import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPreferences } from '@/lib/user-preferences';
import {
  Config,
  Parameter,
  VirtualParameter,
  LinkedParameter,
  StoredParameter,
} from '@/lib/data/machine-config-schema';
import {
  addParameter as backendAddParameter,
  removeParameter,
  updateParameter,
  getParameterParent,
  convertParameterType,
  reorderParameter,
} from '@/lib/data/db/machine-config';
import {
  defaultParameter,
  defaultVirtualParameter,
  buildLinkedInputParametersFromIds,
  findParameter,
} from '../configuration-helper';
import { CreateParameterModalReturnType } from './aas-create-parameter-modal';
import { updateConfigMetadata } from '@/lib/data/db/machine-config';
import { Modal } from 'antd';
import Tree from 'antd/es/tree/Tree';
import { Localization } from '@/lib/data/locale';
export const getInitialTransformationData = (param: Parameter | VirtualParameter) => {
  const paramWithTransformation = param as Parameter & {
    transformation?: {
      transformationType: string;
      linkedInputParameters: Record<string, LinkedParameter>;
      action: string;
    };
  };

  if (
    !paramWithTransformation.transformation ||
    paramWithTransformation.transformation.transformationType === 'none'
  ) {
    return {
      transformationType: 'none',
      linkedParameters: [],
      formula: '',
    };
  }

  const linkedParameterIds = Object.values(
    paramWithTransformation.transformation.linkedInputParameters,
  ).map((lp) => lp.id);

  return {
    transformationType: paramWithTransformation.transformation.transformationType,
    linkedParameters: linkedParameterIds,
    formula: paramWithTransformation.transformation.action || '',
  };
};

export const hasNestedContent = (record: Parameter | VirtualParameter) => {
  return record.subParameters && record.subParameters.length > 0;
};

export const generateMachineDatasetNames = (
  parentConfig: Config,
): { name: string; displayName: string } => {
  const identifyMachineDatasets = (params: Parameter[]): Parameter | undefined => {
    for (const p of params) {
      if (p.name === 'MachineDatasets') {
        return p;
      }
      if (p.subParameters && p.subParameters.length > 0) {
        const found = identifyMachineDatasets(p.subParameters as Parameter[]);
        if (found) return found;
      }
    }
    return undefined;
  };

  const machineDatasets = identifyMachineDatasets(parentConfig.content);
  const currentLength = machineDatasets?.subParameters?.length || 0;
  const nextNumber = currentLength + 1;

  return {
    name: `MachineDataset-${nextNumber}`,
    displayName: `Maschine ${nextNumber} Parametersatz`,
  };
};

export const moveParameterUp = async (
  record: Parameter | VirtualParameter,
  parentConfig: Config,
  onRefresh: () => void,
) => {
  // first find parent context
  const ref = findParameter(record.id, parentConfig, 'config');
  if (!ref) return;

  // find parent array based on whether parent is Config or Parameter
  const parentArray =
    'content' in ref.parent
      ? (ref.parent as Config).content
      : (ref.parent as Parameter).subParameters;

  const currentIndex = parentArray.findIndex((item: { id: string }) => item.id === record.id);
  if (currentIndex > 0) {
    await reorderParameter(record.id, 'up', parentConfig.id);
    onRefresh();
  }
};

export const moveParameterDown = async (
  record: Parameter | VirtualParameter,
  parentConfig: Config,
  onRefresh: () => void,
) => {
  // first find parent context
  const ref = findParameter(record.id, parentConfig, 'config');
  if (!ref) return;

  // find parent array based on whether parent is Config or Parameter
  const parentArray =
    'content' in ref.parent
      ? (ref.parent as Config).content
      : (ref.parent as Parameter).subParameters;

  const currentIndex = parentArray.findIndex((item: { id: string }) => item.id === record.id);
  if (currentIndex < parentArray.length - 1) {
    await reorderParameter(record.id, 'down', parentConfig.id);
    onRefresh();
  }
};

// Helper function to find a parameter by path
export const findParameterByPath = (config: Config, path: string[]): Parameter | null => {
  let current: Parameter[] = config.content;

  for (const pathSegment of path) {
    const found = current.find((param) => param.name.toLowerCase() === pathSegment.toLowerCase());

    if (!found) {
      return null;
    }

    if (pathSegment === path[path.length - 1]) {
      return found;
    }

    if (!found.subParameters || found.subParameters.length === 0) {
      return null;
    }

    current = found.subParameters as Parameter[];
  }

  return null;
};

// Helper to open create modal for nested parameter at specific path
export const openCreateModalForPath = (
  config: Config,
  path: string[],
  setTargetParameter: (param: Parameter | undefined) => void,
  setCreateFieldOpen: (open: boolean) => void,
  onError: (message: string) => void,
) => {
  const targetParam = findParameterByPath(config, path);

  if (!targetParam) {
    onError(`Could not find parameter at path: ${path.join(' → ')}`);
    return;
  }

  setTargetParameter(targetParam);
  setCreateFieldOpen(true);
};

interface UseTreeExpansionParams {
  parentConfig: Config;
}

export const editParameter = async (
  currentlanguage: Localization,
  currentParameter: Parameter | VirtualParameter,
  valuesFromModal: CreateParameterModalReturnType,
  parentConfig: Config,
  onSuccess: () => void,
  showTransformationPopup: boolean = true,
) => {
  // common fields

  // use full displayName and description arrays from modal
  const newDisplayName = valuesFromModal.displayName || [];
  const newDescription = valuesFromModal.description || [];

  // build advanced settings
  let advancedSettingsUpdate: any = {};
  if (valuesFromModal.parameterType !== undefined) {
    advancedSettingsUpdate.parameterType = valuesFromModal.parameterType;
  }
  if (valuesFromModal.structureVisible !== undefined) {
    advancedSettingsUpdate.structureVisible = valuesFromModal.structureVisible === 'yes';
  }

  // Build transformation update (only for regular parameters)
  let transformationUpdate: any = {};

  if (
    valuesFromModal.transformationType !== 'none' &&
    valuesFromModal.linkedParameters.length > 0
  ) {
    const linkedInputParameters: Record<string, LinkedParameter> = {};

    const linkedParameterObjects = buildLinkedInputParametersFromIds(
      valuesFromModal.linkedParameters,
      parentConfig,
    );

    linkedParameterObjects.forEach((linkedParam, index) => {
      linkedInputParameters[`$IN${index + 1}`] = linkedParam;
    });

    transformationUpdate.transformation = {
      transformationType: valuesFromModal.transformationType,
      linkedInputParameters,
      action: valuesFromModal.formula || '',
    };
  } else {
    transformationUpdate.transformation = {
      transformationType: 'none',
      linkedInputParameters: {},
      action: '',
    };
  }

  // determine current and target types
  const isCurrentlyVirtual = 'valueTemplateSource' in currentParameter;
  const shouldBeVirtual =
    valuesFromModal.valueTemplateSource && valuesFromModal.valueTemplateSource !== 'none';
  const needsTypeConversion = isCurrentlyVirtual !== shouldBeVirtual;

  let result;

  // 1: conversion needed
  if (needsTypeConversion) {
    // create new parameter with correct type
    let newParam: Parameter | VirtualParameter;

    if (shouldBeVirtual) {
      // converting regular to virtual
      newParam = defaultVirtualParameter(
        valuesFromModal.name,
        newDisplayName,
        newDescription,
        advancedSettingsUpdate.parameterType || 'none',
        valuesFromModal.valueTemplateSource as unknown as VirtualParameter['valueTemplateSource'],
        currentParameter.valueType,
        valuesFromModal.unit,
      );
    } else {
      // Converting virtual to regular
      newParam = defaultParameter(
        valuesFromModal.name,
        newDisplayName,
        newDescription,
        advancedSettingsUpdate.parameterType || 'none',
        valuesFromModal.value,
        currentParameter.valueType,
        valuesFromModal.unit,
      );

      // apply transformation for regular parameter
      if (transformationUpdate.transformation) {
        (newParam as Parameter).transformation = transformationUpdate.transformation;
      }
    }

    // apply advanced settings
    if (advancedSettingsUpdate.structureVisible !== undefined) {
      newParam.structureVisible = advancedSettingsUpdate.structureVisible;
    }

    // backend conversion function
    result = await convertParameterType(currentParameter.id, newParam, parentConfig.id);
  }
  // 2: updating existing virtual parameter
  else if (isCurrentlyVirtual) {
    const isSourceChanging =
      valuesFromModal.valueTemplateSource &&
      valuesFromModal.valueTemplateSource !== 'none' &&
      valuesFromModal.valueTemplateSource !== currentParameter.valueTemplateSource;

    const newParameter: any = {
      name: valuesFromModal.name,
      unitRef: valuesFromModal.unit,
      displayName: newDisplayName,
      description: newDescription,
      ...advancedSettingsUpdate,
    };
    // update valueTemplateSource if it is changing
    if (isSourceChanging) {
      newParameter.valueTemplateSource = valuesFromModal.valueTemplateSource;
    }

    // update config metadata only if source is NOT changing (only value changed)
    if (!isSourceChanging && valuesFromModal.value !== undefined) {
      let callParameters: {
        name: string | undefined;
        shortName: string | undefined;
        category: string | undefined;
        description: string | undefined;
      } = {
        name: undefined,
        shortName: undefined,
        category: undefined,
        description: undefined,
      };
      callParameters[currentParameter.valueTemplateSource] = valuesFromModal.value;
      await updateConfigMetadata(parentConfig.id, ...Object.values(callParameters));
    }
    result = await updateParameter(currentParameter.id, newParameter, parentConfig.id);
  }
  // 3: updating existing Regular Parameter
  else {
    const newParameter: Partial<StoredParameter> = {
      name: valuesFromModal.name,
      value: valuesFromModal.value,
      unitRef: valuesFromModal.unit,
      displayName: newDisplayName,
      description: newDescription,
      ...transformationUpdate,
      ...advancedSettingsUpdate,
    };

    try {
      result = await updateParameter(currentParameter.id, newParameter, parentConfig.id);
    } catch (err) {
      // ignore errors
    }
  }

  onSuccess();

  // popup if transformations were executed (only if showTransformationPopup is true)
  if (showTransformationPopup && result?.changedParameters && result.changedParameters.length > 0) {
    // Build tree structure showing only updated parameters and their parents
    const buildParameterTree = (config: Config, changedParamIds: Set<string>) => {
      const buildTreeNode = (params: Parameter[], parentPath: string[] = []): any[] => {
        return params
          .map((param) => {
            if (!param.id || !param.name) return null;

            const currentPath = [...parentPath, param.name];
            const displayName =
              param.displayName.find((item) => item.language === currentlanguage)?.text ||
              param.name;

            // if this parameter or any child was changed
            const isChanged = changedParamIds.has(param.id);
            let hasChangedDescendant = false;
            let children: any[] = [];

            if (param.subParameters && param.subParameters.length > 0) {
              children = buildTreeNode(param.subParameters, currentPath).filter(Boolean);
              hasChangedDescendant = children.length > 0;
            }

            // include only if this param was changed or has changed descendants
            if (!isChanged && !hasChangedDescendant) {
              return null;
            }

            const changedParam = result.changedParameters.find(
              (p: { id: string }) => p.id === param.id,
            );

            // jelper function to format value display
            const formatValue = (value: any) => {
              if (value === '' || value === null || value === undefined) {
                return <em>empty</em>;
              }
              return value;
            };

            return {
              title: (
                <span>
                  {displayName}
                  {isChanged && changedParam && (
                    <span style={{ marginLeft: 8, color: '#1890ff' }}>
                      : {formatValue(changedParam.oldValue)} →{' '}
                      <strong>{formatValue(changedParam.newValue)}</strong>
                    </span>
                  )}
                </span>
              ),
              key: param.id,
              children: children.length > 0 ? children : undefined,
            };
          })
          .filter(Boolean);
      };

      return buildTreeNode(config.content);
    };

    const changedParamIds = new Set(result.changedParameters.map((p) => p.id));
    const treeData = buildParameterTree(parentConfig, changedParamIds);

    Modal.info({
      title: 'Transformations Executed',
      width: 800,
      centered: true,
      content: (
        <div>
          <p style={{ marginBottom: 16 }}>The following parameters were automatically updated:</p>
          <div
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
              overflowX: 'auto',
              background: '#fafafa',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9',
            }}
          >
            <Tree treeData={treeData} defaultExpandAll showLine />
          </div>
        </div>
      ),
    });
  }
};

export const useTreeExpansion = ({ parentConfig }: UseTreeExpansionParams) => {
  const router = useRouter();
  const setUserPreferences = useUserPreferences.use.addPreferences();
  const openTreeItemsInConfigs = useUserPreferences.use['tech-data-open-tree-items']();
  const configOpenItems = openTreeItemsInConfigs.find(({ id }) => id === parentConfig.id);
  const expandedKeys = configOpenItems ? configOpenItems.open : [];

  const addExpandedKey = (id: string) => {
    expandedKeys.push(id);
    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: expandedKeys },
      ],
    });
    router.refresh();
  };

  const removeExpandedKey = (id: string) => {
    let index = expandedKeys.indexOf(id);
    expandedKeys.splice(index, 1);
    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: expandedKeys },
      ],
    });
    router.refresh();
  };

  return { expandedKeys, addExpandedKey, removeExpandedKey };
};

interface UseParameterActionsParams {
  parentConfig: Config;
  onRefresh: () => void;
  currentLanguage: Localization;
}

export const useParameterActions = ({
  parentConfig,
  onRefresh,
  currentLanguage,
}: UseParameterActionsParams) => {
  const router = useRouter();
  const [currentParameter, setCurrentParameter] = useState<Parameter | VirtualParameter>();
  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [editFieldOpen, setEditFieldOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  const addParameter = async (
    values: CreateParameterModalReturnType[],
    parent?: Parameter | VirtualParameter,
  ) => {
    const valuesFromModal = values[0];
    // use full display name and description arrays from modal
    const displayName = valuesFromModal.displayName || [];
    const description = valuesFromModal.description || [];
    // get parameterType from advanced settings or default to 'none'
    const parameterType = valuesFromModal.parameterType || 'none';

    let newParameter: Parameter | VirtualParameter;

    const shouldBeVirtual =
      valuesFromModal.valueTemplateSource && valuesFromModal.valueTemplateSource !== 'none';

    if (shouldBeVirtual) {
      newParameter = defaultVirtualParameter(
        valuesFromModal.name,
        displayName,
        description,
        parameterType as 'meta' | 'content' | 'none',
        valuesFromModal.valueTemplateSource as unknown as VirtualParameter['valueTemplateSource'],
        'xs:string',
        valuesFromModal.unit,
      );
    } else {
      newParameter = defaultParameter(
        valuesFromModal.name,
        displayName,
        description,
        parameterType as 'meta' | 'content' | 'none',
        valuesFromModal.value,
        'xs:string',
        valuesFromModal.unit,
      );
    }

    // apply advanced settings
    if (valuesFromModal.structureVisible !== undefined) {
      newParameter.structureVisible = valuesFromModal.structureVisible === 'yes';
    }

    // adding transformation
    if (
      valuesFromModal.transformationType !== 'none' &&
      valuesFromModal.linkedParameters.length > 0
    ) {
      const linkedInputParameters: Record<string, LinkedParameter> = {};

      const linkedParameterObjects = buildLinkedInputParametersFromIds(
        valuesFromModal.linkedParameters,
        parentConfig,
      );

      linkedParameterObjects.forEach((linkedParam, index) => {
        linkedInputParameters[`$IN${index + 1}`] = linkedParam;
      });

      (newParameter as Parameter).transformation = {
        transformationType: valuesFromModal.transformationType as any,
        linkedInputParameters,
        action: valuesFromModal.formula || '',
      };
    }

    // use parent parameter if provided, otherwise use currentParameter, otherwise add to root
    const targetParent = parent || currentParameter;
    if (targetParent) {
      await backendAddParameter(targetParent.id, 'parameter', newParameter, parentConfig.id);
    } else {
      await backendAddParameter(parentConfig.id, 'config', newParameter, parentConfig.id);
    }

    setCreateFieldOpen(false);
    router.refresh();
    setCurrentParameter(undefined);
  };

  const handleEditParameter = async (values: CreateParameterModalReturnType[]) => {
    if (currentParameter) {
      await editParameter(currentLanguage, currentParameter, values[0], parentConfig, () => {
        setEditFieldOpen(false);
        onRefresh();
        setCurrentParameter(undefined);
      });
    }
  };

  const handleDeleteConfirm = async (paramToDelete?: Parameter | VirtualParameter | any) => {
    // if it's a MouseEvent (from Modal), use currentParameter and if it's a Parameter, use that instead
    const isMouseEvent = paramToDelete && 'nativeEvent' in paramToDelete;
    const targetParam = isMouseEvent ? currentParameter : paramToDelete || currentParameter;
    if (targetParam && targetParam.name) {
      removeParameter(targetParam.id);
    }
    setDeleteModalOpen(false);
    router.refresh();
  };

  return {
    currentParameter,
    setCurrentParameter,
    createFieldOpen,
    setCreateFieldOpen,
    editFieldOpen,
    setEditFieldOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    addParameter,
    handleEditParameter,
    handleDeleteConfirm,
  };
};
