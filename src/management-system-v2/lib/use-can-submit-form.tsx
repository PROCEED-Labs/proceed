import { Form, FormInstance } from 'antd';
import { useCallback, useEffect, useState } from 'react';

export class ValidationError extends Error {}

function useCanSubmit(
  form: FormInstance,
  externalValidation?: (values: any) => Promise<void> | void,
) {
  const [submittable, setSubmittable] = useState(false);
  const [errors, setErrors] = useState<ReturnType<FormInstance['getFieldsError']>>([]);

  const values = Form.useWatch([], form);

  const validate = useCallback(async () => {
    try {
      const values = await form.validateFields({ validateOnly: true });

      await externalValidation?.(values);

      setSubmittable(true);
      setErrors([]);
    } catch (err) {
      setSubmittable(false);

      if (err instanceof ValidationError)
        setErrors([{ name: [], errors: [err.message], warnings: [] }]);
      else setErrors(form.getFieldsError().filter((entry) => entry.errors.length));
    }
  }, [form, values, externalValidation]);

  useEffect(() => {
    validate();
  }, [validate]);

  return { submittable, values, errors };
}

export default useCanSubmit;
