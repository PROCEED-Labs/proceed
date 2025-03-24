import { useEffect, useState } from 'react';
import { Modal, ModalProps } from 'antd';

export default function AuthModal(props: ModalProps) {
  // We need to wait until the component is mounted on the client
  // to open the modal, otherwise it will cause a hydration mismatch
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(true);
  }, [setOpen]);

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
