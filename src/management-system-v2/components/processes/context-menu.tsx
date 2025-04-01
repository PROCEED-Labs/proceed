import { create } from 'zustand';
import { ProcessListProcess, canDoActionOnResource, contextActions } from '.';
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

export const contextMenuStore = create<{
  setSelected: (id: ProcessListProcess[]) => void;
  selected: ProcessListProcess[];
}>((set) => ({
  setSelected: (item) => set({ selected: item }),
  selected: [],
}));

const ConextMenuArea: FC<
  PropsWithChildren<{
    processActions: contextActions;
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

    if (
      selectedContextMenuItems.length === 1 &&
      selectedContextMenuItems[0].type == 'process' &&
      canDoActionOnResource(selectedContextMenuItems, 'update', ability)
    )
      children.push(
        // View Process Documentation,
        {
          key: 'view-docs',
          icon: <GrDocumentUser />,
          label: <>View Process Documentation</>,
          onClick: () => viewDocumentation(selectedContextMenuItems[0]),
        },
        // Open Editor,
        {
          key: 'open-selected',
          icon: <PiNotePencil />,
          label: (
            <SpaceLink
              href={
                /* selectedContextMenuItems[0].type === 'folder'
                              ? `/processes/folder/${selectedContextMenuItems[0].id}`
                              :  */
                `/processes/${selectedContextMenuItems[0].id}`
              }
            >
              Open Editor
            </SpaceLink>
          ),
        },
        // Open Editor in new Tab,
        {
          key: 'open-selected-new-tab',
          icon: <IoOpenOutline />,
          label: (
            <SpaceLink
              href={
                /* selectedContextMenuItems[0].type === 'folder'
                              ? `/processes/folder/${selectedContextMenuItems[0].id}`
                              :  */
                `/processes/${selectedContextMenuItems[0].id}`
              }
              target="_blank"
            >
              Open Editor in new Tab
            </SpaceLink>
          ),
        },
        // Change Meta Data,
        {
          key: 'change-meta-data',
          icon: <LuNotebookPen />,
          label: 'Change Meta Data',
          onClick: () => changeMetaData(selectedContextMenuItems[0]),
        },
        // Release Process,
        {
          key: 'release-process',
          icon: <BsFileEarmarkCheck />,
          label: 'Release Process',
          onClick: () => releaseProcess(selectedContextMenuItems[0]),
        },
        // Share,
        {
          key: 'share',
          icon: <ShareAltOutlined />,
          label: 'Share',
          onClick: () => share(selectedContextMenuItems[0]),
        },
      );

    // Copy-Link, -> remove
    // Note: commented it for now, in case we need it in future
    // if (
    //   selectedContextMenuItems.length === 1 &&
    //   selectedContextMenuItems[0].type !== 'folder' &&
    //   navigator.clipboard &&
    //   'write' in navigator.clipboard
    // )
    //   children.push({
    //     key: 'copy-selected-id',
    //     label: 'Copy Link',
    //     icon: <LinkOutlined />,
    //     onClick: async () => {
    //       try {
    //         const url = new URL(
    //           spaceURL(space, `/processes/${selectedContextMenuItems[0].id}`),
    //           window.location.origin,
    //         );

    //         await window.navigator.clipboard.writeText(url.toString());
    //         message.open({
    //           content: 'Link copied to clipboard',
    //           type: 'success',
    //         });
    //       } catch (e) {
    //         message.open({
    //           content: 'Failed to copy link to clipboard',
    //           type: 'error',
    //         });
    //       }
    //     },
    //   });

    // Copy
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
      // Download,
      children.push({
        key: 'export-selected',
        label: 'Download',
        icon: <PiDownloadSimple />,
        onClick: () => download(selectedContextMenuItems),
      });
    }
    // Move to Folder,
    if (
      // selectedContextMenuItems.every((item) => item.type !== 'folder') &&
      canDoActionOnResource(selectedContextMenuItems, 'update', ability)
    )
      children.push({
        key: 'move-selected',
        label: 'Move to Folder',
        icon: <RiFolderTransferLine />,
        onClick: () => moveItems(selectedContextMenuItems),
      });
    // Move to parent folder,
    // if (
    //   folder.parentId !== null &&
    //   !selectedContextMenuItems.some(({ id }) => id === folder.parentId) &&
    //   canDoActionOnResource(selectedContextMenuItems, 'update', ability)
    // )
    //   children.push({
    //     key: 'move-selected',
    //     label: 'Move to Parent Folder',
    //     icon: <FolderFilled />,
    //     onClick: () =>
    //       moveItems(
    //         selectedContextMenuItems.map((item) => ({ type: item.type, id: item.id })),
    //         folder.parentId as string,
    //       ),
    //   });
    // Delete,
    if (canDoActionOnResource(selectedContextMenuItems, 'delete', ability))
      children.push({
        key: 'delete-selected',
        label: 'Delete',
        icon: <DeleteOutlined />,
        onClick: () => deleteItems(selectedContextMenuItems),
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
      // Horizontal Bar,

      {
        key: 'item-divider-1',
        type: 'divider',
      },
    );

    // Create Process,
    // Create Folder,
    // Import Process
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
