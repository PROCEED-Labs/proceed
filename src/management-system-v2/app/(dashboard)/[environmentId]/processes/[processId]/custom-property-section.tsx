'use client';

import React, { useEffect, useState } from 'react';

import { Button, Divider, Form, Input, Space } from 'antd';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

type CustomPropertyFormProperties = {
  isCreationForm: boolean;
  customMetaData: { [key: string]: any };
  initialValues: { name: string; value: string };
  onChange: (name: string, value?: any, oldName?: string) => void;
};
const CustomPropertyForm: React.FC<CustomPropertyFormProperties> = ({
  isCreationForm,
  customMetaData,
  onChange,
  initialValues,
}) => {
  const [form] = Form.useForm<{ name: string; value: any }>();

  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout>>();
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        clearTimeout(timeoutId);
        if (values.value !== initialValues.value || values.name !== initialValues.name) {
          const id = setTimeout(() => {
            if (initialValues.name !== values.name) {
              // replace custom property with a new name
              onChange(values.name, values.value, initialValues.name);
            } else {
              onChange(values.name, values.value);
            }
          }, 2000);
          setTimeoutId(id);
        }
      },
      () => {
        clearTimeout(timeoutId);
      },
    );
  }, [form, values]);

  const validateName = async (name: any) => {
    // entered name already exists in other custom property
    if (initialValues.name !== name && customMetaData[name]) {
      throw new Error('Name already exists');
    }
    return true;
  };

  return (
    <Form
      form={form}
      layout="inline"
      autoComplete="off"
      initialValues={initialValues}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'nowrap',
      }}
    >
      <Space direction="vertical" size={0} style={{ flexGrow: 1 }}>
        <Form.Item
          name="name"
          rules={[{ required: true }, { validator: (_, value) => validateName(value) }]}
          style={{ margin: 0, flexGrow: 1 }}
        >
          <Input name="Name" addonBefore="Name" placeholder="Custom Name" />
        </Form.Item>

        <Form.Item name="value" style={{ margin: 0, width: '100%' }}>
          <Input addonBefore="Value" placeholder="Custom Value" />
        </Form.Item>
      </Space>
      <Form.Item style={{ marginRight: 0, marginLeft: '1rem' }}>
        <Button type="text" style={{ padding: 0, fontSize: '0.75rem' }}>
          <DeleteOutlined onClick={() => onChange(values.name)}></DeleteOutlined>
        </Button>
      </Form.Item>
    </Form>
  );
};
type CustomPropertySectionProperties = {
  metaData: { [key: string]: any };
  onChange: (name: string, value: any, oldName?: string) => void;
};

const CustomPropertySection: React.FC<CustomPropertySectionProperties> = ({
  metaData,
  onChange,
}) => {
  const {
    overviewImage,
    costsPlanned,
    timePlannedDuration,
    timePlannedOccurrence,
    timePlannedEnd,
    occurrenceProbability,
    orderNumber,
    orderName,
    orderCode,
    customerName,
    customerId,
    isUsing5i,
    defaultPriority,
    mqttServer,
    '_5i-Inspection-Plan-ID': inspectionPlanId,
    '_5i-Inspection-Plan-Title': inspectionPlanTitle,
    '_5i-API-Address': apiAddress,
    '_5i-Application-Address': applicationAddress,
    '_5i-Inspection-Order-ID': inspectionOrderId,
    '_5i-Inspection-Order-Code': inspectionOrderCode,
    '_5i-Inspection-Order-Shortdescription': inspectionOrderDescription,
    '_5i-Assembly-Group-ID': assemblyId,
    '_5i-Assembly-Group-Name': assemblyName,
    '_5i-Manufacturing-Step-ID': stepId,
    '_5i-Manufacturing-Step-Name': stepName,
    '_5i-Inspection-Plan-Template-ID': templateId,
    ...customMetaData
  } = metaData;

  const [customProperties, setCustomProperties] = useState<{ name: string; value: string }[]>([]);

  useEffect(() => {
    const customMetaDataEntries = Object.entries(customMetaData);

    const newCustomProperties =
      customMetaDataEntries.length > 0
        ? customMetaDataEntries.map(([key, value]: [string, any]) => ({ name: key, value }))
        : [{ name: '', value: '' }];

    setCustomProperties(newCustomProperties);
  }, [metaData]);

  const updateProperty = (
    newCustomPropertyName: string,
    newCustomPropertyValue: any,
    oldCustomPropertyName?: string,
  ) => {
    onChange(newCustomPropertyName, newCustomPropertyValue, oldCustomPropertyName);
  };

  const deleteProperty = (customPropertyName: string) => {
    onChange(customPropertyName, null);
  };

  let timeoutId: string | number | NodeJS.Timeout | undefined = undefined;
  return (
    <Space
      direction="vertical"
      style={{ width: '100%' }}
      role="group"
      aria-labelledby="custom-properties-title"
    >
      <Divider>
        <span id="custom-properties-title" style={{ fontSize: '0.85rem' }}>
          Custom Properties
        </span>
      </Divider>
      <div>
        {customProperties.map((element: { name: string; value: any }, index) => (
          <CustomPropertyForm
            key={element.name || 'newCustomProperty'}
            isCreationForm={index === customProperties.length - 1}
            customMetaData={customMetaData}
            initialValues={{ name: element.name, value: element.value }}
            onChange={(name, value, oldName) => {
              if (!value) {
                deleteProperty(name);
              } else {
                updateProperty(name, value, oldName);
              }
            }}
          ></CustomPropertyForm>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          type="text"
          size="small"
          style={{ padding: 0, fontSize: '0.75rem' }}
          disabled={customProperties.length > Object.keys(customMetaData).length}
          icon={<PlusOutlined />}
          onClick={() => {
            setCustomProperties([...customProperties, { name: '', value: '' }]);
          }}
        >
          Add Property
        </Button>
      </div>
    </Space>
  );
};

export default CustomPropertySection;
