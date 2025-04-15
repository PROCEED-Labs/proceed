'use client';

import React, { FC } from 'react';
import { FolderTree } from './FolderTree';
import { Button, Modal } from 'antd';
import { FolderChildren } from '@/lib/data/folders';

type MoveToFolderModalProps = {
  open: boolean;
  onCancel: () => void;
  onMove: () => void;
  onCreateFolder: () => void;
  onSelectFolder: (folder: string) => void;
  selectedElements: FolderChildren[];
  changedFolders?: string[];
};

const MoveToFolderModal: FC<MoveToFolderModalProps> = ({
  open,
  onCancel,
  onMove,
  onCreateFolder,
  onSelectFolder,
  selectedElements = [],
  changedFolders,
}) => {
  return (
    <>
      <Modal
        title={`Move ${selectedElements.length} Item${selectedElements.length > 1 && 's'} to a Folder`}
        open={open}
        width={600}
        destroyOnClose
        centered
        onCancel={onCancel}
        footer={(_, { CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={onCreateFolder}>Create New Folder</Button>
            <Button type="primary" onClick={onMove}>
              Move To Folder
            </Button>
          </>
        )}
      >
        <div style={{ marginBottom: 20 }}>
          <b>Selected Items:</b>
          {selectedElements.map((element, i) => (
            <span key={element.id}>
              {i > 0 ? ', ' : ' '}
              {/* @ts-ignore */}
              <span>{element.name.value}</span>
            </span>
          ))}
        </div>
        <FolderTree
          subtreesToReload={changedFolders}
          onSelect={(selectedElement) => {
            if (!selectedElement) onSelectFolder('');
            else if (selectedElement.type === 'folder')
              // @ts-ignore
              onSelectFolder(selectedElement.id);
            else if (selectedElement.type === 'process')
              // @ts-ignore
              onSelectFolder(selectedElement.folderId);
          }}
        />
      </Modal>
    </>
  );
};

export default MoveToFolderModal;
