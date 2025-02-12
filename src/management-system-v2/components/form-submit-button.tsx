import { FormInstance, Form, Button, ButtonProps } from 'antd';
import React, { useState } from 'react';

const FormSubmitButton = <TData = any,>({
  form: _form,
  onSubmit,
  submitText,
  isValidData,
  buttonProps,
}: {
  form?: FormInstance;
  onSubmit?: Function;
  submitText: string;
  isValidData?: (data: TData) => boolean;
  buttonProps?: ButtonProps;
}) => {
  const [submittable, setSubmittable] = useState(false);

  const [hookForm] = Form.useForm();
  const form = _form ?? hookForm;

  // Watch all values
  const values = Form.useWatch([], _form);

  React.useEffect(() => {
    if (isValidData) {
      setSubmittable(isValidData(values as TData));
    } else {
      form.validateFields({ validateOnly: true }).then(
        () => {
          setSubmittable(true);
        },
        () => {
          setSubmittable(false);
        },
      );
    }
  }, [form, values]);

  return (
    <Button
      {...buttonProps}
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={async () => {
        await onSubmit?.(values);
        form.resetFields();
      }}
    >
      {submitText}
    </Button>
  );
};

export default FormSubmitButton;
