'use client';

import styles from '@/components/item-list-view.module.scss';

import { Button, Grid, Dropdown, TableColumnsType } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { AiOutlinePlus } from 'react-icons/ai';
import { useAbilityStore } from '@/lib/abilityStore';
import Bar from '@/components/bar';
import SelectionActions from '@/components/selection-actions';
import { useCallback, useState } from 'react';
import { MachineConfigMetadata } from '@/lib/data/machine-config-schema';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import ElementList from '@/components/item-list-view';
import { useRouter } from 'next/navigation';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import FolderCreationButton from '@/components/folder-creation-button';
import MachineConfigCreationButton from '@/components/machine-config-creation-button';
import { ComponentProps, useTransition } from 'react';
import { Tooltip, App } from 'antd';
import SpaceLink from '@/components/space-link';
import {
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined as FolderFilled,
  FileOutlined as FileFilled,
} from '@ant-design/icons';
import { deleteMachineConfigs } from '@/lib/data/legacy/machine-config';
import ConfirmationButton from '@/components/confirmation-button';
import { Folder } from '@/lib/data/folder-schema';
import {
  deleteFolder,
  moveIntoFolder,
  updateFolder as updateFolderServer,
} from '@/lib/data/folders';

import AddUserControls from '@/components/add-user-controls';
import FolderModal from '@/components/folder-modal';
import { useAddControlCallback } from '@/lib/controls-store';

type InputItem = MachineConfigMetadata | (Folder & { type: 'folder' });
export type MachineConfigListConfigs = ReplaceKeysWithHighlighted<
  InputItem,
  'name' | 'description'
>;

const MachineConfigList = ({
  data,
  params,
}: {
  data: InputItem[];
  params: {
    environmentId: string;
  };
}) => {
  const originalConfigs = data;
  const router = useRouter();
  const space = useEnvironment();
  const breakpoint = Grid.useBreakpoint();
  data = data.filter(function (element) {
    return element !== undefined;
  });
  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data,
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const { message } = App.useApp();

  const [selectedRowElements, setSelectedRowElements] = useState<MachineConfigListConfigs[]>([]);
  const [updatingFolder, startUpdatingFolderTransition] = useTransition();
  const [updateFolderModal, setUpdateFolderModal] = useState<Folder | undefined>(undefined);
  const [copySelection, setCopySelection] = useState<MachineConfigListConfigs[]>([]);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [movingItem, startMovingItemTransition] = useTransition();
  const selectedRowKeys = selectedRowElements.map((element) => element.id);

  const ability = useAbilityStore((state) => state.ability);
  const defaultDropdownItems = [];

  async function deleteItems(items: MachineConfigListConfigs[]) {
    const promises = [];

    const folderIds = items.filter((item) => item.type === 'folder').map((item) => item.id);
    const folderPromise = folderIds.length > 0 ? deleteFolder(folderIds, space.spaceId) : undefined;
    if (folderPromise) promises.push(folderPromise);

    const machineConfigIds = items.filter((item) => item.type !== 'folder').map((item) => item.id);
    const machineConfigPromise = deleteMachineConfigs(machineConfigIds, space.spaceId);
    if (machineConfigPromise) promises.push(machineConfigPromise);

    await Promise.allSettled(promises);

    const machineConfigsResult = await machineConfigPromise;
    const folderResult = await folderPromise;

    if (
      (folderResult && 'error' in folderResult) ||
      (machineConfigsResult && 'error' in machineConfigsResult)
    ) {
      return message.open({
        type: 'error',
        content: 'Something went wrong',
      });
    }

    setSelectedRowElements([]);
    router.refresh();
  }

  function copyItem(items: MachineConfigListConfigs[]) {
    setOpenCopyModal(true);
    setCopySelection(items);
  }

  function editItem(item: MachineConfigListConfigs) {
    if (item.type === 'folder') {
      const folder = data.find((machineConfig) => machineConfig.id === item.id) as Folder;
      setUpdateFolderModal(folder);
    } else {
      setOpenEditModal(true);
      setSelectedRowElements([item]);
    }
  }

  const moveItems = (...[items, folderId]: Parameters<typeof moveIntoFolder>) => {
    startMovingItemTransition(async () => {
      try {
        const response = await moveIntoFolder(items, folderId);

        if (response && 'error' in response) throw new Error();

        router.refresh();
      } catch (e) {
        message.open({
          type: 'error',
          content: `Someting went wrong`,
        });
      }
    });
  };

  if (ability && ability.can('create', 'MachineConfig'))
    defaultDropdownItems.push({
      key: 'create-machine-config',
      label: <MachineConfigCreationButton wrapperElement="Create Machine Configuration" />,
      icon: <FileOutlined />,
    });

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
  useAddControlCallback('machineconfig-list', 'copy', () => setCopySelection(selectedRowElements));
  useAddControlCallback('machineconfig-list', 'paste', () => setOpenCopyModal(true));

  function deleteHandle() {
    deleteItems(selectedRowElements).then((res) => {});
  }

  const columns: TableColumnsType<MachineConfigListConfigs> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <SpaceLink
          href={
            record.type === 'folder'
              ? `/machine-config/folder/${record.id}`
              : `/machine-config/${record.id}`
          }
          style={{
            color: 'inherit' /* or any color you want */,
            textDecoration: 'none' /* removes underline */,
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
            {record.type === 'folder' ? <FolderFilled /> : <FileFilled />} {record.name.highlighted}
          </div>
        </SpaceLink>
      ),
      // sorter: (a, b) => a.name.value.localeCompare(b.name.value),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      // sorter: (a, b) => a.name.value.localeCompare(b.name.value),
      render: (_, record) => (
        <SpaceLink
          href={
            record.type === 'folder'
              ? `/machine-config/folder/${record.id}`
              : `/machine-config/${record.id}`
          }
          style={{
            color: 'inherit' /* or any color you want */,
            textDecoration: 'none' /* removes underline */,
            display: 'block',
          }}
        >
          {(record.description.value ?? '').length == 0 ? (
            <>&emsp;</>
          ) : (
            record.description.highlighted
          )}
          {/* Makes the link-cell clickable, when there is no description */}
          {/* </div> */}
        </SpaceLink>
      ),
      responsive: ['sm'],
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
            </span>
            <SelectionActions count={selectedRowKeys.length}>
              {/* <Button style={{ marginLeft: '4px' }}>Create Folder with Selection</Button> */}
              <Button onClick={deleteHandle} style={{ marginLeft: '4px' }}>
                Delete Selected Items
              </Button>
            </SelectionActions>

            {/*<span>
                <Space.Compact className={breakpoint.xs ? styles.MobileToggleView : undefined}>
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
              </span>*/}
          </span>
        }
        searchProps={{
          onChange: (e) => setSearchTerm(e.target.value),
          onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
          placeholder: 'Search Machine Configurations ...',
        }}
      />
      <ElementList
        data={filteredData as unknown as MachineConfigListConfigs[]}
        columns={columns}
        elementSelection={{
          selectedElements: selectedRowElements,
          setSelectionElements: setSelectedRowElements,
        }}
        /*selectableColumns={{
          setColumnTitles: (cols) => {
            if (typeof cols === 'function') cols = cols(selectedColumns as string[]);

            addPreferences({ 'process-list-columns-desktop': cols });
          },
          selectedColumnTitles: selectedColumns as string[],
          allColumnTitles: ColumnHeader,
          columnProps: {
            width: 'fit-content',
            responsive: ['xl'],
            render: (id, record) =>
                <Row justify="space-evenly" className={styles.HoverableTableCell}>
                  {actionBarGenerator(record)}
                </Row>
          },
        }}*/
      />
      <AddUserControls name={'machineconfig-list'} />
    </>
  );
};

export default MachineConfigList;
