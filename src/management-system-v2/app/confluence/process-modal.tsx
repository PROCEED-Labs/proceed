'use client';
import { Process } from '@/lib/data/process-schema';
import Button from '@atlaskit/button';
import Form, { Field, RequiredAsterisk, useFormState } from '@atlaskit/form';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import TextArea from '@atlaskit/textarea';
import TextField from '@atlaskit/textfield';

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
  processData?: Process | ConfluenceProcess;
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

export default ProcessModal;
