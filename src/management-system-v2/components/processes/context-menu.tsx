import { create } from 'zustand';
import { ProcessActions, ProcessListProcess, canDeleteItems } from '.';
import { FC, PropsWithChildren } from 'react';
import { App, Dropdown, MenuProps } from 'antd';
import { useAbilityStore } from '@/lib/abilityStore';
import { DeleteOutlined, CopyOutlined, FolderAddOutlined, LinkOutlined } from '@ant-design/icons';
import { Folder } from '@/lib/data/folder-schema';
import SpaceLink from '../space-link';
import { MdOpenWith } from 'react-icons/md';
import { IoOpenOutline } from 'react-icons/io5';
import { spaceURL } from '@/lib/utils';
import { useEnvironment } from '../auth-can';

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
  const space = useEnvironment();
  const { message } = App.useApp();

  const contextMenuItems: MenuProps['items'] = [];
  if (selectedContextMenuItems.length > 0) {
    const children: MenuProps['items'] = [];

    if (
      selectedContextMenuItems.length === 1 &&
      canDeleteItems(selectedContextMenuItems, 'delete', ability)
    )
      children.push(
        {
          key: 'open-selected',
          icon: <MdOpenWith />,
          label: (
            <SpaceLink
              href={
                selectedContextMenuItems[0].type === 'folder'
                  ? `/processes/folder/${selectedContextMenuItems[0].id}`
                  : `/processes/${selectedContextMenuItems[0].id}`
              }
            >
              Open
            </SpaceLink>
          ),
        },
        {
          key: 'open-selected-new-tab',
          icon: <IoOpenOutline />,
          label: (
            <SpaceLink
              href={
                selectedContextMenuItems[0].type === 'folder'
                  ? `/processes/folder/${selectedContextMenuItems[0].id}`
                  : `/processes/${selectedContextMenuItems[0].id}`
              }
              target="_blank"
            >
              Open in new tab
            </SpaceLink>
          ),
        },
      );

    if (canDeleteItems(selectedContextMenuItems, 'delete', ability))
      children.push({
        key: 'delete-selected',
        label: 'Delete',
        icon: <DeleteOutlined />,
        onClick: () => deleteItems(selectedContextMenuItems),
      });

    if (
      selectedContextMenuItems.length === 1 &&
      selectedContextMenuItems[0].type !== 'folder' &&
      navigator.clipboard &&
      'write' in navigator.clipboard
    )
      children.push({
        key: 'copy-selected-id',
        label: 'Copy Process Link',
        icon: <LinkOutlined />,
        onClick: async () => {
          try {
            const url = new URL(
              spaceURL(space, `/processes/${selectedContextMenuItems[0].id}`),
              window.location.origin,
            );

            await window.navigator.clipboard.writeText(url.toString());
            message.open({
              content: 'Link copied to clipboard',
              type: 'success',
            });
          } catch (e) {
            message.open({
              content: 'Failed to copy link to clipboard',
              type: 'error',
            });
          }
        },
      });

    if (
      folder.parentId !== null &&
      !selectedContextMenuItems.some(({ id }) => id === folder.parentId) &&
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

export default ConextMenuArea;
