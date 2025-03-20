'use client';

import React, { FC, useEffect, useRef, useState } from 'react';
import { FolderTree } from './FolderTree';
import { Button, Modal } from 'antd';
import { FolderChildren } from '@/lib/data/legacy/folders';
import { ProcessListProcess } from './processes';

type MoveToFolderModalProps = {
  open: boolean;
  onCancel: () => void;
  onMove: () => void;
  onCreateFolder: () => void;
  onSelectFolder: (folder: string) => void;
  selectedElements: FolderChildren[];
  forceReload?: any;
};

const MoveToFolderModal: FC<MoveToFolderModalProps> = ({
  open,
  onCancel,
  onMove,
  onCreateFolder,
  onSelectFolder,
  selectedElements = [],
  forceReload,
}) => {
  const handleCreateFolder = () => {
    onCreateFolder();
  };

  return (
    <>
      <Modal
        title={`Move ${selectedElements.length} item(s) to a folder`}
        open={open}
        width={600}
        destroyOnClose
        centered
        onCancel={onCancel}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={handleCreateFolder}>Create New Folder</Button>
            {/* <OkBtn /> */}
            <Button type="primary" onClick={onMove}>
              Move To Folder
            </Button>
          </>
        )}
        // okButtonProps={}
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
          forceReload={forceReload}
          onSelect={(selectedElement) => {
            if (!selectedElement) onSelectFolder('');
            else if (selectedElement.type === 'folder')
              // @ts-ignore
              onSelectFolder(selectedElement.id);
            else if (selectedElement.type === 'process')
              // @ts-ignore
              onSelectFolder(selectedElement.folderId);
          }}
          // showRootAsFolder
        />
      </Modal>
    </>
  );
};

export default MoveToFolderModal;
