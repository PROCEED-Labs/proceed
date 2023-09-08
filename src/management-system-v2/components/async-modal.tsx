'use client';

import { Button } from 'antd';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Modal as AntModal } from 'antd';
import { on } from 'events';

type ModalProps = PropsWithChildren & {
  title?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onOk: () => Promise<void>;
  onCancel?: () => void;
  footer?: React.ReactNode;
};

const Modal: FC<ModalProps> = ({ children, open, setOpen, onOk, onCancel, title, footer }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    setConfirmLoading(true);
    onOk().then(() => {
      setConfirmLoading(false);
      setOpen(false);
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setOpen(false);
  };

  let modalFooter;
  if (footer) {
    modalFooter = footer;
  } else {
    modalFooter = [
      <Button key="back" onClick={handleCancel}>
        Cancel
      </Button>,
      <Button key="submit" type="primary" loading={confirmLoading} onClick={handleOk}>
        Submit
      </Button>,
    ];
  }

  return (
    <>
      <AntModal
        title={title}
        open={open}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
        centered
        footer={modalFooter}
      >
        {children}
      </AntModal>
    </>
  );
};

export default Modal;
