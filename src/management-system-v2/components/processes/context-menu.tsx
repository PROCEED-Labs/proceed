import { create } from 'zustand';
import { ProcessActions, ProcessListProcess, canDeleteItems } from '.';
import { FC, PropsWithChildren } from 'react';
import { Dropdown, MenuProps } from 'antd';
import { useAbilityStore } from '@/lib/abilityStore';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
  FolderOutlined,
  FileOutlined,
  CopyOutlined,
  FolderAddOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Folder } from '@/lib/data/folder-schema';

export const contextMenuStore = create<{
  setSelected: (id: ProcessListProcess[]) => void;
  selected: ProcessListProcess[];
}>((set) => ({
  setSelected: (item) => set({ selected: item }),
  selected: [],
}));

const ConextMenuArea: FC<
  PropsWithChildren<{
    processActions: ProcessActions;
    folder: Folder;
    prefix?: MenuProps['items'];
    suffix?: MenuProps['items'];
  }>
> = ({
  children,
  processActions: { copyItem: copyItem, editItem, moveItems, deleteItems },
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

    if (
      selectedContextMenuItems.length === 1 &&
      canDeleteItems(selectedContextMenuItems, 'delete', ability)
    )
      children.push({
        key: 'edit-selected',
        label: 'Edit',
        icon: <EditOutlined />,
        onClick: () => editItem(selectedContextMenuItems[0]),
      });

    if (canDeleteItems(selectedContextMenuItems, 'delete', ability))
      children.push({
        key: 'delete-selected',
        label: 'Delete',
        icon: <DeleteOutlined />,
        onClick: () => deleteItems(selectedContextMenuItems),
      });

    if (
      selectedContextMenuItems.some(({ id }) => id === folder.parentId) &&
      canDeleteItems(selectedContextMenuItems, 'update', ability)
    )
      children.push({
        key: 'move-selected',
        label: 'Move to parent',
        icon: <FolderAddOutlined />,
        onClick: () =>
          moveItems(
            selectedContextMenuItems.map((item) => ({ type: item.type, id: item.id })),
            folder.parentId as string,
          ),
      });

    if (
      selectedContextMenuItems.find((item) => item.type !== 'folder') &&
      ability.can('create', 'Process')
    )
      children.push({
        key: 'copy-selected',
        label: 'Copy',
        icon: <CopyOutlined />,
        onClick: () => copyItem(selectedContextMenuItems),
      });

    contextMenuItems.push(
      {
        type: 'group',
        label:
          selectedContextMenuItems.length > 1
            ? `${selectedContextMenuItems.length} selected`
            : selectedContextMenuItems[0].name.value,
        children,
      },
      {
        key: 'item-divider',
        type: 'divider',
      },
    );
  }
  return (
    <Dropdown
      menu={{
        items: [...(prefix || []), ...contextMenuItems, ...(suffix || [])],
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

export default ConextMenuArea;
