import { Modal } from 'antd';
import { UserTaskForm } from '../../../tasklist/user-task-view';

type StartFormModalProps = {
  html?: string;
  onSubmit: (variables: { [key: string]: any }) => Promise<void>;
  onCancel: () => void;
};

const StartFormModal: React.FC<StartFormModalProps> = ({ html, onSubmit, onCancel }) => {
  return (
    <Modal
      open={!!html}
      onCancel={onCancel}
      footer={null}
      title="Confirm this form to start the instance"
      width={'50vw'}
      height={'80vh'}
      style={{ padding: '1px' }}
      styles={{
        container: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          // height: '100%',
          flexGrow: 1,
          display: 'flex',
        },
      }}
    >
      <UserTaskForm html={html} onSubmit={onSubmit} />
    </Modal>
  );
};

export default StartFormModal;
