import React, { useState } from 'react';
import { Button, Modal } from 'antd';

type Props = {};

const DeleteModal = (props: Props) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOk = () => {};

  return (
    <>
      {/* <Button type="primary" onClick={() => setModalOpen(true)}>
        Vertically centered modal dialog
      </Button> */}

      <Modal
        title="Delete selected processes?"
        centered
        open={modalOpen}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      >
        <p>Click ok to delete the selected processes.</p>
      </Modal>
    </>
  );
};

export default DeleteModal;
