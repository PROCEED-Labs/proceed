'use client';
import { Process } from '@/lib/data/process-schema';
import Button from '@atlaskit/button';
import Form, {
  Field,
  FormFooter,
  FormSection,
  RequiredAsterisk,
  useFormState,
} from '@atlaskit/form';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import TextArea from '@atlaskit/textarea';
import TextField from '@atlaskit/textfield';
import { ProcessFormBody, ProcessFormSubmitButton } from './process-form';

interface ConfluenceProcess {
  id: string;
  name: string;
  description: string;
  origin: string;
  container: string;
  lastEdited: number;
  createdOn: number;
}

const ProcessModal = ({
  title,
  open,
  close,
  processData,
}: {
  title: string;
  open: boolean;
  close: (values?: { name: string; description: string }) => void;
  processData?: Process | ConfluenceProcess;
}) => {
  const submit = (values: { name: string; description: string }) => {
    close(values);
  };
  return (
    <ModalTransition>
      {open && (
        <Modal onClose={() => close()}>
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
          </ModalHeader>
          <Form onSubmit={submit}>
            {({ formProps, getState }) => (
              <form id="form-with-id" {...formProps}>
                <ModalBody>
                  <ProcessFormBody processData={processData}></ProcessFormBody>
                </ModalBody>
                <ModalFooter>
                  <Button onClick={() => close()} appearance="subtle">
                    Cancel
                  </Button>
                  <ProcessFormSubmitButton submit={submit}></ProcessFormSubmitButton>
                </ModalFooter>
              </form>
            )}
          </Form>
        </Modal>
      )}
    </ModalTransition>
  );
};

export default ProcessModal;
