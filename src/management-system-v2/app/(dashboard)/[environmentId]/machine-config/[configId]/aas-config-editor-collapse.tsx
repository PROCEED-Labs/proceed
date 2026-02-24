import { useMemo } from 'react';
import { Config, Parameter } from '@/lib/data/machine-config-schema';
import { CaretRightOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';
import AasContent from './aas-config-content';
import MachineDatasetVersionSelector from './machine-dataset-version-selector';
import { Localization } from '@/lib/data/locale';

export const useCollapseItems = (
  editMode: boolean,
  parentConfig: Config,
  displayedParameters: Parameter[],
  viewModeRootParams: Parameter[],
  selectedParameterId: string | null | undefined,
  panelStyle: any,
  expandedKeys: string[],
  onCollapseChange: (newIds: string[]) => void,
  generateParameterActionDropdown: (param: Parameter) => any,
  currentLanguage: Localization,
  allMachineVersions: Record<string, string[]>,
  searchSelectedParamId: string | null,
  collapseRenderKey: number,
) => {
  const collapseItems = useMemo(() => {
    let panels: any[] = [];

    // 1: Identify all machine dataset IDs before flattening
    const machineDatasetIds = new Set<string>();

    const identifyMachineDatasets = (params: Parameter[]) => {
      for (const p of params) {
        if (p.name === 'MachineDatasets') {
          // found MachineDatasets parent and then store all child IDs
          if (p.subParameters && p.subParameters.length > 0) {
            (p.subParameters as Parameter[]).forEach((child: Parameter) => {
              machineDatasetIds.add(child.id);
            });
          }
          return;
        }

        // recursive call
        if (p.subParameters && p.subParameters.length > 0) {
          identifyMachineDatasets(p.subParameters as Parameter[]);
        }
      }
    };

    // identify machine datasets from the original config before any flattening
    identifyMachineDatasets(parentConfig.content);

    // flatten invisible parameters at the very beginning in view mode
    const flattenInvisibleParametersRecursively = (params: Parameter[]): Parameter[] => {
      if (editMode) {
        return params;
      }

      const result: Parameter[] = [];

      params.forEach((param) => {
        if (param.structureVisible) {
          // for visible parameter: keep it and recursively process its children
          result.push({
            ...param,
            subParameters:
              param.subParameters && param.subParameters.length > 0
                ? flattenInvisibleParametersRecursively(param.subParameters as Parameter[])
                : param.subParameters,
          });
        } else {
          // invisible parameter: promote all its children up one level
          if (param.subParameters && param.subParameters.length > 0) {
            const flattenedChildren = flattenInvisibleParametersRecursively(
              param.subParameters as Parameter[],
            );
            result.push(...flattenedChildren);
          }
          // if invisible parameter has no children are simply excluded
        }
      });

      return result;
    };

    // apply flattening to the entire config first
    const processedConfig = editMode
      ? parentConfig
      : {
          ...parentConfig,
          content: flattenInvisibleParametersRecursively(parentConfig.content),
        };

    // also apply to displayedParameters
    const processedDisplayedParameters = editMode
      ? displayedParameters
      : flattenInvisibleParametersRecursively(displayedParameters);

    let shouldSwitchView = false;
    let selectedParentParam: Parameter | null = null;

    if (selectedParameterId) {
      const findParameterInTree = (params: Parameter[], targetId: string): Parameter | null => {
        for (const param of params) {
          if (param.id === targetId) {
            return param;
          }
          if (param.subParameters && param.subParameters.length > 0) {
            const found = findParameterInTree(param.subParameters as Parameter[], targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const selectedParam = findParameterInTree(processedConfig.content, selectedParameterId);

      if (selectedParam) {
        // checking if selected parameter has any child?
        const hasSubParameters =
          selectedParam.subParameters && (selectedParam.subParameters as Parameter[]).length > 0;

        if (hasSubParameters) {
          // switch view if the parameter has the childs
          selectedParentParam = selectedParam;
          shouldSwitchView = true;
        } else {
          // if it has no child then find its parent
          const findParentOfParameter = (
            params: Parameter[],
            targetId: string,
            parent: Parameter | null = null,
          ): Parameter | null => {
            for (const param of params) {
              if (param.id === targetId) {
                return parent;
              }
              if (param.subParameters && param.subParameters.length > 0) {
                const found = findParentOfParameter(
                  param.subParameters as Parameter[],
                  targetId,
                  param,
                );
                if (found !== null) return found;
              }
            }
            return null;
          };

          const parentParam = findParentOfParameter(processedConfig.content, selectedParameterId);

          if (parentParam) {
            // show parent's view
            selectedParentParam = parentParam;
            shouldSwitchView = true;
          }
          // parent not found? then shouldSwitchView remain false
        }
      }
    }

    const getEffectiveParameterType = (param: Parameter): 'meta' | 'content' => {
      if (param.parameterType !== 'none') {
        return param.parameterType;
      }

      // find parent in the config
      const findParentInSubParameters = (searchId: string, param: Parameter): Parameter | null => {
        for (const sub of param.subParameters) {
          if (sub.id === searchId) {
            return param;
          }
          if (sub.subParameters.length > 0) {
            const found = findParentInSubParameters(searchId, sub);
            if (found) return found;
          }
        }
        return null;
      };

      const findParent = (
        searchId: string,
        parent: Config | Parameter,
        parentType: 'config' | 'parameter',
      ): Parameter | null => {
        if (parentType === 'config') {
          const configParent = parent as Config;
          for (const p of configParent.content) {
            if (p.subParameters.some((sub: { id: string }) => sub.id === searchId)) {
              return p;
            }
            const found = findParentInSubParameters(searchId, p);
            if (found) return found;
          }
        } else {
          return findParentInSubParameters(searchId, parent as Parameter);
        }
        return null;
      };

      const parent = findParent(param.id, processedConfig, 'config');

      if (parent) {
        // recursively check parent's type
        return getEffectiveParameterType(parent);
      }

      // default
      return 'content';
    };

    // helper function to get border color based on parameter type
    const getBorderColor = (param: Parameter): string => {
      const effectiveType = getEffectiveParameterType(param);

      // meta = cyan, content = green
      return effectiveType === 'meta' ? '#87e8de' : '#b7eb8f';
    };

    const getPanelStyle = (param: Parameter) => {
      const borderColor = getBorderColor(param);
      const isSearchSelected = searchSelectedParamId === param.id;

      return {
        ...panelStyle,
        border: isSearchSelected ? `1px solid ${borderColor}` : `1px solid ${borderColor}`,
        background: isSearchSelected ? 'rgba(69, 162, 14, 0.15)' : 'rgba(255, 255, 255, 0.9)',
        boxShadow: isSearchSelected
          ? '0 0 0 3px rgba(115, 209, 61, 0.15), 2px 2px 6px -4px rgba(0, 0, 0, 0.12), 4px 4px 16px 0px rgba(0, 0, 0, 0.08)'
          : '2px 2px 6px -4px rgba(0, 0, 0, 0.12), 4px 4px 16px 0px rgba(0, 0, 0, 0.08), 6px 6px 28px 8px rgba(0, 0, 0, 0.05)',
      };
    };

    // helper function to check if a parameter is a machine dataset
    // and use pre-identified IDs instead of searching the processed config
    const isMachineDataset = (param: Parameter): boolean => {
      return machineDatasetIds.has(param.id);
    };

    // to flatten invisible parameters in view mode only
    const processParameters = (params: Parameter[]) => {
      params.forEach((param) => {
        const isMachineDatasetParam = isMachineDataset(param);
        const hasChanges = (param as any).hasChanges === true;
        // border color based on parameter type
        const borderColor = getBorderColor(param);
        const description =
          param.description?.find((item) => item.language === currentLanguage)?.text || '';

        // skip params that don't have subparameters as they shown in table
        const subParams = (param.subParameters as Parameter[]) || [];
        if (subParams.length === 0) {
          return;
        }

        panels.push({
          key: param.id,
          label: (
            <div
              id={`scrollref_${param.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingRight: '8px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: hasChanges && processedConfig.templateId ? '#0d6efd' : undefined,
                  }}
                >
                  {param.displayName.find((item) => item.language === currentLanguage)?.text ||
                    param.name}
                </span>
                {description && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: hasChanges && processedConfig.templateId ? '#4d94ff' : '#666',
                      fontWeight: 'normal',
                      marginTop: '4px',
                    }}
                  >
                    {description}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMachineDatasetParam &&
                  (() => {
                    // get selected TDS version from URL
                    const searchParams = new URLSearchParams(window.location.search);
                    const selectedTDSVersion = searchParams.get('version');

                    // filter machine versions based on taht version
                    let filteredVersions = allMachineVersions[param.id] || [];

                    if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                      filteredVersions = filteredVersions.filter((version) => {
                        const majorVersion = version.split('.')[0];
                        return majorVersion === selectedTDSVersion;
                      });
                    }
                    // "latest" is selected or no version selected, show all versions

                    // find the current version to display; latest under selected parent
                    let currentVersionForMachine: string | undefined;
                    if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                      // if specific version selected and no URL param for this machine, use latest under seleceted main version
                      const machineVersionParam = searchParams.get(`machineVersion_${param.id}`);
                      if (!machineVersionParam && filteredVersions.length > 0) {
                        currentVersionForMachine = filteredVersions[0]; // Already sorted descending
                      }
                    }

                    return (
                      <MachineDatasetVersionSelector
                        configId={processedConfig.id}
                        machineDatasetId={param.id}
                        machineDatasetName={
                          param.displayName.find((item) => item.language === currentLanguage)
                            ?.text || param.name
                        }
                        editMode={editMode}
                        availableVersions={filteredVersions}
                        currentVersion={currentVersionForMachine}
                      />
                    );
                  })()}
                {editMode && generateParameterActionDropdown(param)}
              </div>
            </div>
          ),
          children: (
            <AasContent
              //contentType="header"
              //configId={parentConfig.id}
              //configType={'config'}
              parentConfig={processedConfig}
              data={param.subParameters as Parameter[]}
              editingEnabled={editMode}
              parentParameter={param}
              currentLanguage={currentLanguage}
              searchSelectedParamId={searchSelectedParamId}
            />
          ),
          style: getPanelStyle(param),
        });
      });
    };

    if (shouldSwitchView && selectedParentParam) {
      const param = selectedParentParam;
      const children = (param.subParameters as Parameter[]) || [];
      const isMachineDatasetParam = isMachineDataset(param);
      const hasChanges = (param as any).hasChanges === true;
      const description =
        param.description?.find((item) => item.language === currentLanguage)?.text || '';

      // Separate children into two groups, with subparameters and without
      const childrenWithSubParams: Parameter[] = [];
      const childrenWithoutSubParams: Parameter[] = [];

      children.forEach((child: Parameter) => {
        const subParamsToCheck = child.subParameters || [];
        const hasSubParams = subParamsToCheck.length > 0;

        if (hasSubParams) {
          childrenWithSubParams.push(child);
        } else {
          childrenWithoutSubParams.push(child);
        }
      });

      // create nested child panels with indentation
      const childPanels: any[] = [];
      childrenWithSubParams.forEach((child: Parameter) => {
        const childBorderColor = getBorderColor(child);
        const childHasChanges = (child as any).hasChanges === true;
        const childDescription =
          child.description?.find((item) => item.language === currentLanguage)?.text || '';
        const isChildMachineDataset = isMachineDataset(child);

        const childSubParams = child.subParameters || [];

        childPanels.push({
          key: child.id,
          label: (
            <div
              id={`scrollref_${child.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingRight: '8px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: childHasChanges && processedConfig.templateId ? '#0d6efd' : undefined,
                  }}
                >
                  {child.displayName.find((item) => item.language === currentLanguage)?.text ||
                    child.name}
                </span>
                {childDescription && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: childHasChanges && processedConfig.templateId ? '#4d94ff' : '#666',
                      fontWeight: 'normal',
                      marginTop: '4px',
                    }}
                  >
                    {childDescription}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isChildMachineDataset &&
                  (() => {
                    // get selected TDS version from URL
                    const searchParams = new URLSearchParams(window.location.search);
                    const selectedTDSVersion = searchParams.get('version');

                    // filter machine versions based on taht version
                    let filteredVersions = allMachineVersions[child.id] || [];

                    if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                      filteredVersions = filteredVersions.filter((version) => {
                        const majorVersion = version.split('.')[0];
                        return majorVersion === selectedTDSVersion;
                      });
                    }
                    // if "latest" is selected or no version selected, show all versions

                    // find the current version to display; latest under selected parent
                    let currentVersionForMachine: string | undefined;
                    if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                      // if specific version selected and no URL param for this machine, use latest under seleceted main version
                      const machineVersionParam = searchParams.get(`machineVersion_${child.id}`);
                      if (!machineVersionParam && filteredVersions.length > 0) {
                        currentVersionForMachine = filteredVersions[0]; // Already sorted descending
                      }
                    }

                    return (
                      <MachineDatasetVersionSelector
                        configId={processedConfig.id}
                        machineDatasetId={child.id}
                        machineDatasetName={
                          child.displayName.find((item) => item.language === currentLanguage)
                            ?.text || child.name
                        }
                        editMode={editMode}
                        availableVersions={filteredVersions}
                        currentVersion={currentVersionForMachine}
                      />
                    );
                  })()}
                {editMode && generateParameterActionDropdown(child)}
              </div>
            </div>
          ),
          children: (
            <AasContent
              // contentType="header"
              // configId={parentConfig.id}
              // configType={'config'}
              parentConfig={processedConfig}
              data={childSubParams}
              editingEnabled={editMode}
              parentParameter={child}
              currentLanguage={currentLanguage}
              searchSelectedParamId={searchSelectedParamId}
            />
          ),
          style: {
            ...getPanelStyle(child),
            marginLeft: '24px',
          },
        });
      });

      // create parent section with nested childrens
      panels.push({
        key: param.id,
        label: (
          <div
            id={`scrollref_${param.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingRight: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '16px',
                  color: hasChanges && processedConfig.templateId ? '#0d6efd' : undefined,
                }}
              >
                {param.displayName.find((item) => item.language === currentLanguage)?.text ||
                  param.name}
              </span>
              {description && (
                <span
                  style={{
                    fontSize: '13px',
                    color: hasChanges && processedConfig.templateId ? '#4d94ff' : '#666',
                    fontWeight: 'normal',
                    marginTop: '4px',
                  }}
                >
                  {description}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMachineDatasetParam &&
                (() => {
                  // get selected TDS version from URL
                  const searchParams = new URLSearchParams(window.location.search);
                  const selectedTDSVersion = searchParams.get('version');

                  // Filter machine versions based on taht version
                  let filteredVersions = allMachineVersions[param.id] || [];

                  if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                    filteredVersions = filteredVersions.filter((version) => {
                      const majorVersion = version.split('.')[0];
                      return majorVersion === selectedTDSVersion;
                    });
                  }
                  // if "latest" is selected or no version selected, show all versions

                  // find the current version to display; latest under selected parent
                  let currentVersionForMachine: string | undefined;
                  if (selectedTDSVersion && selectedTDSVersion !== 'latest') {
                    // if specific version selected and no URL param for this machine, use latest under seleceted main version
                    const machineVersionParam = searchParams.get(`machineVersion_${param.id}`);
                    if (!machineVersionParam && filteredVersions.length > 0) {
                      currentVersionForMachine = filteredVersions[0]; // Already sorted descending
                    }
                  }

                  return (
                    <MachineDatasetVersionSelector
                      configId={processedConfig.id}
                      machineDatasetId={param.id}
                      machineDatasetName={
                        param.displayName.find((item) => item.language === currentLanguage)?.text ||
                        param.name
                      }
                      editMode={editMode}
                      availableVersions={filteredVersions}
                      currentVersion={currentVersionForMachine}
                    />
                  );
                })()}
              {editMode && generateParameterActionDropdown(param)}
            </div>
          </div>
        ),
        children: (
          <div>
            {childPanels.length > 0 && (
              <Collapse
                bordered={false}
                defaultActiveKey={expandedKeys}
                activeKey={expandedKeys}
                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                style={{
                  background: 'transparent',
                  marginTop: childrenWithoutSubParams.length > 0 ? '16px' : '0',
                }}
                items={childPanels}
                onChange={onCollapseChange}
              />
            )}

            <AasContent
              // contentType="header"
              // configId={parentConfig.id}
              // configType={'config'}
              parentConfig={processedConfig}
              data={childrenWithoutSubParams}
              editingEnabled={editMode}
              parentParameter={param}
              currentLanguage={currentLanguage}
              searchSelectedParamId={searchSelectedParamId}
            />
          </div>
        ),
        style: {
          ...getPanelStyle(param),
          border: 'none',
        },
      });
    } else {
      // normal view; just process the displayed parameters
      processParameters(processedDisplayedParameters);
    }

    return panels;
  }, [
    editMode,
    parentConfig,
    displayedParameters,
    viewModeRootParams,
    selectedParameterId,
    collapseRenderKey,
  ]);
  return collapseItems;
};
