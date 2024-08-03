import Button from '@atlaskit/button';
import Form, {
  Field,
  FormHeader,
  FormFooter,
  FormSection,
  RequiredAsterisk,
  useFormState,
} from '@atlaskit/form';
import TextArea from '@atlaskit/textarea';
import TextField from '@atlaskit/textfield';

const ProcessFormSubmitButton = ({ submit }: { submit: (values: any) => void }) => {
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

const ProcessFormBody = ({
  processData,
}: {
  processData?: { name: string; description: string };
}) => {
  return (
    <div>
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
    </div>
  );
};

const ProcessForm = ({
  processData,
  cancel,
  submit,
}: {
  processData?: { name: string; description: string };
  cancel: () => void;
  submit: (values: { name: string; description: string }) => void;
}) => {
  return (
    <Form onSubmit={submit}>
      {({ formProps, getState }) => (
        <form id="form-with-id" {...formProps}>
          <FormHeader title="Create Process"></FormHeader>
          <FormSection>
            <ProcessFormBody processData={processData}></ProcessFormBody>
          </FormSection>
          <FormFooter>
            <Button onClick={() => cancel()} appearance="subtle">
              Cancel
            </Button>
            <ProcessFormSubmitButton submit={(values) => submit(values)}></ProcessFormSubmitButton>
          </FormFooter>
        </form>
      )}
    </Form>
  );
};

export { ProcessFormBody, ProcessFormSubmitButton };

export default ProcessForm;
