'use client';

import React, { FC, useRef, useState } from 'react';
import { FolderTree } from './FolderTree';
import { Button, Modal } from 'antd';

type MoveToFolderModalProps = {
  open: boolean;
  onCancel: () => void;
  onMove: () => void;
};

const MoveToFolderModal: FC<MoveToFolderModalProps> = ({ open, onCancel, onMove }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const selectedFodler = useRef(null);

  const handleMove = () => {};

  const handleCreateNewFolder = () => {};

  return (
    <>
      <Modal
        title={'Move to Folder'}
        open={open}
        width={600}
        destroyOnClose
        centered
        onCancel={onCancel}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={handleCreateNewFolder}>Create New Folder</Button>
            {/* <OkBtn /> */}
            <Button type="primary" onClick={handleMove}>
              Move To Folder
            </Button>
          </>
        )}
        // okButtonProps={}
      >
        <FolderTree />
      </Modal>
    </>
  );
};

export default MoveToFolderModal;
