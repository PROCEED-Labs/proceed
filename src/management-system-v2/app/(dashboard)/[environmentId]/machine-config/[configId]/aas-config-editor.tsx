'use client';

import { configNameLUT, Parameter, Config } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  EyeOutlined,
  ExportOutlined,
  CaretRightOutlined,
  HomeOutlined,
  MoreOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Space,
  Tooltip,
  SelectProps,
  theme,
  Layout,
  Flex,
  Select,
  Radio,
  Collapse,
  Typography,
  App,
  Dropdown,
  Row,
  Tag,
  Col,
  Breadcrumb,
  Modal,
  Input,
  List,
} from 'antd';

import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment, useSession } from '@/components/auth-can';
import { Content, Header } from 'antd/es/layout/layout';
// import Title from 'antd/es/typography/Title';
import { spaceURL } from '@/lib/utils';
import VersionCreationButton from '@/components/version-creation-button';
import AddButton from './add-button';
import ConfigModal from '@/components/config-modal';
import ActionButtons from './action-buttons';
import {
  addMachineDataSet,
  addParentConfigVersion,
  getMachineVersions,
  getMultipleMachineVersions,
  getVersionChangeState,
  removeConfigVersion,
  updateConfigMetadata,
  updateParentConfig,
  versioningCreateNewVersion,
  addParameter as backendAddParameter,
} from '@/lib/data/db/machine-config';
import ConfirmationButton from '@/components/confirmation-button';
import { v4 } from 'uuid';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useUserPreferences } from '@/lib/user-preferences';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { MqttPublishButton } from './mqtt-publish-button';
import AasContent from './aas-config-content';
import Image from 'next/image';
import {
  configToAasFormat,
  defaultUserParameterTemplate,
  findParameter,
} from '../configuration-helper';
import { generateMachineDatasetNames, useParameterActions } from './shared-parameter-utils';
import AasCreateParameterModal, {
  CreateParameterModalReturnType,
} from './aas-create-parameter-modal';
import { useAbilityStore } from '@/lib/abilityStore';
import ReleaseButton from './release-button';
import ReleaseModal from './release-model';
import MachineDatasetVersionSelector from './machine-dataset-version-selector';
import ActionDropdown from './shared-action-dropdown';

import {
  getInitialTransformationData,
  hasNestedContent,
  useTreeExpansion,
  moveParameterUp,
  moveParameterDown,
  editParameter as editParameterUtil,
  findParameterByPath,
  openCreateModalForPath,
} from './shared-parameter-utils';
import { useCollapseItems } from './aas-config-editor-collapse';
import LanguageDropdown from './language-dropdown';
import { Localization } from '@/lib/data/locale';
import PreviewFeatureModal from '../preview-feature-modal';
const { Text } = Typography;

type MachineDataViewProps = {
  parentConfig: Config;
  displayedParameters: Parameter[];
  editMode: boolean;
  editingAllowed: boolean;
  onChangeEditMode: (isEditMode: boolean) => void;
  selectedParameterId?: string | null;
  expandedKeys: string[];
  currentLanguage: Localization;
  onLanguageChange: (language: Localization) => void;
};

const LATEST_VERSION = {
  id: '-1',
  name: 'Latest Version',
  description: '',
  versionBasedOn: '',
  createdOn: new Date(),
};

interface SearchResultItem {
  parameter: Parameter;
  parentPath: Parameter[];
}

const AasConfigEditor: React.FC<MachineDataViewProps> = ({
  parentConfig,
  displayedParameters,
  editMode,
  editingAllowed,
  onChangeEditMode,
  selectedParameterId,
  expandedKeys,
  currentLanguage,
  onLanguageChange,
}) => {
  const app = App.useApp();
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const currentNameRef = useRef(parentConfig.name);
  const ability = useAbilityStore((state) => state.ability);
  const searchInputRef = useRef<any>(null);
  const [targetParameterForCreate, setTargetParameterForCreate] = useState<Parameter | undefined>();
  const [createConfigType, setCreateConfigType] = useState<string>('');
  const [openEditModal, setOpenEditModal] = useState(false);
  const [mqttBrokerUrl, setmqttBrokerUrl] = useState<string>();
  const [mqttTopic, setmqttTopic] = useState<string>('');
  const [mqttUsername, setmqttUsername] = useState<string>('');
  const [mqttPassword, setmqttPassword] = useState<string>('');
  const [openReleaseModal, setOpenReleaseModal] = useState(false);
  const canCreateRelease = ability.can('create', 'MachineConfigRelease');
  const [availableVersions, setAvailableVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionChangeState, setVersionChangeState] = useState<{
    tdsVersionInfo: { hasChanges: boolean; currentVersion: string; nextVersion: string };
    machineDatasets: Array<{
      id: string;
      name: string;
      hasChanges: boolean;
      currentVersion: string;
      nextVersion: string;
    }>;
  } | null>(null);

  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentParameter, setCurrentParameter] = useState<Parameter | undefined>();
  const selectedVersionId = query.get('version');
  const [viewModeRootParams, setViewModeRootParams] = useState<Parameter[]>([]);
  const [allMachineVersions, setAllMachineVersions] = useState<Record<string, string[]>>({});
  const [allTDSVersions, setAllTDSVersions] = useState<string[]>([]);
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: '',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<Parameter | null>(null);
  const [internalSelectedParamId, setInternalSelectedParamId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [previousBreadcrumbPath, setPreviousBreadcrumbPath] = useState<Parameter[] | null>(null);
  const [searchSelectedParamId, setSearchSelectedParamId] = useState<string | null>(null);
  //console.log(overviewParameters);
  const [collapseRenderKey, setCollapseRenderKey] = useState(0);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const {
    createFieldOpen,
    setCreateFieldOpen,
    addParameter: baseAddParameter,
    handleDeleteConfirm,
  } = useParameterActions({
    parentConfig,
    onRefresh: () => router.refresh(),
    currentLanguage,
  });

  const selectedVersion =
    parentConfig.versions.find((version: any) => version.id === (selectedVersionId ?? '')) ??
    LATEST_VERSION;

  // TODO use FuzzySearch
  // currently only ignores capitalization
  const filterOption: Exclude<SelectProps['showSearch'], undefined | boolean>['filterOption'] = (
    input,
    option,
  ) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const setUserPreferences = useUserPreferences.use.addPreferences();
  const openTreeItemsInConfigs = useUserPreferences.use['tech-data-open-tree-items']();
  const configOpenItems = openTreeItemsInConfigs.find(({ id }) => id === parentConfig.id);

  // search function that searches through all parameters in the entire TDS
  const searchParameters = (query: string): SearchResultItem[] => {
    if (!query.trim()) {
      setIsSearching(false);
      return [];
    }

    setIsSearching(true);
    const searchTerm = query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // helper function to get display name in current language
    const getDisplayName = (param: Parameter): string => {
      const displayNameItem = param.displayName?.find((item) => item.language === currentLanguage);
      return displayNameItem?.text || '';
    };

    // helper function to check if parameter matches search
    const matchesSearch = (param: Parameter): boolean => {
      const name = param.name?.toLowerCase() || '';
      const displayName = getDisplayName(param).toLowerCase();
      const descriptionItem = param.description?.find((item) => item.language === currentLanguage);
      const description = (descriptionItem?.text || '').toLowerCase();

      return (
        name.includes(searchTerm) ||
        displayName.includes(searchTerm) ||
        description.includes(searchTerm)
      );
    };

    // search function that builds parent path
    const searchRecursive = (params: Parameter[], parentPath: Parameter[] = []) => {
      for (const param of params) {
        // if this parameter matches
        if (matchesSearch(param)) {
          results.push({
            parameter: param,
            parentPath: [...parentPath], // the parent path
          });
        }

        // continue searching
        if (param.subParameters && param.subParameters.length > 0) {
          searchRecursive(param.subParameters as Parameter[], [...parentPath, param]);
        }
      }
    };

    // search through entire parentConfig.content
    searchRecursive(parentConfig.content);

    return results;
  };

  // handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      const results = searchParameters(value);
      setSearchResults(results);
      setSearchDropdownOpen(results.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSearchResults([]);
      setIsSearching(false);
      setSearchDropdownOpen(false);
      setSelectedSearchResult(null);
    }
  };

  // clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setSearchDropdownOpen(false);
    setSelectedSearchResult(null);
    setInternalSelectedParamId(null);
    setPreviousBreadcrumbPath(null);
    setHighlightedIndex(-1);
    setSearchSelectedParamId(null);
  };

  // handle clicking on a search result
  const handleSearchResultClick = (result: SearchResultItem) => {
    // close dropdown immediately
    setSearchDropdownOpen(false);

    // force rerender of collapse items
    setCollapseRenderKey((prev) => prev + 1);

    // always keep the search selection for highlighting
    setSearchSelectedParamId(result.parameter.id);

    // check if parameter has children
    const hasChildren = result.parameter.subParameters && result.parameter.subParameters.length > 0;
    if (hasChildren) {
      // if has children, set parent as selected to switch view
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

      const parentParam = findParentOfParameter(parentConfig.content, result.parameter.id);
      if (parentParam) {
        setInternalSelectedParamId(parentParam.id);
      } else {
        // no parent found, it's root level with children
        setInternalSelectedParamId(result.parameter.id);
      }
    } else {
      // no children, keep as is
      setInternalSelectedParamId(result.parameter.id);
    }
  };

  // get the display name for a parameter
  const getParameterDisplayName = (param: Parameter): string => {
    const displayNameItem = param.displayName?.find((item) => item.language === currentLanguage);
    return displayNameItem?.text || param.name;
  };

  // breadcrumb path for a search result
  const buildSearchResultPath = (result: SearchResultItem): string => {
    const pathNames = result.parentPath.map((p) => getParameterDisplayName(p));
    pathNames.push(getParameterDisplayName(result.parameter));
    return pathNames.join(' / ');
  };

  const refreshVersionLists = async () => {
    const findMachineDatasets = (params: Parameter[]): Parameter | undefined => {
      for (const p of params) {
        if (p.name === 'MachineDatasets') {
          return p;
        }
        if (p.subParameters && p.subParameters.length > 0) {
          const found = findMachineDatasets(p.subParameters as Parameter[]);
          if (found) return found;
        }
      }
      return undefined;
    };

    const machineDatasets = findMachineDatasets(parentConfig.content);

    if (!machineDatasets || !machineDatasets.subParameters) {
      return;
    }

    const machineIds = machineDatasets.subParameters.map((sub: Parameter) => sub.id);

    try {
      const versionsList = await getMultipleMachineVersions(machineIds);
      const [versionsMap, sortedVersions] = await Promise.all([
        // array to Record format conversion
        Promise.resolve().then(() => {
          const map: Record<string, string[]> = {};
          versionsList.forEach((item: { id: string; versions: string[] }) => {
            // sort each machine's versions
            const sortedMachineVersions = item.versions.sort((a, b) => {
              const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
              const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

              if (aMajor !== bMajor) return bMajor - aMajor;
              if (aMinor !== bMinor) return bMinor - aMinor;
              return bPatch - aPatch;
            });

            map[item.id] = sortedMachineVersions;
          });
          return map;
        }),

        // extract all unique major versions from all machine datasets for TDS dropdown
        Promise.resolve().then(() => {
          const allVersions = new Set<string>();
          versionsList.forEach((item: { id: string; versions: string[] }) => {
            item.versions.forEach((version) => {
              const majorVersion = version.split('.')[0] + '.0.0';
              allVersions.add(majorVersion);
            });
          });

          // sort versions
          const sorted = Array.from(allVersions).sort((a, b) => {
            const [aMajor] = a.split('.').map(Number);
            const [bMajor] = b.split('.').map(Number);
            return bMajor - aMajor;
          });
          return sorted;
        }),
      ]);

      // update state after both operation complete
      setAllMachineVersions(versionsMap);
      setAllTDSVersions(sortedVersions);

      await fetchConfigSetVersions(sortedVersions);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    wrapServerCall({
      fn: () => getSpaceSettingsValues(environment.spaceId, 'tdsSettings'),
      onSuccess: (setting) => {
        setmqttBrokerUrl(setting.mqttSettings?.mqttUrl);
        setmqttTopic(setting.mqttSettings?.mqttTopic);
        setmqttUsername(setting.mqttSettings?.mqttUsername);
        setmqttPassword(setting.mqttSettings?.mqttPassword);
      },
      onError: (error) => {
        app.message.error(error.message);
      },
    });

    // fetch all version lists
    refreshVersionLists().catch((error) => {
      app.message.error('Failed to load version lists');
    });
  }, []);

  useEffect(() => {
    if (!editMode && allTDSVersions.length > 0) {
      fetchConfigSetVersions();
    }
  }, [editMode, parentConfig.id, allTDSVersions]);

  useEffect(() => {
    // get the root level parameters from view mode
    const getRootLevelParams = () => {
      const filterVisibleParameters = (parameters: Parameter[]): Parameter[] => {
        return parameters.reduce((acc: Parameter[], param) => {
          if (param.structureVisible) {
            acc.push(param);
          } else {
            acc.push(...filterVisibleParameters(param.subParameters as Parameter[]));
          }
          return acc;
        }, []);
      };

      return filterVisibleParameters(parentConfig.content);
    };

    setViewModeRootParams(getRootLevelParams());
  }, [parentConfig]);

  // just to ensure
  useEffect(() => {
    // to ensure that switching to edit mode, always use latest
    if (editMode && selectedVersionId && selectedVersionId !== 'latest') {
      const searchParams = new URLSearchParams(query);

      searchParams.delete('version');

      const keysToDelete: string[] = [];
      searchParams.forEach((value, key) => {
        if (key.startsWith('machineVersion_')) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => searchParams.delete(key));

      router.push(
        spaceURL(
          environment,
          `/machine-config/${parentConfig.id}${searchParams.size ? '?' + searchParams.toString() : ''}`,
        ),
      );
      router.refresh();
    }
  }, [editMode, selectedVersionId]);

  useEffect(() => {
    if (parentConfig.name !== currentNameRef.current) currentNameRef.current = parentConfig.name;
  }, [parentConfig]);

  useEffect(() => {
    // clear internal selected param
    if (
      selectedParameterId &&
      internalSelectedParamId &&
      selectedParameterId !== internalSelectedParamId
    ) {
      setInternalSelectedParamId(null);
      handleClearSearch();
    }
  }, [selectedParameterId]);

  useEffect(() => {
    // scroll to selected parameter
    if (internalSelectedParamId) {
      // small delay to ensure DOM is updated
      setTimeout(() => {
        const element = document.getElementById(`scrollref_${internalSelectedParamId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [internalSelectedParamId]);

  const editParameter = async (values: CreateParameterModalReturnType[]) => {
    if (currentParameter) {
      await editParameterUtil(currentLanguage, currentParameter, values[0], parentConfig, () => {
        setEditFieldOpen(false);
        router.refresh();
        setCurrentParameter(undefined);
      });
    }
  };
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setCurrentParameter(undefined);
  };

  // build breadcrum path for selected parameter
  const breadcrumbItems = useMemo(() => {
    const items: any[] = [
      {
        title: (
          <span>
            <HomeOutlined style={{ marginRight: 4 }} />
            {parentConfig.shortName.value || parentConfig.name.value}
          </span>
        ),
      },
    ];

    const activeParamId = internalSelectedParamId || selectedParameterId;

    if (activeParamId) {
      // recursive function to find parameter and build path
      const findParameterPath = (
        params: Parameter[],
        targetId: string,
        currentPath: Parameter[] = [],
      ): Parameter[] | null => {
        for (const param of params) {
          if (param.id === targetId) {
            return [...currentPath, param];
          }
          if (param.subParameters && param.subParameters.length > 0) {
            const found = findParameterPath(param.subParameters as Parameter[], targetId, [
              ...currentPath,
              param,
            ]);
            if (found) return found;
          }
        }
        return null;
      };

      const path = findParameterPath(parentConfig.content, activeParamId);

      if (path) {
        // if searching, save previous path
        if (internalSelectedParamId && !previousBreadcrumbPath) {
          const prevPath = selectedParameterId
            ? findParameterPath(parentConfig.content, selectedParameterId)
            : null;
          if (prevPath) {
            setPreviousBreadcrumbPath(prevPath);
          }
        }

        path.forEach((param) => {
          items.push({
            title:
              param.displayName.find((item) => item.language === currentLanguage)?.text ||
              param.name,
          });
        });
      }
    } else if (previousBreadcrumbPath && !internalSelectedParamId) {
      // restore previous path when search is cleared
      previousBreadcrumbPath.forEach((param) => {
        items.push({
          title:
            param.displayName.find((item) => item.language === currentLanguage)?.text || param.name,
        });
      });
    }

    return items;
  }, [
    selectedParameterId,
    internalSelectedParamId,
    parentConfig,
    currentLanguage,
    previousBreadcrumbPath,
  ]);

  const createConfigVersion = async (values?: {
    versionName: string;
    versionDescription: string;
  }): Promise<void> => {
    return new Promise((resolve, reject) => {
      wrapServerCall({
        fn: () =>
          versioningCreateNewVersion(
            parentConfig.id,
            values?.versionName,
            values?.versionDescription,
          ),
        onSuccess: () => {
          app.message.success({
            content: (
              <span>
                Version <em>{values?.versionName || ''}</em> successfully created
              </span>
            ),
          });
          resolve();
        },
        onError: (error) => {
          app.message.error(`Creation of version failed`);
          reject(error);
        },
      });
    });
  };

  const makeConfigVersionLatest = async () => {
    // TODO function: make version latest
    // wrapServerCall({
    //   fn: () => setParentConfigVersionAsLatest(parentConfig.version || ''),
    //   onSuccess: () => {
    //     const searchParams = new URLSearchParams(query);
    //     searchParams.delete('version');
    //     router.push(
    //       spaceURL(
    //         environment,
    //         `/machine-config/${parentConfig.id as string}${
    //           searchParams.size ? '?' + searchParams.toString() : ''
    //         }`,
    //       ),
    //     );
    //     router.refresh();
    //     app.message.success(`Version successfully set as latest`);
    //   },
    //   onError: () => {
    //     app.message.success(`There was an error setting this version as latest`);
    //   },
    // });
  };

  const showMobileView = useMobileModeler();

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 32,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    boxShadow:
      '2px 2px 6px -4px rgba(0, 0, 0, 0.12), 4px 4px 16px 0px rgba(0, 0, 0, 0.08), 6px 6px 28px 8px rgba(0, 0, 0, 0.05)',
    //border: 'none',
  };

  // TODO
  const configHeaderDropdownItems = useMemo(() => {
    const menu = [];
    // TODO rework: handling of subConfigs (target, reference, machine)
    // if (parentConfig.targetConfig === undefined) {
    menu.push({
      key: 'target-config',
      label: 'Create a Target Dataset',
      onClick: () => {
        setPreviewModalConfig({
          open: true,
          title: 'Create a Target Dataset',
          description:
            'This button can create a Target Dataset with default structures and parameters.',
        });
      },
    });
    // }
    // if (parentConfig.referenceConfig === undefined) {
    menu.push({
      key: 'reference-config',
      label: 'Create a Reference Dataset',
      onClick: () => {
        setPreviewModalConfig({
          open: true,
          title: 'Create a Reference Dataset',
          description:
            'This button can create a Reference Dataset with default structures based on the body/content parameters of the Target Dataset.',
        });
      },
    });
    // }
    menu.push({
      key: 'copy-target-to-reference',
      label: 'Update Reference Dataset',
      onClick: () => {
        setPreviewModalConfig({
          open: true,
          title: 'Update Reference Dataset with new Target Dataset parameters',
          description:
            'This button can copy all new body/content parameters of the Target Dataset to the Reference Dataset.',
        });
      },
    });
    menu.push({
      key: 'machine-config',
      label: 'Create a Machine Dataset',
      onClick: () => {
        const { name, displayName } = generateMachineDatasetNames(parentConfig);
        wrapServerCall({
          fn: () => addMachineDataSet(parentConfig, name, displayName),
          onSuccess: () => {
            app.message.success(`Machine Dataset "${displayName}" created successfully.`);
            router.refresh();
          },
          onError: (error) => {
            app.message.error(error.message);
          },
        });
      },
    });
    menu.push({
      key: 'copy-reference-to-machine',
      label: 'Update Machine Dataset',
      onClick: () => {
        setPreviewModalConfig({
          open: true,
          title: 'Update a Machine Dataset with new Reference Dataset parameters',
          description:
            'This button can copy all new body parameters of the Reference Dataset to one Machine Dataset.',
        });
      },
    });
    return menu;
  }, [parentConfig]);

  const dataDropdownItems = useMemo(() => {
    const menu = [];

    menu.push({
      key: 'org-data',
      label: 'Add Organization Data',
    });
    menu.push({
      key: 'user-data',
      label: 'Add User Data',
    });

    return menu;
  }, [parentConfig]);

  const onClickAddConfigButton = (e: any) => {
    if (!e.key) return;
    if (e.key === 'target-config') {
      setCreateConfigType('target');
    } else if (e.key === 'reference-config') {
      setCreateConfigType('reference');
    } else if (e.key === 'machine-config') {
      setCreateConfigType('machine');
    }
  };

  const onClickAddDataButton = async (e: any) => {
    if (!e.key) return;

    if (e.key === 'org-data') {
      try {
        // Path: organization -> data
        openCreateModalForPath(
          parentConfig,
          ['organization', 'data'],
          setTargetParameterForCreate,
          setCreateFieldOpen,
          (message) => app.message.error(message),
        );
      } catch (error) {
        app.message.error('Failed to open Add Org Data modal');
      }
    } else if (e.key === 'user-data') {
      try {
        // Path: identity-and-access-management -> common-user-data
        openCreateModalForPath(
          parentConfig,
          ['identity-and-access-management', 'common-user-data'],
          setTargetParameterForCreate,
          setCreateFieldOpen,
          (message) => app.message.error(message),
        );
      } catch (error) {
        app.message.error('Failed to open Add User Data modal');
      }
    }
  };

  const handleCreateConfig = async (
    values: {
      name: string;
      shortname: string;
      description: string;
      copyTarget: boolean;
    }[],
  ) => {
    const { name, shortname, description, copyTarget } = values[0];
    // TODO function: add target-, reference-, machineConfig
    if (createConfigType === 'target') {
      // await aasAddTargetConfig(
      //   parentConfig.id,
      //   defaultTargetConfiguration(parentConfig.environmentId, name, shortname, description),
      // );
    }
    if (createConfigType === 'reference') {
      // await aasAddReferenceConfig(
      //   parentConfig.id,
      //   defaultTargetConfiguration(parentConfig.environmentId, name, shortname, description),
      // );
    } else {
      // if (copyTarget && parentConfig.targetConfig) {
      //   await aasAddMachineConfig(
      //     parentConfig.id,
      //     customMachineConfiguration(
      //       parentConfig.environmentId,
      //       name,
      //       shortname,
      //       description,
      //       parentConfig.targetConfig,
      //     ),
      //     true,
      //   );
      // } else {
      //   await aasAddMachineConfig(
      //     parentConfig.id,
      //     defaultMachineConfiguration(parentConfig.environmentId, name, shortname, description),
      //   );
      // }
    }
    setCreateConfigType('');
    router.refresh();
    app.message.info('Creation modal coming back soon.');
  };

  const fetchConfigSetVersions = async (tdsVersions?: string[]) => {
    setLoadingVersions(true);
    try {
      // use provided versions or fall back to state
      const versionsToUse = tdsVersions || allTDSVersions;

      // allTDSVersions already contains only major versions
      const majorVersions = versionsToUse.map((version) => {
        const majorNum = version.split('.')[0]; // extract "3", "2", "1"
        return {
          id: majorNum,
          versionNumber: majorNum, // display as "3", "2", "1"
        };
      });
      // if there is any versions
      const hasVersions = majorVersions.length > 0;

      // latest option at the beginning even if no versions
      const versionsWithLatest = [
        {
          id: 'latest',
          versionNumber: 'Latest',
        },
        ...majorVersions,
      ];

      setAvailableVersions(versionsWithLatest);
    } catch (error) {
      console.error('Error fetching versions:', error);
      app.message.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleVersionSelect = async (versionId: string) => {
    try {
      const searchParams = new URLSearchParams(query);
      const currentVersion = searchParams.get('version');

      // if user is selecting the same version which is already selected
      const isSameVersion =
        currentVersion === versionId ||
        (!currentVersion && versionId === 'latest') ||
        (currentVersion === 'latest' && versionId === 'latest');

      if (isSameVersion) {
        return;
      }

      if (versionId === 'latest') {
        // remove version param
        searchParams.delete('version');
      } else {
        searchParams.set('version', versionId);
      }

      // always remove all machine dataset version params when main version changes
      const keysToDelete: string[] = [];
      searchParams.forEach((value, key) => {
        if (key.startsWith('machineVersion_')) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => searchParams.delete(key));

      router.push(
        spaceURL(
          environment,
          `/machine-config/${parentConfig.id}${searchParams.size ? '?' + searchParams.toString() : ''}`,
        ),
      );
      router.refresh();
    } catch (error) {
      console.error('Error loading version:', error);
      app.message.error('Failed to load selected version');
    }
  };

  // const handleSetVersionAsLatest = async () => {
  //   if (!selectedVersionId) return;

  //   try {
  //     // find all selected machine dataset versions from URL query params
  //     const searchParams = new URLSearchParams(query);

  //     // find all machine dataset selections
  //     const machineDatasetVersions: { machineDatasetId: string; version: string }[] = [];

  //     // get all query params
  //     searchParams.forEach((value, key) => {
  //       // check if this is a machine dataset version param
  //       // format: machineVersion_{datasetId} = version
  //       if (key.startsWith('machineVersion_')) {
  //         const datasetId = key.replace('machineVersion_', '');
  //         machineDatasetVersions.push({
  //           machineDatasetId: datasetId,
  //           version: value,
  //         });
  //       }
  //     });

  //     // TODO: backend call to check if current latest has changes
  //     // if it has, create new version first
  //     // const hasChanges = await versioningCheckIfTargetOrReferenceSetChanged(parentConfig.id);
  //     // if (hasChanges.hasChanges) {
  //     //   await versioningCreateNewVersionForTargetOrReferenceSet(parentConfig.id);
  //     // }

  //     // TODO: set selected version as latest
  //     // await versioningSetVersionAsLatest(
  //     //   parentConfig.id,
  //     //   selectedVersionId,
  //     //   machineDatasetVersions.length > 0 ? machineDatasetVersions : undefined
  //     // );

  //     // console.log('seting version as latst:', {
  //     //   configVersion: selectedVersionId,
  //     //   machineDatasets: machineDatasetVersions,
  //     // });

  //     app.message.success('Version successfully set as latest');

  //     // clear the query params and redirect to latest
  //     const newSearchParams = new URLSearchParams(query);
  //     newSearchParams.delete('version');

  //     // remove all machine dataset version params
  //     const keysToDelete: string[] = [];
  //     newSearchParams.forEach((value, key) => {
  //       if (key.startsWith('machineVersion_')) {
  //         keysToDelete.push(key);
  //       }
  //     });
  //     keysToDelete.forEach((key) => newSearchParams.delete(key));

  //     router.push(
  //       spaceURL(
  //         environment,
  //         `/machine-config/${parentConfig.id}${newSearchParams.size ? '?' + newSearchParams.toString() : ''}`,
  //       ),
  //     );
  //     router.refresh();
  //   } catch (error) {
  //     console.error('Error setting version as latest:', error);
  //     app.message.error('Failed to set version as latest');
  //   }
  // };

  async function handleEdit(
    values: {
      id: string;
      name: string;
      shortName: string;
      category: string[];
      description: string;
    }[],
  ) {
    const { id, name, shortName, category, description } = values[0];
    if (parentConfig.type == 'config') {
      await updateConfigMetadata(id, name, shortName, category, description);
    }
    // TODO update target-, reference-, machineConfig
    else if (parentConfig.type == 'target-config') {
      // await updateTargetConfig(id, { name, shortName, category });
    } else if (parentConfig.type == 'machine-config') {
      // await updateMachineConfig(id, { name, shortName, category });
    }
    setOpenEditModal(false);
    router.refresh();
  }

  const exportCurrentConfig = () => {
    const blob = new Blob([JSON.stringify(parentConfig, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${parentConfig?.name?.value || 1}_internal_format.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    // // determine the parent for the new parameter
    // let targetParent: Parameter | undefined = undefined;

    // if (selectedParameterId) {
    //   // find the selected parameter in the tree
    //   const findParameterInTree = (params: Parameter[], targetId: string): Parameter | null => {
    //     for (const param of params) {
    //       if (param.id === targetId) {
    //         return param;
    //       }
    //       if (param.subParameters && param.subParameters.length > 0) {
    //         const found = findParameterInTree(param.subParameters as Parameter[], targetId);
    //         if (found) return found;
    //       }
    //     }
    //     return null;
    //   };

    //   const selectedParam = findParameterInTree(parentConfig.content, selectedParameterId);
    //   if (selectedParam) {
    //     targetParent = selectedParam;
    //   }
    // } else if (currentParameter) {
    //   // if currentParameter is set (from nested add), use it
    //   targetParent = currentParameter;
    // }

    // if (targetParent) {
    //   // adding parameter as child of targetParent
    //   await baseAddParameter(values, targetParent);
    // } else {
    //   // adding root level parameter
    //   await baseAddParameter(values);
    // }

    // Priority: targetParameterForCreate > currentParameter > root level
    const targetParent = targetParameterForCreate || currentParameter;
    if (targetParent) {
      await baseAddParameter(values, targetParent);
    } else {
      // adding root level parameter
      await baseAddParameter(values);
    }
    setCurrentParameter(undefined);
    setTargetParameterForCreate(undefined);
    setCreateFieldOpen(false);
  };
  const handleDeleteConfirmGen = async () => {
    if (currentParameter) {
      await handleDeleteConfirm(currentParameter);
      setDeleteModalOpen(false);
      setCurrentParameter(undefined);
    }
  };

  const exportCurrentConfigAas = () => {
    let aasConfig = configToAasFormat(parentConfig);
    const blob = new Blob([JSON.stringify(aasConfig, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${parentConfig.name.value}_aas_export.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCurrentRootParams = () => {
    if (!editMode) {
      return displayedParameters;
    } else {
      return viewModeRootParams;
    }
  };

  const generateParameterActionDropdown = (param: Parameter) => {
    if (!editMode) return null;

    // find parent's subParameters array to determine position
    const findParentAndSiblings = (
      searchId: string,
      params: Parameter[],
    ): { siblings: Parameter[]; index: number } | null => {
      for (const p of params) {
        const idx = p.subParameters.findIndex((sub: Parameter) => sub.id === searchId);
        if (idx !== -1) {
          return { siblings: p.subParameters as Parameter[], index: idx };
        }
        if (p.subParameters && p.subParameters.length > 0) {
          const found = findParentAndSiblings(searchId, p.subParameters as Parameter[]);
          if (found) return found;
        }
      }
      return null;
    };

    // for root level params, check in displayedParameters or viewModeRootParams
    let siblings: Parameter[] = [];
    let currentIndex = -1;

    const rootParams = getCurrentRootParams();
    currentIndex = rootParams.findIndex((p) => p.id === param.id);

    if (currentIndex !== -1) {
      siblings = rootParams;
    } else {
      // search in nested structure
      const result = findParentAndSiblings(param.id, parentConfig.content);
      if (result) {
        siblings = result.siblings;
        currentIndex = result.index;
      }
    }

    const isFirst = currentIndex === 0;
    const isLast = currentIndex === siblings.length - 1;
    const dropdownId = `header-dropdown-${param.id}`;
    const isChangeable = param.changeableByUser ?? true;

    return (
      <ActionDropdown
        record={param}
        isFirst={isFirst}
        isLast={isLast}
        isOpen={openDropdowns.has(dropdownId)}
        isChangeable={isChangeable}
        onOpenChange={(open) => {
          setOpenDropdowns((prev) => {
            const newSet = new Set(prev);
            if (open) {
              newSet.add(dropdownId);
            } else {
              newSet.delete(dropdownId);
            }
            return newSet;
          });
        }}
        onMoveUp={async () => await moveParameterUp(param, parentConfig, () => router.refresh())}
        onMoveDown={async () =>
          await moveParameterDown(param, parentConfig, () => router.refresh())
        }
        onEdit={() => {
          setCurrentParameter(param);
          setEditFieldOpen(true);
        }}
        onAddNested={() => {
          setCurrentParameter(param);
          setCreateFieldOpen(true);
        }}
        onDelete={() => {
          setCurrentParameter(param);
          setDeleteModalOpen(true);
        }}
      />
    );
  };

  const { shouldSwitchView, selectedParentParam } = useMemo(() => {
    let shouldSwitch = false;
    let selectedParam: Parameter | null = null;
    const activeParamId = internalSelectedParamId || selectedParameterId;

    if (activeParamId) {
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

      const foundParam = findParameterInTree(parentConfig.content, activeParamId);

      if (foundParam) {
        selectedParam = foundParam;
        shouldSwitch = true;
        //handleClearSearch()
      }
    }

    return { shouldSwitchView: shouldSwitch, selectedParentParam: selectedParam };
  }, [selectedParameterId, internalSelectedParamId, parentConfig]);
  const activeParameterId = internalSelectedParamId || selectedParameterId;

  const collapseItems = useCollapseItems(
    editMode,
    parentConfig,
    displayedParameters,
    viewModeRootParams,
    activeParameterId,
    panelStyle,
    expandedKeys,
    onCollapseChange,
    generateParameterActionDropdown,
    currentLanguage,
    allMachineVersions,
    searchSelectedParamId,
    collapseRenderKey,
  );

  function onCollapseChange(newIds: string[]) {
    const removedItem = expandedKeys.find((item) => !newIds.includes(item));
    if (removedItem) {
      const index = expandedKeys.indexOf(removedItem);
      expandedKeys.splice(index, 1);
    } else {
      const addedItem = newIds.find((item) => !expandedKeys.includes(item));
      if (!!addedItem) expandedKeys.push(addedItem);
    }
    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: expandedKeys },
      ],
    });
    router.refresh();
  }

  const handleReleaseSuccess = async () => {
    try {
      await createConfigVersion();
      setOpenReleaseModal(false);

      // refresh version lists after creating new version
      await refreshVersionLists();
      // a small delay to ensure state updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      router.refresh();
    } catch (error) {
      app.message.error('Failed to complete release process');
    }
  };

  const configModalTitle =
    createConfigType === 'target' ? 'Create Target Tech Data Set' : 'Create Machine Tech Data Set';

  return (
    <>
      <Layout style={{ height: '100%' }}>
        <Header
          style={{
            background: '#fff',
            margin: '0 16px',
            padding: '16px 16px',
            borderRadius: borderRadiusLG,
            display: 'flex',
            alignItems: 'center',
            minHeight: '64px',
            height: 'auto',
          }}
        >
          <Flex
            align="center"
            justify="space-between"
            style={{
              width: '100%',
              flexWrap: 'wrap',
              gap: '8px 12px',
              lineHeight: '3',
            }}
          >
            {/* <div
              style={{
                flex: '1 1 250px',
                minWidth: '200px',
                maxWidth: '100%',
              }}
            >
              <Title
                level={5}
                style={{
                  margin: '0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {`${configNameLUT[parentConfig.type]}: ${parentConfig.shortName.value} - ${parentConfig.name.value}`}
                {editMode && (
                  <EditOutlined
                    style={{ margin: '0 10px' }}
                    onClick={(e) => {
                      setOpenEditModal(true);
                    }}
                  />
                )}
              </Title>
            </div> */}

            {/* Left Section */}
            <Space
              style={{
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              {/* View/Edit Toggle (leftmost) */}
              {editingAllowed && (!selectedVersionId || selectedVersionId === 'latest') && (
                <Radio.Group
                  value={editMode ? 'edit' : 'view'}
                  onChange={(e) => onChangeEditMode(e.target.value === 'edit')}
                >
                  <Radio.Button value="view">
                    <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>
                      View
                    </span>
                    <EyeOutlined
                      style={{
                        margin: window.innerWidth < 480 ? '0' : '0 0 0 8px',
                      }}
                    />
                  </Radio.Button>

                  <Radio.Button value="edit">
                    <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>
                      Edit
                    </span>
                    <EditOutlined
                      style={{
                        margin: window.innerWidth < 480 ? '0' : '0 0 0 8px',
                      }}
                    />
                  </Radio.Button>
                </Radio.Group>
              )}

              {/* Version Selector */}
              {!editMode && parentConfig.templateId && (
                <Space.Compact>
                  <Select
                    popupMatchSelectWidth={false}
                    placeholder="Select Version"
                    showSearch={{ filterOption }}
                    loading={loadingVersions}
                    style={{ minWidth: '150px' }}
                    value={selectedVersionId || 'latest'}
                    onChange={handleVersionSelect}
                    options={availableVersions.map((version) => ({
                      value: version.id,
                      label:
                        version.id === 'latest' ? (
                          <span style={{ fontStyle: 'italic' }}>{version.versionNumber}</span>
                        ) : (
                          `Version ${version.versionNumber}`
                        ),
                    }))}
                  />
                  {selectedVersionId && selectedVersionId !== 'latest' && (
                    <Tooltip title="Set this version as Latest">
                      <Button icon={<CheckOutlined />} onClick={() => setOpenPreviewModal(true)}>
                        Set as Latest
                      </Button>
                    </Tooltip>
                  )}

                  {/* {editMode && (
                  <Select
                    popupMatchSelectWidth={false}
                    placeholder="Select Version"
                    showSearch
                    filterOption={filterOption}
                    style={{ minWidth: '110px' }}
                    value={{
                      value: selectedVersion.id,
                      label: selectedVersion.name,
                    }}
                    onSelect={(_, option) => {
                      // change the version info in the query but keep other info
                      const searchParams = new URLSearchParams(query);
                      if (!option.value || option.value === '-1') searchParams.delete('version');
                      else searchParams.set(`version`, `${option.value}`);
                      router.push(
                        spaceURL(
                          environment,
                          `/machine-config/${parentConfig.id as string}${
                            searchParams.size ? '?' + searchParams.toString() : ''
                          }`,
                        ),
                      );
                    }}
                    options={[LATEST_VERSION, ...parentConfig.versions]
                      // .concat(parentConfig.versions ?? [])
                      .map(({ id, name }) => ({
                        value: id,
                        label: name,
                      }))}
                  />
                )}
                {!showMobileView && editMode && (
                  <>
                    <Tooltip title="Create New Version">
                      <VersionCreationButton
                        icon={<PlusOutlined />}
                        createVersion={createConfigVersion}
                      ></VersionCreationButton>
                    </Tooltip>
                  </>
                )} */}
                </Space.Compact>
              )}
              {/* <Space.Compact>
                <MqttPublishButton
                  mqttBrokerUrl={mqttBrokerUrl}
                  mqttTopic={mqttTopic}
                  payload={parentConfig}
                  username={mqttUsername}
                  password={mqttPassword}
                  successMessage="Send to Machines."
                />
              </Space.Compact> */}

              {/* Release Button */}
              {parentConfig.templateId &&
                (!selectedVersionId || selectedVersionId === 'latest') && (
                  <ReleaseButton
                    disabled={!canCreateRelease}
                    loading={openReleaseModal && loadingVersions}
                    onClick={async () => {
                      try {
                        const versionState = await getVersionChangeState(parentConfig.id);
                        setVersionChangeState(versionState);
                        setOpenReleaseModal(true);
                      } catch (e) {
                        app.message.error(
                          (e as Error).message || 'Failed to fetch machine versions',
                        );
                      }
                    }}
                  />
                )}

              {/* Add Data/Add or Update buttons*/}
              {editMode &&
                (parentConfig.templateId || parentConfig.configType === 'organization') && (
                  <Space.Compact>
                    {parentConfig.templateId && (
                      <AddButton
                        label="Add or Update"
                        items={configHeaderDropdownItems}
                        onClick={onClickAddConfigButton}
                      />
                    )}
                    {parentConfig.configType === 'organization' && (
                      <AddButton
                        label="Add Data"
                        items={dataDropdownItems}
                        onClick={onClickAddDataButton}
                      />
                    )}
                  </Space.Compact>
                )}
              {/* {!editingAllowed && (
                <ConfirmationButton
                  title="Are you sure you want to continue editing with this Version?"
                  description="Any changes that are not stored in another version are irrecoverably lost!"
                  tooltip="Set as latest Version and enable editing"
                  onConfirm={makeConfigVersionLatest}
                  modalProps={{
                    okText: 'Set as latest Version',
                    okButtonProps: {
                      danger: true,
                    },
                  }}
                  buttonProps={{
                    icon: <EditOutlined />,
                  }}
                >
                  Set as Latest
                </ConfirmationButton>
              )} */}
            </Space>

            {/* Center Section - Search Bar */}
            <div
              style={{
                position: 'relative',
                flex: '1 1 auto',
                minWidth: '200px',
                maxWidth: '450px',
              }}
            >
              <Dropdown
                open={searchDropdownOpen}
                onOpenChange={(open) => {
                  if (searchQuery.trim() || !open) {
                    setSearchDropdownOpen(open);
                  }
                }}
                trigger={['click']}
                popupRender={() => (
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08)',
                      maxHeight: '400px',
                      overflow: 'auto',
                      minWidth: '400px',
                      width: 'max-content',
                      maxWidth: '600px',
                    }}
                  >
                    <List
                      size="small"
                      dataSource={searchResults}
                      renderItem={(result) => (
                        <List.Item
                          onClick={() => handleSearchResultClick(result)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 16px',
                            transition: 'background 0.3s',
                            background:
                              searchResults.indexOf(result) === highlightedIndex
                                ? '#F5F5F5'
                                : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            setHighlightedIndex(searchResults.indexOf(result));
                          }}
                        >
                          <List.Item.Meta
                            title={<Text strong>{getParameterDisplayName(result.parameter)}</Text>}
                            description={
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {buildSearchResultPath(result)}
                              </Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
                placement="bottom"
                align={{
                  offset: [0, 4],
                }}
              >
                <Input
                  placeholder="Search parameters..."
                  ref={searchInputRef}
                  prefix={<SearchOutlined />}
                  onKeyDown={(e) => {
                    if (!searchDropdownOpen || searchResults.length === 0) return;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev < searchResults.length - 1 ? prev + 1 : prev,
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                      e.preventDefault();
                      handleSearchResultClick(searchResults[highlightedIndex]);
                    } else if (e.key === 'Escape') {
                      setSearchDropdownOpen(false);
                    }
                  }}
                  suffix={
                    searchQuery && (
                      <CloseCircleOutlined
                        onClick={handleClearSearch}
                        style={{ cursor: 'pointer', color: '#999' }}
                      />
                    )
                  }
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={() => {
                    if (searchResults.length > 0) {
                      setSearchDropdownOpen(true);
                    }
                  }}
                  style={{
                    width: '100%',
                  }}
                  allowClear={false}
                />
              </Dropdown>
            </div>

            {/* Right Section */}
            <Space
              style={{
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <LanguageDropdown
                  currentLanguage={currentLanguage}
                  onLanguageChange={onLanguageChange}
                />
              </div>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'export-config-internalFormat',
                      label: <div onClick={exportCurrentConfig}>Export internal format</div>,
                      icon: (
                        <Image
                          src={'/proceed-icon.png'}
                          alt="proceed logo"
                          width={22}
                          height={10}
                        />
                      ),
                    },
                    {
                      key: 'export-config-aasFormat',
                      label: <div onClick={exportCurrentConfigAas}>Export AAS format</div>,
                      icon: <Text style={{ fontSize: 10, fontWeight: 800 }}>AAS</Text>,
                    },
                  ],
                }}
              >
                <Button>
                  <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>
                    Export
                  </span>
                  <ExportOutlined
                    style={{
                      margin: window.innerWidth < 480 ? '0' : '0 0 0 12px',
                    }}
                  />
                </Button>
              </Dropdown>
            </Space>
          </Flex>
        </Header>

        <Content
          style={{
            margin: '24px 16px 0',
            padding: '16px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'auto',
            height: 'auto',
            overflow: 'auto',
          }}
        >
          {/* Breadcrumbs */}
          <Breadcrumb
            items={breadcrumbItems}
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: '6px',
              border: '1px solid #f0f0f0',
            }}
          />

          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0', marginBottom: '30px' }}>
            {parentConfig.category &&
              parentConfig.category.value.split(';').map((cat) => (
                <Space key={cat}>
                  <Tag color="orange">{cat}</Tag>
                </Space>
              ))}
          </Row>
          {/* TODO fix */}
          <>
            <Collapse
              bordered={false}
              defaultActiveKey={expandedKeys}
              activeKey={expandedKeys}
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
              style={{
                background: token.colorBgContainer,
              }}
              items={collapseItems}
              onChange={onCollapseChange}
            />
            {/* show paramters without subparametrs in a table in root view */}
            {!shouldSwitchView &&
              (() => {
                if (editMode) {
                  // Edit mode - show params with no subparameters at all (regardless of visibility)
                  const paramsWithoutSubParams = displayedParameters.filter((param) => {
                    return !param.subParameters || param.subParameters.length === 0;
                  });
                  return (
                    <AasContent
                      //contentType="header"
                      //configId={parentConfig.id}
                      //configType={'config'}
                      parentConfig={parentConfig}
                      data={paramsWithoutSubParams}
                      editingEnabled={editMode}
                      parentParameter={undefined}
                      currentLanguage={currentLanguage}
                      searchSelectedParamId={searchSelectedParamId}
                    />
                  );
                }
                // View mode - show params without visible subparameters
                const paramsWithoutSubParams = displayedParameters.filter((param) => {
                  const hasVisibleSubParams = (param.subParameters || []).some(
                    (subParam: Parameter) => subParam.structureVisible,
                  );
                  return !hasVisibleSubParams;
                });
                return (
                  <AasContent
                    //contentType="header"
                    //configId={parentConfig.id}
                    //configType={'config'}
                    parentConfig={parentConfig}
                    data={paramsWithoutSubParams}
                    editingEnabled={editMode}
                    parentParameter={undefined}
                    currentLanguage={currentLanguage}
                    searchSelectedParamId={searchSelectedParamId}
                  />
                );
              })()}
            {shouldSwitchView &&
              selectedParentParam &&
              (!selectedParentParam.subParameters ||
                selectedParentParam.subParameters.length === 0) &&
              (() => {
                // check if selected param is first level child of root
                const isFirstLevelChild = displayedParameters.some(
                  (param) => param.id === activeParameterId,
                );
                if (isFirstLevelChild) {
                  // show root view instead
                  if (editMode) {
                    const paramsWithoutSubParams = displayedParameters.filter((param) => {
                      return !param.subParameters || param.subParameters.length === 0;
                    });
                    return (
                      <AasContent
                        parentConfig={parentConfig}
                        data={paramsWithoutSubParams}
                        editingEnabled={editMode}
                        parentParameter={undefined}
                        currentLanguage={currentLanguage}
                        searchSelectedParamId={searchSelectedParamId}
                      />
                    );
                  } else {
                    const paramsWithoutSubParams = displayedParameters.filter((param) => {
                      const hasVisibleSubParams = (param.subParameters || []).some(
                        (subParam: Parameter) => subParam.structureVisible,
                      );
                      return !hasVisibleSubParams;
                    });
                    return (
                      <AasContent
                        parentConfig={parentConfig}
                        data={paramsWithoutSubParams}
                        editingEnabled={editMode}
                        parentParameter={undefined}
                        currentLanguage={currentLanguage}
                        searchSelectedParamId={searchSelectedParamId}
                      />
                    );
                  }
                }
              })()}
          </>
          {/* Row: Add Meta/Parameter */}
          {/* {editMode && editingAllowed && (
            <Row gutter={[24, 24]} align="middle" style={{ marginLeft: '-12px', marginTop: '20px' }}>
              <Col span={21} className="gutter-row">
                <AddButton
                  label={'Add Parameter'}
                  onClick={() => {
                    setCurrentParameter(undefined);
                    setCreateFieldOpen(true);
                  }}
                />
              </Col>
            </Row>
          )} */}
        </Content>
      </Layout>

      {/* to be tested*/}
      {/* <ConfigModal
        open={!!createConfigType}
        title={configModalTitle}
        onCancel={() => setCreateConfigType('')}
        onSubmit={handleCreateConfig}
        configType={createConfigType}
        targetConfigExists={false}
      /> */}

      <AasCreateParameterModal
        // title={contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        title={'Create'}
        open={createFieldOpen}
        onCancel={() => {
          setCreateFieldOpen(false);
          setTargetParameterForCreate(undefined);
        }}
        onSubmit={addParameter}
        okText="Create"
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />

      <ConfigModal
        open={openEditModal}
        title={`Edit`}
        onCancel={() => setOpenEditModal(false)}
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

      <ReleaseModal
        open={openReleaseModal}
        onCancel={() => setOpenReleaseModal(false)}
        onRelease={handleReleaseSuccess}
        parentConfig={parentConfig}
        mqttBrokerUrl={mqttBrokerUrl}
        mqttTopic={mqttTopic}
        mqttUsername={mqttUsername}
        mqttPassword={mqttPassword}
        versionChangeState={versionChangeState}
      />
      <AasCreateParameterModal
        title={'Edit Parameter'}
        open={editFieldOpen}
        onCancel={() => {
          setEditFieldOpen(false);
          setCurrentParameter(undefined);
        }}
        onSubmit={editParameter}
        okText="Save"
        valueTemplateSource={
          currentParameter && 'valueTemplateSource' in currentParameter
            ? (currentParameter as any).valueTemplateSource
            : undefined
        }
        initialData={
          currentParameter
            ? [
                {
                  name: currentParameter.name || '',
                  value:
                    'valueTemplateSource' in currentParameter &&
                    (currentParameter as any).valueTemplateSource !== 'none'
                      ? (parentConfig as any)[(currentParameter as any).valueTemplateSource]
                          ?.value || ''
                      : currentParameter.value || '',
                  unit: currentParameter.unitRef || '',
                  displayName: currentParameter.displayName || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  description: currentParameter.description || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  ...getInitialTransformationData(currentParameter),
                  parameterType: currentParameter.parameterType || 'none',
                  structureVisible:
                    currentParameter.structureVisible !== undefined
                      ? currentParameter.structureVisible
                        ? 'yes'
                        : 'no'
                      : 'yes',
                  valueTemplateSource:
                    'valueTemplateSource' in currentParameter
                      ? (currentParameter as any).valueTemplateSource
                      : 'none',
                  origin: currentParameter.origin || '',
                },
              ]
            : []
        }
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />

      <Modal
        open={deleteModalOpen}
        title={'Deleting ' + currentParameter?.name}
        onOk={handleDeleteConfirmGen}
        onCancel={closeDeleteModal}
      >
        <p>
          Are you sure you want to delete the parameter <b>{currentParameter?.name}</b> with ID{' '}
          <em>{currentParameter?.id}</em>?
        </p>
      </Modal>

      <PreviewFeatureModal
        open={previewModalConfig.open}
        onClose={() => setPreviewModalConfig({ open: false, title: '', description: '' })}
        title={previewModalConfig.title}
        description={previewModalConfig.description}
      />
      <PreviewFeatureModal
        open={openPreviewModal}
        onClose={() => setOpenPreviewModal(false)}
        title="Set this version as Latest"
        description="This button can be used to set the selected version as the Latest version. This makes it possible to modify the selected version again."
      />
    </>
  );
};
export default AasConfigEditor;
