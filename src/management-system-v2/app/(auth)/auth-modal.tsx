import { useEffect, useState } from 'react';
import { Modal, ModalProps } from 'antd';
import { useAddControlCallback } from '@/lib/controls-store';

export default function AuthModal(props: ModalProps) {
  // We need to wait until the component is mounted on the client
  // to open the modal, otherwise it will cause a hydration mismatch
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(true);
  }, [setOpen]);

  // disable all keyboard shortcuts that are set in the process list
  useAddControlCallback(
    'process-list',
    ['selectall', 'del', 'esc', 'copy', 'paste', 'controlenter', 'enter', 'cut'],
    () => {},
    { blocking: true, level: 5 },
  );

  return (
    <Modal
      open={open}
      closeIcon={null}
      footer={null}
      {...props}
      style={{
        maxWidth: '60ch',
        width: '90%',
        top: 0,
        marginTop: '10vh',
        ...props.style,
      }}
      styles={{
        mask: { backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' },
        ...props.styles,
      }}
    />
  );
}
