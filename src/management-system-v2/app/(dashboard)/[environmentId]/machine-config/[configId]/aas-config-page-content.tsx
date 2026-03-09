'use client';

import { Config, Parameter } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Col,
  Layout,
  Row,
  Space,
  Tag,
  Tooltip,
  Tree,
  TreeDataNode,
  Typography,
  Modal,
} from 'antd';
// TODO
// @ts-ignore
import { ResizableBox, ResizeEvent, ResizeCallbackData } from 'react-resizable';
import React from 'react';
import styles from './page.module.scss';
import { useUserPreferences } from '@/lib/user-preferences';
import { FaFolderTree } from 'react-icons/fa6';
import AasConfigEditor from './aas-config-editor';
import AasConfigurationTreeView from './aas-config-tree-view';
import { nestedParametersFromStorage, updateConfigMetadata } from '@/lib/data/db/machine-config';
import { findParameter } from '../configuration-helper';
import ConfigModal from '@/components/config-modal';
import { useRouter } from 'next/navigation';
import { useConfigEditStore } from './store/useConfigEditStore';
import { Localization } from '@/lib/data/locale';

const collapsedWidth = 70;
const { Text } = Typography;

type VariablesEditorProps = {
  parentConfig: Config;
  editingAllowed: boolean;
};

const AasConfigContent: React.FC<VariablesEditorProps> = ({ parentConfig, editingAllowed }) => {
  const [selectionId, setSelectionId] = useState('');
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDisplayLanguage, setCurrentDisplayLanguage] = useState<Localization>('en');
  const { isEditModalOpen, closeEditModal } = useConfigEditStore();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // auto select first content parameter if it is aas template tds based on templateId
  useEffect(() => {
    if (parentConfig.templateId && !selectedParameterId) {
      // find first content parameter
      const findFirstContentParameter = (params: Parameter[]): Parameter | null => {
        for (const param of params) {
          if (param.parameterType === 'content') {
            return param;
          }
          if (param.subParameters && param.subParameters.length > 0) {
            const found = findFirstContentParameter(param.subParameters as Parameter[]);
            if (found) return found;
          }
        }
        return null;
      };

      const firstContentParam = findFirstContentParameter(parentConfig.content);
      if (firstContentParam) {
        setSelectedParameterId(firstContentParam.id);
        setSelectionId(firstContentParam.id);
      }
    }
  }, [parentConfig.templateId, parentConfig.content]);

  const handleLanguageChange = (languageCode: Localization) => {
    setCurrentDisplayLanguage(languageCode);
  };

  const handleEdit = async (
    values: {
      id: string;
      name: string;
      shortName: string;
      category: string[];
      description: string;
    }[],
  ) => {
    const { id, name, shortName, category, description } = values[0];
    await updateConfigMetadata(id, name, shortName, category, description);
    closeEditModal();
    router.refresh();
  };

  const setPreferences = useUserPreferences.use.addPreferences();
  const { siderOpen, siderWidth } = useUserPreferences.use['tech-data-editor']();

  const handleCollapse = () => {
    setPreferences({
      'tech-data-editor': { siderOpen: !siderOpen, siderWidth: !siderOpen ? 300 : collapsedWidth },
    });
  };

  const setUserPreferences = useUserPreferences.use.addPreferences();
  const openTreeItemsInConfigs = useUserPreferences.use['tech-data-open-tree-items']();
  const configOpenItems = openTreeItemsInConfigs.find(({ id }) => id === parentConfig.id);
  const getDefaultExpandedKeys = (): string[] => {
    // if templateId exists
    if (parentConfig.templateId) {
      const firstLevelContentKeys: string[] = [parentConfig.id];

      parentConfig.content.forEach((param) => {
        if (param.parameterType === 'content') {
          firstLevelContentKeys.push(param.id);
        }
      });

      return firstLevelContentKeys;
    } else {
      // default behavior
      return [parentConfig.id];
    }
  };
  const expandedKeys = configOpenItems ? configOpenItems.open : getDefaultExpandedKeys();
  const ParameterTreeNodeTitle: React.FC<{
    element: Parameter;
    type: 'meta' | 'content';
    parentConfig: Config;
  }> = ({ element, type, parentConfig }) => {
    const colorMap = { meta: 'cyan', content: 'green' };
    const charMap = { meta: 'm', content: 'c' };

    const getDisplayNameText = (
      displayName: { language: string; text: string }[] | undefined,
    ): { text: string; isUsingName: boolean } => {
      if (!displayName || displayName.length === 0) {
        return { text: element.name, isUsingName: true }; // fallback to name if no display name
      }

      const germanText = displayName.find((item) => item.language === currentDisplayLanguage)?.text;
      if (germanText) {
        return { text: germanText, isUsingName: false };
      }
      return { text: element.name, isUsingName: true };
    };

    // helper to find required parameter type by going up the to parents
    const getEffectiveParameterType = (param: Parameter): 'meta' | 'content' => {
      if (param.parameterType !== 'none') {
        return param.parameterType;
      }

      // find parent in the config
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

      // find the parent parameter
      const parent = findParent(param.id, parentConfig, 'config');

      if (parent) {
        // recursive check parent's type
        return getEffectiveParameterType(parent);
      }

      // if can't find a parent
      return 'content';
    };

    // find required parameter type by going up the to parants
    const effectiveType = getEffectiveParameterType(element);

    // check should style apply for content paramter without value and only apply to leaf parameters with no subParameters
    const isLeafParameter = !element.subParameters || element.subParameters.length === 0;
    // check if parameter has changes
    const hasChanges = (element as any).hasChanges === true;
    const isVirtualParameter =
      (element as any).valueTemplateSource && (element as any).valueTemplateSource !== 'none';
    const shouldStyleAsEmpty =
      effectiveType === 'content' &&
      (!element.value || element.value === '') &&
      isLeafParameter &&
      !isVirtualParameter;

    // if parameter has a transformation (not none)
    const hasTransformation =
      element.transformation && element.transformation.transformationType !== 'none';

    const displayResult = getDisplayNameText(element.displayName);
    const isUsingFallbackName = displayResult.isUsingName;

    // italic if using name, red if empty content parameter; red takes priority over blue
    const textStyle = {
      ...(shouldStyleAsEmpty && { color: '#8B0000' }),
      ...(!shouldStyleAsEmpty && hasChanges && parentConfig.templateId && { color: '#0d6efd' }),
      ...(isUsingFallbackName && { fontStyle: 'italic' }),
    };

    if (hasTransformation) {
      const transformationColors = {
        manual: '#FFF8E7',
        linked: '#E5E4E2',
        algorithm: '#F1E9D2',
        external: '#E5E4E2',
      };

      const transformationBorderColors = {
        manual: '#E6D5B8',
        linked: '#CACAC8',
        algorithm: '#D4CAAD',
        external: '#CACAC8',
      };

      const transformationColor =
        transformationColors[
          element.transformation?.transformationType as keyof typeof transformationColors
        ] || '#F0F0F0';
      const transformationBorderColor =
        transformationBorderColors[
          element.transformation?.transformationType as keyof typeof transformationBorderColors
        ] || '#D0D0D0';
      const baseColor = type === 'meta' ? '#E6FFFB' : '#F6FFED';
      const baseBorderColor = type === 'meta' ? '#87e8de' : '#b7eb8f';

      // Create a custom tag with half-colored background
      return (
        <Text className={styles.TreeNodeTitle} style={textStyle}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 6px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
              height: '22px',
              lineHeight: '20px',
              background: `linear-gradient(-225deg, ${baseColor} 50%, ${transformationColor} 50%)`,
              borderTop: `1px solid ${baseBorderColor}`,
              borderLeft: `1px solid ${baseBorderColor}`,
              borderBottom: `1px solid ${transformationBorderColor}`,
              borderRight: `1px solid ${transformationBorderColor}`,
              marginRight: '8px',
              minWidth: '23px',
              textAlign: 'center',
              verticalAlign: 'middle',
              color: 'transparent',
            }}
          ></span>
          {displayResult.text}
        </Text>
      );
    }

    return (
      <Text className={styles.TreeNodeTitle} style={textStyle}>
        <Tag color={colorMap[type]} style={{ color: 'transparent', maxWidth: '23px' }}>
          {charMap[type]}
        </Tag>
        {displayResult.text}
      </Text>
    );
  };

  const ConfigTreeNodeTitle: React.FC<{
    element: Config;
  }> = ({ element }) => {
    let label = element.shortName.value ?? element.name.value ?? 'N/A';
    return (
      <Text className={styles.TreeNodeTitle}>
        <Tag color="purple">TDS</Tag>
        {label}
      </Text>
    );
  };
  const treeDataCondensed = useMemo(() => {
    function parameterToTree(parameter: Parameter, type: 'meta' | 'content'): TreeDataNode[] {
      let children: TreeDataNode[] = [];

      if (parameter.subParameters.length) {
        let childNodes: TreeDataNode[] = (parameter.subParameters as Parameter[])
          .map((childParameter) =>
            parameterToTree(
              childParameter,
              childParameter.parameterType == 'none' ? type : childParameter.parameterType,
            ),
          )
          .flat();

        children = childNodes;
        if (parameter.structureVisible) {
          return [
            {
              title: (
                <ParameterTreeNodeTitle
                  element={parameter}
                  type={type}
                  parentConfig={parentConfig}
                />
              ),
              key: parameter.id,
              children,
            },
          ];
        } else {
          return children;
        }
      }
      // end node (no subparameters)
      // only return if structureVisible is true
      if (parameter.structureVisible) {
        return [
          {
            title: (
              <ParameterTreeNodeTitle element={parameter} type={type} parentConfig={parentConfig} />
            ),
            key: parameter.id,
            children,
          },
        ];
      } else {
        // if that's not visible then return empty array
        return [];
      }
    }

    return parentConfig.content
      .map((parameter) =>
        parameterToTree(
          parameter,
          parameter.parameterType == 'none' ? 'content' : parameter.parameterType,
        ),
      )
      .flat();
  }, [parentConfig, currentDisplayLanguage]);

  const treeData = useMemo(() => {
    function parameterToTree(parameter: Parameter, type: 'meta' | 'content'): TreeDataNode {
      let children: TreeDataNode[] = [];

      if (parameter.subParameters.length) {
        let childNodes: TreeDataNode[] = (parameter.subParameters as Parameter[])
          .map((childParameter) =>
            parameterToTree(
              childParameter,
              childParameter.parameterType == 'none' ? type : childParameter.parameterType,
            ),
          )
          .flat();

        children = childNodes;
      }
      return {
        title: (
          <ParameterTreeNodeTitle element={parameter} type={type} parentConfig={parentConfig} />
        ),
        key: parameter.id,
        children,
      };
    }

    return parentConfig.content.map((parameter) =>
      parameterToTree(
        parameter,
        parameter.parameterType == 'none' ? 'content' : parameter.parameterType,
      ),
    );
  }, [parentConfig, currentDisplayLanguage]);

  // TODO find first order children to display them as tables

  const treeToParameters = (data: TreeDataNode[]): Parameter[] => {
    if (!editMode) {
      const filterVisibleParameters = (parameters: Parameter[]): Parameter[] => {
        return parameters.reduce((acc: Parameter[], param) => {
          if (param.structureVisible) {
            acc.push({
              ...param,
              subParameters: filterVisibleParameters(param.subParameters as Parameter[]),
            });
          } else {
            acc.push(...filterVisibleParameters(param.subParameters as Parameter[]));
          }
          return acc;
        }, []);
      };

      return filterVisibleParameters(parentConfig.content);
    } else {
      return Object.values(parentConfig.content);
    }
  };
  const getAllKeys = (data: TreeDataNode[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach((item) => {
      keys.push(item.key);
      if (item.children && item.children.length > 0) {
        const itemTitle = item.title as any;
        if (itemTitle?.props?.type != 'meta') {
          //console.log(itemTitle?.props?.element.name);
          keys = keys.concat(getAllKeys(item.children));
        }
      }
    });
    return keys;
  };

  const getAllKeysColap = (data: TreeDataNode[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach((item) => {
      keys.push(item.key);
    });
    return keys;
  };

  const expandAllNodes = () => {
    setIsOpen(true);
    const allExpandableKeys = getAllKeys(treeData).filter((key) => {
      const keyStr = key.toString();
      const [id] = keyStr.includes('|') ? keyStr.split('|') : [keyStr];
      if (id === parentConfig.id) return true;
      const ref = findParameter(id, parentConfig, 'config');
      if (ref) {
        const parameter = ref.selection as Parameter;
        return parameter?.parameterType !== 'meta';
      }
      return true;
    });

    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: allExpandableKeys.map((key) => key.toString()) },
      ],
    });
  };

  const collapseAllNodes = () => {
    setIsOpen(false);
    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: getDefaultExpandedKeys() },
      ],
    });
  };

  if (!isClient) {
    return null;
  }
  return (
    <>
      <Layout className={styles.ConfigEditor}>
        <ResizableBox
          className={styles.CustomBox}
          width={!siderOpen ? collapsedWidth : siderWidth}
          axis="x"
          minConstraints={[collapsedWidth, 0]}
          maxConstraints={[window.innerWidth / 2, Infinity]}
          resizeHandles={['e']}
          handle={siderOpen && <div className={styles.CustomHandle} />}
          onResizeStop={(_: ResizeEvent, { size }: ResizeCallbackData) => {
            // Colappse when the width is less than or equal to collapsedWidth
            setPreferences({
              'tech-data-editor': {
                siderOpen: size.width > collapsedWidth,
                siderWidth: size.width,
              },
            });
          }}
          style={{
            border: siderOpen ? '1px solid #ddd' : undefined,
            background: siderOpen ? '#fff' : undefined,
          }}
        >
          <div className={styles.SiderActions}>
            <Button className={styles.CustomBoxButton} type="default" onClick={handleCollapse}>
              {!siderOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </Button>

            {siderOpen && (
              <Button
                type="default"
                className={styles.CustomBoxButton}
                onClick={() => {
                  if (!isOpen) {
                    expandAllNodes();
                  } else {
                    collapseAllNodes();
                  }
                }}
              >
                <FaFolderTree />
              </Button>
            )}
          </div>

          {siderOpen && !editMode && (
            <div className={styles.CustomBoxContentWrapper}>
              <Text style={{ fontWeight: 600, margin: '5px 20px', display: 'block' }}>
                Condensed Tree view
              </Text>
              <AasConfigurationTreeView
                parentConfig={parentConfig}
                editMode={editMode && editingAllowed}
                treeData={treeDataCondensed}
                expandedKeys={expandedKeys}
                onExpandedChange={(newExpanded) => {
                  setUserPreferences({
                    'tech-data-open-tree-items': [
                      ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
                      { id: parentConfig.id, open: newExpanded },
                    ],
                  });
                }}
                onChangeSelection={(selectionId) => {
                  setSelectionId(selectionId ?? '');
                  setSelectedParameterId(selectionId ?? null);
                }}
                currentLanguage={currentDisplayLanguage}
              />
            </div>
          )}
          {siderOpen && editMode && (
            <div className={styles.CustomBoxContentWrapper}>
              <Text style={{ fontWeight: 600, margin: '5px 20px', display: 'block' }}>
                Full Tree view
              </Text>
              <AasConfigurationTreeView
                parentConfig={parentConfig}
                editMode={editMode && editingAllowed}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpandedChange={(newExpanded) => {
                  setUserPreferences({
                    'tech-data-open-tree-items': [
                      ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
                      { id: parentConfig.id, open: newExpanded },
                    ],
                  });
                }}
                onChangeSelection={(selectionId) => {
                  setSelectionId(selectionId ?? '');
                  setSelectedParameterId(selectionId ?? null);
                }}
                currentLanguage={currentDisplayLanguage}
              />
            </div>
          )}
        </ResizableBox>

        <Row style={{ flexGrow: 1, flexShrink: 1, overflow: 'scroll' }}>
          <Col style={{ width: '100%', height: '100%' }}>
            <AasConfigEditor
              editMode={editMode && editingAllowed}
              editingAllowed={editingAllowed}
              onChangeEditMode={setEditMode}
              parentConfig={parentConfig}
              displayedParameters={treeToParameters(treeDataCondensed)}
              selectedParameterId={selectedParameterId}
              expandedKeys={expandedKeys}
              currentLanguage={currentDisplayLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </Col>
        </Row>
      </Layout>

      <ConfigModal
        open={isEditModalOpen}
        title={`Edit`}
        onCancel={closeEditModal}
        initialData={[
          {
            id: parentConfig.id,
            name: parentConfig.name.value ?? '',
            shortName: parentConfig.shortName.value ?? '',
            category: parentConfig.category.value ? parentConfig.category.value.split(';') : [],
            description: parentConfig.description?.value ?? '',
          },
        ]}
        onSubmit={handleEdit}
      />
    </>
  );
};

export default AasConfigContent;
