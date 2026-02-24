import { useMemo } from 'react';

import { Modal } from 'antd';
import { UserTaskForm } from '../../../tasklist/user-task-view';
import { ProcessVariable } from '@/lib/process-variable-schema';
import { inlineScript, inlineUserTaskData } from '@proceed/user-task-helper';

type StartFormModalProps = {
  html?: string;
  variableDefinitions?: ProcessVariable[];
  onSubmit: (variables: { [key: string]: { value: any } }) => void;
  onCancel: () => void;
};

const StartFormModal: React.FC<StartFormModalProps> = ({
  html,
  variableDefinitions,
  onSubmit,
  onCancel,
}) => {
  const finalHtml = useMemo(() => {
    if (!html) return;

    // populate the placeholders with default values from the variable definitions or with empty
    // strings
    const mappedVariables = Object.fromEntries(
      (variableDefinitions || [])
        .filter((variable) => variable.defaultValue !== undefined)
        .map((variable) => {
          let value: string | number | boolean | undefined = variable.defaultValue;

          if (value) {
            // transform from the string representation of the default value to the type defined for
            // the respective variable
            switch (variable.dataType) {
              case 'number':
                value = parseFloat(value);
                break;
              case 'boolean':
                value = value === 'true' ? true : false;
                break;
            }
          }

          return [variable.name, value];
        }),
    );
    const finalHtml = inlineScript(html, '', '', variableDefinitions);
    return inlineUserTaskData(finalHtml, mappedVariables, []);
  }, [html, variableDefinitions]);

  const handleSubmit = async (variables: Record<string, any>) => {
    // map the variable info to the format expected by the engine
    const mappedVariables = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [key, { value }]),
    );

    onSubmit(mappedVariables);
  };

  return (
    <Modal
      open={!!finalHtml}
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
      <UserTaskForm html={finalHtml} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default StartFormModal;
