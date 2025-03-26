'use client';

import { useRouter } from 'next/navigation';
import { CaretRightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Space, Collapse, theme } from 'antd';
import AddButton from './add-button';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import { Parameter, ParameterContent } from '@/lib/data/machine-config-schema';
import { updateParameter } from '@/lib/data/db/machine-config';
import { ParamContent, ParameterContentHeader } from './parameter-content';

type MachineDataViewProps = {
  editingEnabled: boolean;
  field: Parameter;
  label?: string;
};

const Param: React.FC<MachineDataViewProps> = ({ editingEnabled: editable, field, label }) => {
  const router = useRouter();

  const { token } = theme.useToken();

  const [openCreateParameterModal, setOpenCreateParameterModal] = useState<boolean>(false);

  const addContent = async (values: CreateParameterModalReturnType[]) => {
    const valuesFromModal = values[0];
    const newCon: ParameterContent = {
      displayName: valuesFromModal.displayName ?? 'New ' + field.key + ' entry',
      value: valuesFromModal.value ?? '',
      language: valuesFromModal.language ?? 'en',
      unit: valuesFromModal.unit ?? '',
    };

    await updateParameter(field.id!, { content: [...field.content, ...[newCon]] });
    setOpenCreateParameterModal(false);
    router.refresh();
  };

  const deleteContent = async (index: number) => {
    await updateParameter(field.id!, {
      content: [...field.content.slice(0, index), ...field.content.slice(index + 1)],
    });
    router.refresh();
  };

  const updateContent = async (index: number, newValue: ParameterContent) => {
    await updateParameter(field.id!, {
      content: [...field.content.slice(0, index), newValue, ...field.content.slice(index + 1)],
    });
    router.refresh();
  };

  const panelStyle = {
    margin: '0 0 10px 0',
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'solid 1px #d9d9d9',
  };

  const getParameterItems = (): any => {
    let list: any[] = [];
    if (field.content) {
      list = field.content.map((entry, index) => ({
        key: index,
        label: (
          <ParameterContentHeader
            editable={editable}
            parameterContent={entry}
            onDelete={() => deleteContent(index)}
          />
        ),
        children: [
          <ParamContent
            editable={editable}
            indexInParameter={index}
            onUpdate={updateContent}
            content={entry}
          />,
        ],
        style: panelStyle,
      }));
    }
    return list;
  };

  const parameterItems = getParameterItems();
  const addButtonTitle = 'Add ' + label + ' Entry';
  return (
    <>
      {(editable || parameterItems.length > 0) && (
        <>
          <Collapse
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            ghost
            collapsible={
              editable || ('parameters' in field && field.parameters.length > 0)
                ? 'icon'
                : 'disabled'
            }
            size="small"
            items={parameterItems}
          />

          {editable && (
            <Space>
              <AddButton
                label={addButtonTitle}
                items={undefined}
                onClick={() => setOpenCreateParameterModal(true)}
              />
            </Space>
          )}
        </>
      )}

      <CreateParameterModal
        title={'Create ' + label + ' Entry'}
        open={openCreateParameterModal}
        onCancel={() => setOpenCreateParameterModal(false)}
        onSubmit={addContent}
        okText="Create"
        showKey={false}
      />
    </>
  );
};

export default Param;
