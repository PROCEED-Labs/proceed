'use client';
import ProcessList from './process-list';
import { Process } from '@/lib/data/process-schema';
import Button, { ButtonGroup } from '@atlaskit/button';
import { deleteProcesses, updateProcess } from '@/lib/data/processes';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Form, { RequiredAsterisk, Field, useFormState } from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';

interface ConfluenceProcess {
  id: string;
  name: string;
  description: string;
  origin: string;
  container: string;
  lastEdited: number;
  createdOn: number;
}

const SubmitButton = ({ submit }: { submit: (values: any) => void }) => {
  const formState = useFormState<{ name: string; description: string }>({
    values: true,
    pristine: true,
    dirty: true,
    valid: true,
  });
  console.log('formState', formState);
  return (
    <Button
      appearance="primary"
      isDisabled={!formState || !formState.valid}
      onClick={() => {
        submit(formState!.values);
      }}
    >
      Submit
    </Button>
  );
};
const ProcessModal = ({
  title,
  open,
  close,
  processData,
}: {
  title: string;
  open: boolean;
  close: (values?: { name: string; description: string }) => void;
  processData: Process | ConfluenceProcess | null;
}) => {
  const submit = (values: { name: string; description: string }) => {
    close(values);
  };
  return (
    <ModalTransition>
      {open && (
        <Modal onClose={() => close()}>
          <Form onSubmit={submit}>
            {({ formProps, getState }) => (
              <form id="form-with-id" {...formProps}>
                <ModalHeader>
                  <ModalTitle>{title}</ModalTitle>
                </ModalHeader>

                <ModalBody>
                  <p aria-hidden="true" style={{ marginBottom: '24px' }}>
                    Required fields are marked with an asterisk <RequiredAsterisk />
                  </p>

                  <Field
                    label="Name"
                    name="name"
                    isRequired
                    defaultValue={processData?.name}
                    validate={(value) => {
                      const res = !value || value.length < 3 ? 'TOO_SHORT' : undefined;
                      return res;
                    }}
                  >
                    {({ fieldProps }) => <TextField {...fieldProps} />}
                  </Field>

                  <Field
                    label="Description"
                    name="description"
                    defaultValue={processData?.description}
                    validate={(value) => (value && value.length < 3 ? 'TOO_SHORT' : undefined)}
                  >
                    {({ fieldProps }: any) => (
                      <TextArea
                        defaultValue={processData?.description}
                        id="area"
                        resize="auto"
                        maxHeight="20vh"
                        name="area"
                        onPointerEnterCapture={undefined}
                        onPointerLeaveCapture={undefined}
                        {...fieldProps}
                      />
                    )}
                  </Field>
                </ModalBody>
                <ModalFooter>
                  <Button onClick={() => close()} appearance="subtle">
                    Cancel
                  </Button>
                  <SubmitButton submit={submit}></SubmitButton>
                </ModalFooter>
              </form>
            )}
          </Form>
        </Modal>
      )}
    </ModalTransition>
  );
};

const ActionButtons = ({ process }: { process: Process }) => {
  const { spaceId } = useEnvironment();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModelerOpen, setIsModelerOpen] = useState(false);

  const closeEditModal = (values?: { name: string; description: string }) => {
    if (values) {
      if ('origin' in process) {
        console.log('changed confluence process');
      } else {
        updateProcess(process.id, spaceId, undefined, values.description, values.name).then(() =>
          router.refresh(),
        );
      }
    }

    setIsEditModalOpen(false);
  };

  const closeModeler = () => {
    setIsModelerOpen(false);
  };

  const deleteProcess = (id: string) => {
    deleteProcesses([id], spaceId).then(() => router.refresh());
  };

  return (
    <>
      <ButtonGroup>
        <Button
          onClick={() => {
            setIsModelerOpen(true);
          }}
          appearance="primary"
        >
          Open
        </Button>
        <Button
          onClick={() => {
            setIsEditModalOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          onClick={() => {
            deleteProcess(process.id);
          }}
        >
          Delete
        </Button>
      </ButtonGroup>
      <ProcessModal
        title="Edit Process"
        processData={process}
        open={isEditModalOpen}
        close={closeEditModal}
      ></ProcessModal>
    </>
  );
};

const ManagableProcessList = ({ processes }: { processes: Process[] }) => {
  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <ProcessList
        processes={processes}
        ActionButtons={({ process }: { process: Process }) => <ActionButtons process={process} />}
      ></ProcessList>
    </div>
  );
};

export default ManagableProcessList;
