import { create } from 'zustand';
import { ProcessListProcess, ContextActions } from './types';
import { FC, PropsWithChildren } from 'react';
import { Dropdown, MenuProps } from 'antd';
import { useAbilityStore } from '@/lib/abilityStore';
import { DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Folder } from '@/lib/data/folder-schema';
import SpaceLink from '../space-link';
import { IoOpenOutline } from 'react-icons/io5';
import { GrDocumentUser } from 'react-icons/gr';
import { PiDownloadSimple, PiNotePencil } from 'react-icons/pi';
import { LuNotebookPen } from 'react-icons/lu';
import { BsFileEarmarkCheck } from 'react-icons/bs';
import { RiFolderTransferLine } from 'react-icons/ri';
import { IoMdCopy } from 'react-icons/io';
import { canDoActionOnResource } from './helpers';

export const contextMenuStore = create<{
  setSelected: (id: ProcessListProcess[]) => void;
  selected: ProcessListProcess[];
}>((set) => ({
  setSelected: (item) => set({ selected: item }),
  selected: [],
}));

const ContextMenuArea: FC<
  PropsWithChildren<{
    processActions: ContextActions;
    folder: Folder;
    prefix?: MenuProps['items'];
    suffix?: MenuProps['items'];
  }>
> = ({
  children,
  processActions: {
    viewDocumentation,
    changeMetaData,
    releaseProcess,
    share,
    exportProcess: download,
    moveItems,
    copyItems: copyItem,
    deleteItems,
  },
  folder,
  prefix,
  suffix,
}) => {
  const setSelectedContextMenuItem = contextMenuStore((store) => store.setSelected);
  const selectedContextMenuItems = contextMenuStore((store) => store.selected);
  const ability = useAbilityStore((state) => state.ability);

  const contextMenuItems: MenuProps['items'] = [];
  if (selectedContextMenuItems.length > 0) {
    const children: MenuProps['items'] = [];

    // Options when right clicking a single process that can be edited
    if (
      selectedContextMenuItems.length === 1 &&
      selectedContextMenuItems[0].type == 'process' &&
      canDoActionOnResource(selectedContextMenuItems, 'update', ability)
    ) {
      children.push(
        {
          key: 'view-docs',
          icon: <GrDocumentUser />,
          label: <>View Process Documentation</>,
          onClick: () => viewDocumentation(selectedContextMenuItems[0]),
        },
        {
          key: 'open-selected',
          icon: <PiNotePencil />,
          label: (
            <SpaceLink href={`/processes/${selectedContextMenuItems[0].id}`}>Open Editor</SpaceLink>
          ),
        },
        {
          key: 'open-selected-new-tab',
          icon: <IoOpenOutline />,
          label: (
            <SpaceLink href={`/processes/${selectedContextMenuItems[0].id}`} target="_blank">
              Open Editor in new Tab
            </SpaceLink>
          ),
        },
        {
          key: 'change-meta-data',
          icon: <LuNotebookPen />,
          label: 'Change Meta Data',
          onClick: () => changeMetaData(selectedContextMenuItems[0]),
        },
        {
          key: 'release-process',
          icon: <BsFileEarmarkCheck />,
          label: 'Release Process',
          onClick: () => releaseProcess(selectedContextMenuItems[0]),
        },
        {
          key: 'share',
          icon: <ShareAltOutlined />,
          label: 'Share',
          onClick: () => share(selectedContextMenuItems[0]),
        },
      );
    }

    // Options when right clicking a process when at least one non-folder item is selected and
    // processes can be created by the user
    if (
      selectedContextMenuItems.find((item) => item.type !== 'folder') &&
      ability.can('create', 'Process')
    ) {
      children.push({
        key: 'copy-selected',
        label: 'Copy',
        icon: <IoMdCopy />,
        onClick: () => copyItem(selectedContextMenuItems),
      });
      children.push({
        key: 'export-selected',
        label: 'Download',
        icon: <PiDownloadSimple />,
        onClick: () => download(selectedContextMenuItems),
      });
    }

    // Options when the right clicked item(s) can be updated
    if (canDoActionOnResource(selectedContextMenuItems, 'update', ability))
      children.push({
        key: 'move-selected',
        label: 'Move to Folder',
        icon: <RiFolderTransferLine />,
        onClick: () => moveItems(selectedContextMenuItems),
      });
    if (canDoActionOnResource(selectedContextMenuItems, 'delete', ability))
      children.push({
        key: 'delete-selected',
        label: 'Delete',
        icon: <DeleteOutlined />,
        onClick: () => deleteItems(selectedContextMenuItems),
      });

    // Options that should always be shown
    contextMenuItems.push(
      {
        type: 'group',
        label: (
          <span
            style={{
              display: 'block',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {selectedContextMenuItems.length > 1
              ? `${selectedContextMenuItems.length} selected`
              : selectedContextMenuItems[0].name.value}
          </span>
        ),
        children,
        style: {
          textOverflow: 'ellipsis',
        },
      },
      // Horizontal Bar,

      {
        key: 'item-divider-1',
        type: 'divider',
      },
    );
  }

  return (
    <Dropdown
      menu={{
        items: [...(prefix || []), ...contextMenuItems, ...(suffix || [])],
        style: {
          maxWidth: '40ch',
          whiteSpace: 'nowrap',
        },
      }}
      trigger={['contextMenu']}
      onOpenChange={(open) => {
        if (!open) setSelectedContextMenuItem([]);
      }}
    >
      {children}
    </Dropdown>
  );
};

export default ContextMenuArea;
