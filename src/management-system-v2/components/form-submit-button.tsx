import { FormInstance, Form, Button } from 'antd';
import React, { ReactNode, useState } from 'react';

const FormSubmitButton = ({
  form,
  onSubmit,
  submitText,
}: {
  form: FormInstance;
  onSubmit: Function;
  submitText: ReactNode;
}) => {
  const [submittable, setSubmittable] = useState(false);

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit(values);
        form.resetFields();
      }}
    >
      {submitText}
    </Button>
  );
};

export default FormSubmitButton;
