'use client';

import React, { FC } from 'react';
import { FolderTree } from './FolderTree';
import { Modal } from 'antd';

type MoveToFolderModalProps = {
  open: boolean;
  //   onMove: () => void;
};

const MoveToFolderModal: FC<MoveToFolderModalProps> = ({
  open,
  // onMove
}) => {
  return (
    <>
      <Modal title={'TEST'} open={open} width={600} destroyOnClose centered>
        <FolderTree />
      </Modal>
    </>
  );
};

export default MoveToFolderModal;
