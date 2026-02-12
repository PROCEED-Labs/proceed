'use client';

import styles from '@/components/item-list-view.module.scss';

import {
  Button,
  Grid,
  Dropdown,
  TableColumnsType,
  Tooltip,
  Row,
  TableColumnType,
  Upload,
} from 'antd';
import { FileOutlined } from '@ant-design/icons';
import { AiOutlinePlus } from 'react-icons/ai';
import { useAbilityStore } from '@/lib/abilityStore';
import Bar from '@/components/bar';
import SelectionActions from '@/components/selection-actions';
import { useCallback, useState } from 'react';
import { AasJson, AasJsonZod, Config } from '@/lib/data/machine-config-schema';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import { useRouter } from 'next/navigation';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import ConfigCreationButton from '@/components/config-creation-button';
import { App } from 'antd';
import SpaceLink from '@/components/space-link';
import {
  CopyOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined as FileFilled,
} from '@ant-design/icons';
import {
  addParentConfig,
  copyParentConfig,
  removeParentConfiguration,
  updateConfigMetadata,
  addAasData,
} from '@/lib/data/db/machine-config';

import AddUserControls from '@/components/add-user-controls';
import { useAddControlCallback } from '@/lib/controls-store';
import ConfirmationButton from '@/components/confirmation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import { generateDateString } from '@/lib/utils';
import ConfigModal from '@/components/config-modal';
import { defaultParameter } from './configuration-helper';
import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import { validate } from 'uuid';
import AasConfigCreationButton from '@/components/aas-config-creation-button';
import PreviewFeatureModal from './preview-feature-modal';
import OrganizationConfigCreationButton from '@/components/organization-config-creation-button';

type InputItem = Config;
export type ParentConfigListConfigs = ReplaceKeysWithHighlighted<InputItem, 'name'>;

type ConfigListProps = {
  data: InputItem[];
};

const getNameValue = (name: any): string => {
  if (typeof name?.value === 'string') return name.value;
  return name?.value?.value || '';
};

const ParentConfigList: React.FC<ConfigListProps> = ({ data }) => {
  const originalConfigs = data;
  const router = useRouter();
  const space = useEnvironment();
  const breakpoint = Grid.useBreakpoint();
  data = data.filter(function (element) {
    return element !== undefined && element.configType === 'default';
  });
  //console.log(data);

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data,
    keys: ['shortName.value', 'name.value.value', 'description.value', 'category.value'] as any[],
    highlightedKeys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
    fuseOptions: {
      threshold: 0.3,
      ignoreLocation: true,
      findAllMatches: true,
    },
  });

  const { message } = App.useApp();

  const [selectedRowElements, setSelectedRowElements] = useState<ParentConfigListConfigs[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const [copySelection, setCopySelection] = useState<ParentConfigListConfigs[]>([]);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ParentConfigListConfigs | null>(null);
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const ability = useAbilityStore((state) => state.ability);
  const defaultDropdownItems = [];

  async function deleteItems(items: ParentConfigListConfigs[]) {
    const failed = (
      await asyncMap(items, async ({ id }) => {
        try {
          await removeParentConfiguration(id);
        } catch (err) {
          return data.find(({ id: pId }) => pId === id);
        }
      })
    )
      .filter((res) => !!res)
      .map((res) => (res as Config).name);

    if (failed.length) {
      message.open({
        type: 'error',
        content: `Something went wrong while deleting ${failed.join(', ')}.`,
      });
    }

    setSelectedRowElements([]);
    router.refresh();
  }

  if (ability && ability.can('create', 'MachineConfig')) {
    // defaultDropdownItems.push({
    //   key: 'create-aas-machine-config',
    //   label: <AasConfigCreationButton wrapperElement="New: Tech Data Set Template" />,
    //   icon: <FileOutlined />,
    // });
    defaultDropdownItems.push({
      key: 'create-machine-config',
      label: <ConfigCreationButton wrapperElement="New: Empty" />,
      icon: <FileOutlined />,
    });
    defaultDropdownItems.push({
      key: 'create-organization-config',
      label: <OrganizationConfigCreationButton wrapperElement="New: Organization (test)" />,
      icon: <FileOutlined />,
    });
  }

  useAddControlCallback(
    'machineconfig-list',
    'selectall',
    (e) => {
      e.preventDefault();
      setSelectedRowElements(filteredData ?? []);
    },
    { dependencies: [originalConfigs] },
  );
  useAddControlCallback('machineconfig-list', 'esc', () => setSelectedRowElements([]));
  useAddControlCallback('machineconfig-list', 'del', () => setOpenDeleteModal(true));

  const exportItems = (items: ParentConfigListConfigs[]) => {
    const dataToExport = items.map((item) => ({
      ...item,
      name: { value: getNameValue(item.name), linkValueToParameterValue: [] },
    })) as unknown as Config[];

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download =
      items.length > 1 ? `exported_items.json` : `${getNameValue(items[0].name)}_export.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const actionBarGenerator = useCallback(
    (record: any) => {
      const resource = record.type === 'folder' ? { Folder: record } : { Process: record };

      return (
        <>
          {/* {record.type !== 'folder' && (
            <AuthCan {...resource} create>
              <Tooltip placement="top" title={'Copy'}>
                <CopyOutlined
                  onClick={(e) => {
                    // e.stopPropagation();
                    copyItem([record]);
                  }}
                />
              </Tooltip>
            </AuthCan>
          )} */}

          {record.type !== 'folder' && (
            <Tooltip placement="top" title={'Export'}>
              <ExportOutlined onClick={() => exportItems([record])} />
            </Tooltip>
          )}

          <AuthCan {...resource} update>
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined onClick={() => editItem(record)} />
            </Tooltip>
          </AuthCan>

          <AuthCan delete {...resource}>
            <Tooltip placement="top" title={'Delete'}>
              <>
                <ConfirmationButton
                  title={`Delete ${record.type === 'folder' ? 'Folder' : 'Process'}`}
                  description="Are you sure you want to delete the selected process?"
                  onConfirm={() => deleteItems([record])}
                  buttonProps={{
                    icon: <DeleteOutlined />,
                    type: 'text',
                  }}
                />
              </>
            </Tooltip>
          </AuthCan>
        </>
      );
    },
    [copyItem, deleteItems, editItem, exportItems],
  );

  function copyItem(items: ParentConfigListConfigs[]) {
    setCopySelection(items);
    setSelectedRowElements(items);
    setOpenCopyModal(true);
    // console.log(copySelection);
  }

  function editItem(item: ParentConfigListConfigs) {
    setEditingItem(item);
    setSelectedRowElements([item]);
    setOpenEditModal(true);
  }

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
    await updateConfigMetadata(id, name, shortName, category, description);
    setOpenEditModal(false);
    router.refresh();
  }

  /**
   * copy multiple items
   * @param values List of Value-objects, each containing an ID of a config from which values are to be copied
   */
  async function handleCopy(
    values: {
      name: string;
      shortName: string;
      category: string[];
      description: string;
      originalId: string;
    }[],
  ): Promise<void> {
    await asyncForEach(values, async (valueFromModal) => {
      copyParentConfig(
        valueFromModal.originalId,
        space.spaceId,
        valueFromModal.name,
        valueFromModal.shortName,
        valueFromModal.category,
        valueFromModal.description,
      );
    });
    setOpenCopyModal(false);
    router.refresh();
  }

  const importItems = async (file: File) => {
    try {
      const text = await file.text();
      const importedData: Config[] | Config = JSON.parse(text); //TODO PARSE SCHEMA

      if (Array.isArray(importedData)) {
        await asyncForEach(importedData, async (item) => {
          if (!validate(item.id)) throw new Error(`Invalid UUID: ${item.id}`);
          const add_return = await addParentConfig(item, space.spaceId);
          if ('error' in add_return) {
            throw add_return.error.message;
          }
        });
      } else {
        if (!validate(importedData.id)) throw new Error(`Invalid UUID: ${importedData.id}`);
        const add_return = await addParentConfig(importedData, space.spaceId);
        if ('error' in add_return) {
          throw add_return.error.message;
        }
      }

      message.success('Import successful');
      router.refresh();
    } catch (error) {
      message.error(`Import failed: ${error}`);
      console.error('Error importing items:', error);
    }
  };

  const importAASItem = async (file: File) => {
    // TODO
    try {
      const text = await file.text();
      const importedData: AasJson = JSON.parse(text);
      AasJsonZod.parse(importedData);
      const add_return = await addAasData(importedData, space.spaceId);
      if ('error' in add_return) {
        throw add_return.error.message;
      }
      message.success('Import successful');
      router.refresh();
    } catch (error) {
      message.error(`Import failed: ${error}`);
      console.error('Error importing items:', error);
    }
  };

  const addPreferences = useUserPreferences.use.addPreferences();
  const selectedColumns = useUserPreferences.use['columns-in-table-view-process-list']();
  const columns: TableColumnsType<ParentConfigListConfigs> = [
    {
      title: 'ID',
      dataIndex: 'shortName',
      key: 'shortName',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {record.shortName.value || 'N/A'}
        </SpaceLink>
      ),
      sorter: (a, b) => (a.shortName.value || '').localeCompare(b.shortName.value || ''),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          <div
            className={
              breakpoint.xs
                ? styles.MobileTitleTruncation
                : breakpoint.xl
                  ? styles.TitleTruncation
                  : styles.TabletTitleTruncation
            }
            style={{
              // overflow: 'hidden',
              // whiteSpace: 'nowrap',
              // textOverflow: 'ellipsis',
              // TODO: color
              color: undefined,
              fontStyle: undefined,
            }}
          >
            {<FileFilled />}
            {getNameValue(record.name) || 'N/A'}
            {/* {record.name.highlighted} */}
          </div>
        </SpaceLink>
      ),
      sorter: (a, b) => getNameValue(a.name).localeCompare(getNameValue(b.name)),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Categories',
      dataIndex: 'category',
      key: 'categories',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {record.category?.value ? record.category.value.split(';').join(', ') : ''}
        </SpaceLink>
      ),
      //responsive: ['md'],
    },
    {
      title: 'Description',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {record.description.value ?? ''}
        </SpaceLink>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Version',
      dataIndex: 'versions',
      key: 'version',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {Array.isArray(record.versions) ? `v${record.versions.length}` : 'v1'}
        </SpaceLink>
      ),
      // sorter: (a, b) => {
      //   const aVersion = Array.isArray(a.versions) ? a.versions.length : 1;
      //   const bVersion = Array.isArray(b.versions) ? b.versions.length : 1;
      //   return aVersion - bVersion;
      // },
      //responsive: ['md'],
    },
    {
      title: 'hasChanges',
      dataIndex: 'change',
      key: 'change',
      render: (_, record) => {
        const color = record.hasChanges ? '#3b82f6' : '#9ca3af';

        return (
          <SpaceLink
            href={`/machine-config/${record.id}`}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
              }}
            />
            {record.hasChanges ? 'yes' : 'no'}
          </SpaceLink>
        );
      },
    },
    {
      title: 'Last Edited',
      dataIndex: 'lastEdited',
      key: 'Last Edited',
      render: (_, record) => (
        <SpaceLink
          href={`/machine-config/${record.id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {generateDateString(record.lastEditedOn, true) ?? ''}
        </SpaceLink>
      ),
      sorter: (a, b) => new Date(b.lastEditedOn).getTime() - new Date(a.lastEditedOn).getTime(),
      sortDirections: ['ascend', 'descend'],
      responsive: ['md'],
    },
  ];

  return (
    <>
      <Bar
        leftNode={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {!breakpoint.xs && (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: defaultDropdownItems,
                  }}
                >
                  <Button type="primary" icon={<AiOutlinePlus />}>
                    New
                  </Button>
                </Dropdown>
              )}

              {/* {!breakpoint.xs && (
                <Upload
                  accept=".json"
                  showUploadList={false}
                  beforeUpload={(file: File) => {
                    importItems(file);
                    return false; // Prevent automatic upload
                  }}
                >
                  <Button type="default" style={{ margin: '0 10px' }}>
                    Import Config
                  </Button>
                </Upload>
              )}

              {!breakpoint.xs && (
                <Upload
                  accept=".json"
                  showUploadList={false}
                  beforeUpload={(file: File) => {
                    importAASItem(file);
                    return false; // Prevent automatic upload
                  }}
                >
                  <Button type="default" style={{ margin: '0 10px' }}>
                    Import AAS TDS
                  </Button>
                </Upload>
              )}

              {!breakpoint.xs && (
                <Button
                  type="default"
                  style={{ margin: '0 10px' }}
                  onClick={() => setOpenPreviewModal(true)}
                >
                  Import AAS Submodel
                </Button>
              )} */}

              <SelectionActions count={selectedRowKeys.length}>
                <Tooltip placement="top" title={'Export'}>
                  <ExportOutlined
                    style={{ margin: '0 8px' }}
                    onClick={() => exportItems(selectedRowElements)}
                  />
                </Tooltip>
                <Tooltip placement="top" title={'Delete'}>
                  <>
                    <ConfirmationButton
                      title="Delete Configuration"
                      externalOpen={openDeleteModal}
                      onExternalClose={() => setOpenDeleteModal(false)}
                      description="Are you sure you want to delete the selected configuration(s)?"
                      onConfirm={() => deleteItems(selectedRowElements)}
                      buttonProps={{
                        icon: <DeleteOutlined />,
                        type: 'text',
                      }}
                    />
                  </>
                </Tooltip>
              </SelectionActions>
            </span>
          </span>
        }
        searchProps={{
          onChange: (e) => setSearchTerm(e.target.value),
          onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
          placeholder: 'Search Configurations ...',
        }}
      />
      <ElementList
        data={filteredData as unknown as ParentConfigListConfigs[]}
        columns={columns}
        elementSelection={{
          selectedElements: selectedRowElements,
          setSelectionElements: setSelectedRowElements,
        }}
        selectableColumns={{
          allColumnTitles: [] as string[],
          setColumnTitles: (cols) => {
            if (typeof cols === 'function')
              cols = cols(selectedColumns.map((col: any) => col.name) as string[]);
            addPreferences({ 'process-list-columns-desktop': cols });
          },
          selectedColumnTitles: selectedColumns.map((col: any) => col.name) as string[],
          //allColumnTitles: ['Description', 'LastEdited'],
          columnProps: {
            width: 'fit-content',
            responsive: ['xl'],
            render: (id, record) => (
              <Row justify="space-evenly" className={styles.HoverableTableCell}>
                {actionBarGenerator(record)}
              </Row>
            ),
          },
        }}
      />

      <AddUserControls name={'machineconfig-list'} />
      <ConfigModal
        open={openEditModal}
        title={`Edit Config${selectedRowKeys.length > 1 ? 'urations' : ''}`}
        onCancel={() => setOpenEditModal(false)}
        initialData={
          editingItem
            ? [
                {
                  id: editingItem.id,
                  name: getNameValue(editingItem.name),
                  shortName: editingItem.shortName.value ?? '',
                  category: editingItem.category.value ? editingItem.category.value.split(';') : [],
                  description: editingItem.description.value ?? '',
                },
              ]
            : []
        }
        onSubmit={handleEdit}
      />

      <ConfigModal
        open={openCopyModal}
        title={`Copy Machine Config${selectedRowKeys.length > 1 ? 'urations' : ''}`}
        onCancel={() => setOpenCopyModal(false)}
        initialData={copySelection.map((config) => ({
          id: config.id,
          name: `${getNameValue(config.name)} (Copy)`,
          shortName: `${config.shortName.value} (Copy)`,
          category: config.category.value ? config.category.value.split(';') : [],
          description: config.description.value ?? '',
          originalId: config.id,
        }))}
        onSubmit={handleCopy}
      />
      <PreviewFeatureModal
        open={openPreviewModal}
        onClose={() => setOpenPreviewModal(false)}
        title="Import AAS Submodel"
        description="This button can be used to import new AAS-based submodels that enable new standard structures and parameters."
      />
    </>
  );
};

export default ParentConfigList;
