'use client';

import React, { useEffect, useState } from 'react';

import { Divider, Form, Input, Space } from 'antd';

import { DeleteOutlined } from '@ant-design/icons';

type CustomPropertyFormProperties = {
  customMetaData: { [key: string]: any };
  initialValues: { name: string; value: string };
  onChange: (name: string, value: any) => void;
};
const CustomPropertyForm: React.FC<CustomPropertyFormProperties> = ({
  customMetaData,
  onChange,
  initialValues,
}) => {
  const [form] = Form.useForm<{ name: string; value: any }>();
  const [submittable, setSubmittable] = useState(false);

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

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

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
      style={{ flexGrow: 1 }}
    >
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        <Form.Item
          name="name"
          rules={[{ required: true }, { validator: (_, value) => validateName(value) }]}
          style={{ margin: 0, flexGrow: 1 }}
        >
          <Input
            addonBefore="Name"
            placeholder="Custom Name"
            onBlur={() => {
              if (submittable) {
                // delete custom property with old name
                if (initialValues.name && initialValues.name !== values.name) {
                  onChange(initialValues.name, null);
                }
                onChange(values.name, values.value);
              }
            }}
          />
        </Form.Item>

        <Form.Item name="value" rules={[{ required: true }]} style={{ margin: 0, width: '100%' }}>
          <Input
            addonBefore="Value"
            placeholder="Custom Value"
            onBlur={() => {
              if (submittable) {
                onChange(values.name, values.value);
              }
            }}
          />
        </Form.Item>
      </Space>
    </Form>
  );
};
type CustomPropertySectionProperties = {
  metaData: { [key: string]: any };
  onChange: (name: string, value: any) => void;
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

  const customProperties = [
    ...Object.entries(customMetaData).map(([key, value]: [string, any]) => ({ name: key, value })),
    { name: '', value: '' },
  ];

  const updateProperty = (newCustomPropertyName: string, newCustomPropertyValue: any) => {
    onChange(newCustomPropertyName, newCustomPropertyValue);
  };

  const deleteProperty = (customPropertyName: string) => {
    onChange(customPropertyName, null);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Divider style={{ fontSize: '0.85rem' }}>Custom Properties</Divider>
      {customProperties.map((element: { name: string; value: any }, index) => (
        <div
          key={element.name || 'newCustomProperty'}
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <CustomPropertyForm
            customMetaData={customMetaData}
            initialValues={{ name: element.name, value: element.value }}
            onChange={(name, value) => {
              if (!value) {
                deleteProperty(name);
              } else {
                updateProperty(name, value);
              }
            }}
          ></CustomPropertyForm>
          <DeleteOutlined
            style={{
              visibility: index !== customProperties.length - 1 ? 'visible' : 'hidden',
              marginLeft: '1rem',
              fontSize: '1rem',
            }}
            onClick={() => deleteProperty(element.name)}
          ></DeleteOutlined>
        </div>
      ))}
    </Space>
  );
};

export default CustomPropertySection;
