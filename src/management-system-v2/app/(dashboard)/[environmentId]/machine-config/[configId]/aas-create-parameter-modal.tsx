'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  App,
  Collapse,
  CollapseProps,
  Select,
  Card,
  Typography,
  Space,
  Tag,
  SelectProps,
  Row,
  Col,
  TreeSelect,
  Tooltip,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { UserError } from '@/lib/user-error';
import { Localization, languageItemsSelect } from '@/lib/data/locale';
import TextArea from 'antd/es/input/TextArea';
import {
  Config,
  Parameter,
  LinkedParameter,
  LocalizedText,
} from '@/lib/data/machine-config-schema';
import { buildLinkedInputParametersFromIds } from '../configuration-helper';
import { getConfigurationCategories } from '@/lib/data/db/machine-config';
import { useEnvironment } from '../../../../../components/auth-can';
import { QuestionCircleOutlined } from '@ant-design/icons';
export type CreateParameterModalReturnType = {
  name: string;
  value: string;
  unit: string;
  displayName: LocalizedText[];
  description: LocalizedText[];
  transformationType: string;
  linkedParameters: string[];
  formula: string;
  parameterType?: string;
  structureVisible?: string;
  valueTemplateSource?: string;
  origin?: string;
};

type TagRender = SelectProps['tagRender'];
type AasCreateParameterModalProps<T extends CreateParameterModalReturnType> = {
  open: boolean;
  title: string;
  okText?: string;
  valueTemplateSource?: string;
  currentLanguage: Localization;
  onCancel: () => void;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  showKey?: boolean;
  parentConfig?: Config;
};

const AasCreateParameterModal = <T extends CreateParameterModalReturnType>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  showKey,
  parentConfig,
  valueTemplateSource,
  currentLanguage,
}: AasCreateParameterModalProps<T>) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const environment = useEnvironment();
  const [error, setError] = useState<unknown | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['configurationCategories', environment.spaceId],
    queryFn: async () => {
      const categories = await getConfigurationCategories(environment.spaceId);
      if (categories) {
        return categories.map((v) => ({
          label: v,
          value: v,
        }));
      }
      return [];
    },
  });

  useEffect(() => {
    if (open && initialData && initialData.length > 0) {
      const processedData = initialData.map((data) => {
        if (valueTemplateSource === 'category' && data.value && typeof data.value === 'string') {
          const categoriesArray = data.value
            .split(';')
            .filter((cat) => cat.trim() !== '')
            .map((cat) => cat.trim());
          //console.log(data.value, '→', categoriesArray);
          return {
            ...data,
            value: categoriesArray,
          };
        }
        return data;
      });

      // reset form first, then safely set new values after queue clears
      form.resetFields();
      Promise.resolve().then(() => {
        form.setFieldsValue(processedData);
      });
    }
  }, [open, initialData, valueTemplateSource]);

  const items: CollapseProps['items'] =
    (initialData?.length ?? 0) > 1
      ? initialData?.map((data, index) => ({
          label:
            data.displayName?.find((item: any) => item.language === currentLanguage)?.text ||
            data.displayName?.[0]?.text ||
            'Unnamed Parameter',
          children: (
            <ParameterInputs
              index={index}
              showKey={showKey}
              parentConfig={parentConfig}
              valueTemplateSource={valueTemplateSource}
              categories={categories}
              initialData={initialData}
              currentLanguage={currentLanguage}
            />
          ),
        }))
      : undefined;

  const onOk = async () => {
    try {
      // form.validateFields() only contains field values (that have been
      // rendered), so we have to merge with initalData.
      const values = Object.entries(await form.validateFields()) as any[];
      const mergedValues = (initialData ?? [{}]).map((value, index) => {
        const formValue = values.find(([key]) => key === index.toString())?.[1];
        const merged = {
          ...value,
          ...formValue,
        };
        // value array conversion based on valueTemplateSource
        if (merged.valueTemplateSource === 'category' && merged.value) {
          if (typeof merged.value === 'string') {
            merged.value = merged.value
              .split(';')
              .filter((cat: string) => cat.trim() !== '')
              .map((cat: string) => cat.trim());
          }
        } else if (merged.valueTemplateSource !== 'category' && Array.isArray(merged.value)) {
          merged.value = merged.value.join('; ');
        }
        if (merged.displayName) {
          merged.displayName = merged.displayName.filter(
            (item: LocalizedText) => item.text && item.text.trim() !== '',
          );
        }
        if (merged.description) {
          merged.description = merged.description.filter(
            (item: LocalizedText) => item.text && item.text.trim() !== '',
          );
        }

        return merged;
      });

      // Let the parent of this modal handle the submission.
      setSubmitting(true);
      try {
        const res = await onSubmit(mergedValues);
        if (res?.error) {
          message.open({ type: 'error', content: res.error.message });
        }
      } catch (e) {
        setError(e);

        message.open({
          type: 'error',
          content: 'Something went wrong while submitting the data',
        });
      }
      setSubmitting(false);
    } catch (info) {
      // Validate Failed
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      width={900}
      centered
      onCancel={() => {
        onCancel();
      }}
      destroyOnClose
      okButtonProps={{ loading: submitting }}
      okText={okText}
      wrapProps={{ onDoubleClick: (e: MouseEvent) => e.stopPropagation() }}
      onOk={onOk}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: '20px',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        name="create_parameter_form"
        initialValues={
          initialData ?? [
            {
              displayNameLanguage: currentLanguage,
              descriptionLanguage: currentLanguage,
              transformationType: 'none',
              linkedParameters: [],
              formula: '',
              parameterType: 'none',
              structureVisible: 'yes',
              valueTemplateSource: 'none',
            },
          ]
        }
        autoComplete="off"
        preserve={false}
      >
        {!initialData || initialData.length === 1 ? (
          <ParameterInputs
            index={0}
            showKey={showKey}
            parentConfig={parentConfig}
            valueTemplateSource={valueTemplateSource}
            categories={categories}
            initialData={initialData}
            currentLanguage={currentLanguage}
          />
        ) : (
          <Collapse
            style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}
            accordion
            items={items}
          />
        )}
      </Form>
    </Modal>
  );
};

// helper function to generate name from display name
const generateNameFromDisplayName = (displayName: string): string => {
  if (!displayName) return '';
  return displayName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_+]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

type CreateParameterInputsProps = {
  index: number;
  showKey?: boolean;
  parentConfig?: Config;
  valueTemplateSource?: string;
  categories?: { label: string; value: string }[];
  initialData?: CreateParameterModalReturnType[];
  currentLanguage: Localization;
};

const ParameterInputs = ({
  index,
  showKey,
  parentConfig,
  valueTemplateSource,
  categories,
  initialData,
  currentLanguage,
}: CreateParameterInputsProps) => {
  const [userEditedKey, setUserEditedKey] = useState(false);
  const [currentDisplayLanguage, setCurrentDisplayLanguage] =
    useState<Localization>(currentLanguage);
  const [currentDescriptionLanguage, setCurrentDescriptionLanguage] =
    useState<Localization>(currentLanguage);
  const [valueTemplateChangedThisSession, setValueTemplateChangedThisSession] = useState(false);
  const [isTreeSelectOpen, setIsTreeSelectOpen] = useState(false);
  const form = Form.useFormInstance();

  // Watch valueTemplateSource directly from form
  const formValueTemplateSource = Form.useWatch([index, 'valueTemplateSource'], form) ?? 'none';
  // watch transformation type changes
  const transformationType = Form.useWatch([index, 'transformationType'], form) ?? 'none';

  // watch display name and description arrays
  const displayNameArray = Form.useWatch([index, 'displayName'], form) || [
    { text: '', language: currentLanguage },
  ];
  const descriptionArray = Form.useWatch([index, 'description'], form) || [
    { text: '', language: currentLanguage },
  ];

  // get text for selected language
  const currentDisplayText =
    displayNameArray.find((item: any) => item.language === currentDisplayLanguage)?.text || '';
  const currentDescriptionText =
    descriptionArray.find((item: any) => item.language === currentDescriptionLanguage)?.text || '';

  const isCategoryField = valueTemplateSource === 'category';

  const handleValueTemplateSourceChange = (value: string) => {
    form.setFieldValue([index, 'value'], isCategoryField ? [] : '');
    setValueTemplateChangedThisSession(true);
    form.setFieldValue([index, 'valueTemplateSource'], value);
  };

  // to handle valueTemplateSource changes
  useEffect(() => {
    if (formValueTemplateSource !== 'none') {
      // if valueTemplateSource is not 'none', set transformationType to 'none'
      form.setFieldValue([index, 'transformationType'], 'none');
      form.setFieldValue([index, 'linkedParameters'], []);
    } else if (formValueTemplateSource === 'none' && valueTemplateChangedThisSession) {
      // clear value if it was changed during this session
      form.setFieldValue([index, 'value'], isCategoryField ? [] : '');

      // restore initial data if available
      if (initialData && initialData[index]) {
        const initial = initialData[index];
        if (initial.transformationType) {
          form.setFieldValue([index, 'transformationType'], initial.transformationType);
        }
        if (initial.linkedParameters) {
          form.setFieldValue([index, 'linkedParameters'], initial.linkedParameters);
        }
        if (initial.formula) {
          form.setFieldValue([index, 'formula'], initial.formula);
        }
      }
    }
  }, [
    formValueTemplateSource,
    form,
    index,
    initialData,
    valueTemplateChangedThisSession,
    isCategoryField,
  ]);

  // initialize userEditedKey if the key was autogenerated
  useEffect(() => {
    const currentKey = form.getFieldValue([index, 'name']);
    const currentDisplayName = form.getFieldValue([index, 'displayNameText']);

    if (currentKey && currentDisplayName && showKey) {
      // Check if the current key was auto-generated from the display name
      const expectedGenerated = generateNameFromDisplayName(currentDisplayName);
      const wasAutoGenerated = currentKey === expectedGenerated;
      setUserEditedKey(!wasAutoGenerated);
    }
  }, []);

  // auto-generate name from display name
  useEffect(() => {
    const germanDisplayName = displayNameArray.find((item: any) => item.text != '')?.text || '';
    const shouldAutoGenerate = !initialData || initialData.length === 0;
    if (germanDisplayName && showKey && !userEditedKey && shouldAutoGenerate) {
      const suggestion = generateNameFromDisplayName(germanDisplayName);
      form.setFieldValue([index, 'name'], suggestion);
    }
  }, [displayNameArray, form, index, showKey, userEditedKey, initialData]);

  // handle display name text change
  const handleDisplayNameChange = (text: string) => {
    const updatedArray = [...displayNameArray];
    const existingIndex = updatedArray.findIndex(
      (item: any) => item.language === currentDisplayLanguage,
    );

    if (existingIndex >= 0) {
      updatedArray[existingIndex] = { text, language: currentDisplayLanguage };
    } else {
      updatedArray.push({ text, language: currentDisplayLanguage });
    }

    form.setFieldValue([index, 'displayName'], updatedArray);
  };

  // handle display name language change
  const handleDisplayLanguageChange = (language: Localization) => {
    setCurrentDisplayLanguage(language);
  };

  // description text change
  const handleDescriptionChange = (text: string) => {
    const updatedArray = [...descriptionArray];
    const existingIndex = updatedArray.findIndex(
      (item: any) => item.language === currentDescriptionLanguage,
    );

    if (existingIndex >= 0) {
      updatedArray[existingIndex] = { text, language: currentDescriptionLanguage };
    } else {
      updatedArray.push({ text, language: currentDescriptionLanguage });
    }

    form.setFieldValue([index, 'description'], updatedArray);
  };

  // description language change
  const handleDescriptionLanguageChange = (language: Localization) => {
    setCurrentDescriptionLanguage(language);
  };

  // validation rule for name field
  const validateName = (_: any, value: string) => {
    if (!value) return Promise.resolve();
    const validPattern = /^[a-zA-Z0-9\-_+]+$/;
    if (!validPattern.test(value)) {
      return Promise.reject(
        new Error(
          'Name can only contain letters, numbers, hyphens (-), underscores (_), and plus signs (+)',
        ),
      );
    }
    return Promise.resolve();
  };

  // get available parameters for linking
  const getParametersAsTree = (config: Config): any[] => {
    const buildTreeNode = (params: Parameter[], parentPath: string[] = []): any[] => {
      return params
        .map((param) => {
          if (!param.id || !param.name) return null;

          const currentPath = [...parentPath, param.name];
          const displayName =
            param.displayName.find((item) => item.language === currentLanguage)?.text || param.name;
          const pathString = currentPath.join('.');

          const node: any = {
            //title: `${displayName} (${pathString})`,
            title: displayName,
            value: param.id,
            key: param.id,
            path: currentPath,
          };

          // if sub-parameters exist
          if (param.subParameters && param.subParameters.length > 0) {
            const children = buildTreeNode(param.subParameters, currentPath).filter(Boolean);
            if (children.length > 0) {
              node.children = children;
            }
          }
          //console.log(node);

          return node;
        })
        .filter(Boolean);
    };

    return buildTreeNode(config.content);
  };

  const parametersTree = parentConfig ? getParametersAsTree(parentConfig) : [];

  // variable names for formula type
  const linkedParams = Form.useWatch([index, 'linkedParameters'], form) || [];

  // tagRender for formula that includes variable names
  const formulaTagRender = (props: any) => {
    const { label, closable, onClose, value } = props;
    const selectedIndex = linkedParams.findIndex((param: string) => param === value);
    const displayLabel = selectedIndex >= 0 ? `$IN${selectedIndex + 1}: ${label}` : label;

    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <Tag
        color="purple"
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginInlineEnd: 4 }}
      >
        {displayLabel}
      </Tag>
    );
  };

  // determine if transformation needs linked parameters
  const needsLinkedParameters = (type: string) => {
    return ['manual', 'linked', 'algorithm'].includes(type);
  };

  // helper to handle linked parameter change
  const handleLinkedParametersChange = (value: string | string[]) => {
    const transformType = form.getFieldValue([index, 'transformationType']);

    // single selection types make sure to only keep one value
    if (['manual', 'linked'].includes(transformType) && Array.isArray(value)) {
      // only the last selected value for single selection
      const singleValue = value.length > 0 ? [value[value.length - 1]] : [];
      form.setFieldValue([index, 'linkedParameters'], singleValue);
    } else {
      // multiple selection (algorithm) or initial single selection
      form.setFieldValue([index, 'linkedParameters'], Array.isArray(value) ? value : [value]);
    }
  };
  // determine if transformation type should be disabled
  const isTransformationDisabled = formValueTemplateSource !== 'none';
  const isAdminLocked = initialData?.[index]?.origin === 'admin';
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card size="small" style={{ background: 'rgba(0,0,0,0.02)', height: '140px' }}>
          <Typography.Paragraph strong style={{ margin: '0 0 8px 0' }}>
            Display name
          </Typography.Paragraph>

          {/* this is the hidden field to store the full array */}
          <Form.Item name={[index, 'displayName']} hidden>
            <Input />
          </Form.Item>

          <Form.Item
            rules={[{ required: false, message: 'Please fill out the Display Name' }]}
            style={{ marginBottom: '8px' }}
          >
            <Input
              size="small"
              value={currentDisplayText}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              disabled={isAdminLocked}
            />
          </Form.Item>

          <Form.Item
            rules={[{ required: false, message: 'Please fill out the Language' }]}
            style={{ marginBottom: '0' }}
          >
            <Select
              size="small"
              showSearch={{
                filterSort: (optionA, optionB) =>
                  (optionA?.label ?? '')
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? '').toLowerCase()),
                optionFilterProp: 'label',
              }}
              placeholder="Search to Select"
              options={languageItemsSelect}
              value={currentDisplayLanguage}
              onChange={handleDisplayLanguageChange}
              disabled={isAdminLocked}
            />
          </Form.Item>
        </Card>
        {showKey && (
          <Form.Item
            name={[index, 'name']}
            label="Parameter"
            rules={[
              { required: true, message: 'Please fill out the Name' },
              { validator: validateName },
            ]}
            style={{ marginTop: '12px' }}
          >
            <Input onChange={() => setUserEditedKey(true)} disabled={isAdminLocked} />
          </Form.Item>
        )}
      </Col>

      <Col span={12}>
        <Card size="small" style={{ background: 'rgba(0,0,0,0.02)', height: '215px' }}>
          <Typography.Paragraph strong style={{ margin: '0 0 8px 0' }}>
            Description
          </Typography.Paragraph>

          {/* this is the hidden field to store the full array */}
          <Form.Item name={[index, 'description']} hidden>
            <Input />
          </Form.Item>

          <Form.Item
            rules={[{ required: false, message: 'Please fill out the Description' }]}
            style={{ marginBottom: '8px' }}
          >
            <TextArea
              rows={5}
              size="small"
              value={currentDescriptionText}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              disabled={isAdminLocked}
            />
          </Form.Item>
          <Form.Item
            rules={[{ required: false, message: 'Please fill out the Language' }]}
            style={{ marginBottom: '0' }}
          >
            <Select
              size="small"
              placeholder="Search to Select"
              showSearch={{
                filterSort: (optionA, optionB) =>
                  (optionA?.label ?? '')
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? '').toLowerCase()),
                optionFilterProp: 'label',
              }}
              options={languageItemsSelect}
              value={currentDescriptionLanguage}
              onChange={handleDescriptionLanguageChange}
              disabled={isAdminLocked}
            />
          </Form.Item>
        </Card>
      </Col>
      <Col span={24}>
        <Row gutter={12}>
          <Col span={isCategoryField ? 16 : 8}>
            <Form.Item
              name={[index, 'value']}
              label={isCategoryField ? 'Categories' : 'Value'}
              rules={[
                {
                  required: false,
                  message: isCategoryField
                    ? 'Please select categories'
                    : 'Please fill out the Value',
                },
              ]}
            >
              {isCategoryField ? (
                <Select
                  mode="tags"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Please select"
                  options={categories}
                  disabled={
                    transformationType === 'linked' ||
                    transformationType === 'algorithm' ||
                    (formValueTemplateSource !== 'none' && valueTemplateChangedThisSession)
                  }
                />
              ) : (
                <Input
                  disabled={
                    !isAdminLocked &&
                    (transformationType === 'linked' ||
                      transformationType === 'algorithm' ||
                      (formValueTemplateSource !== 'none' && valueTemplateChangedThisSession))
                  }
                />
              )}
            </Form.Item>
          </Col>
          {!isCategoryField && (
            <Col span={8}>
              <Form.Item
                name={[index, 'unit']}
                label="Unit"
                rules={[{ required: false, message: 'Please fill out the Unit' }]}
              >
                <Input disabled={isAdminLocked} />
              </Form.Item>
            </Col>
          )}
          <Col span={8}>
            <Form.Item
              name={[index, 'transformationType']}
              label={
                //"Transformation-Type"
                <span>
                  Transformation-Type{' '}
                  <Tooltip
                    placement="top"
                    title={
                      <>
                        <div>
                          <strong>None:</strong> Value can be set directly. It is not linked to any
                          other input parameter and is never changed automatically.
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Manual:</strong> When the linked parameter&apos;s value is
                          updated, this value will be cleared and can be manually set again.
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Linked:</strong> The value is always identical to the linked
                          parameter&apos;s value. Any linked value change will be copied over.
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Formula:</strong> A JSONata formula can be used to automatically
                          update this value whenever one of the linked parameter&apos;s values is
                          updated.
                        </div>
                      </>
                    }
                  >
                    <QuestionCircleOutlined
                      style={{ fontSize: '12px', color: '#8c8c8c', cursor: 'help' }}
                    />
                  </Tooltip>
                </span>
              }
              rules={[{ required: false, message: 'Please select a transformation type' }]}
            >
              <Select
                options={[
                  { label: 'None', value: 'none' },
                  { label: 'Manual', value: 'manual' },
                  { label: 'Linked', value: 'linked' },
                  { label: 'Formula', value: 'algorithm' },
                ]}
                onChange={() => form.setFieldValue([index, 'linkedParameters'], [])}
                disabled={isTransformationDisabled || isAdminLocked}
              />
            </Form.Item>
          </Col>
        </Row>
      </Col>

      {/* transformation fields */}
      {transformationType !== 'none' && !isTransformationDisabled && (
        <Col span={24}>
          <Card size="small" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <Typography.Paragraph strong style={{ margin: '0 0 12px 0' }}>
              Transformation Configuration
            </Typography.Paragraph>

            {/* linked parameters */}
            {needsLinkedParameters(transformationType) && (
              <Form.Item
                name={[index, 'linkedParameters']}
                label={
                  transformationType === 'algorithm'
                    ? 'Linked Parameters (Multiple)'
                    : `Linked Parameter (${transformationType})`
                }
                rules={[
                  {
                    required: true,
                    message: `Please select ${transformationType === 'algorithm' ? 'linked parameters' : 'a linked parameter'}`,
                  },
                ]}
                style={{ marginBottom: transformationType === 'algorithm' ? '12px' : '8px' }}
              >
                <TreeSelect
                  treeData={parametersTree}
                  multiple={transformationType === 'algorithm'}
                  maxTagCount={transformationType === 'algorithm' ? undefined : 1}
                  allowClear={true}
                  tagRender={transformationType === 'algorithm' ? formulaTagRender : undefined}
                  style={{ width: '100%' }}
                  placeholder={
                    transformationType === 'algorithm'
                      ? 'Select multiple parameters (will show as $IN1, $IN2, etc.)'
                      : 'Select one parameter'
                  }
                  treeDefaultExpandAll={true}
                  treeExpandAction="click"
                  showSearch={{ treeNodeFilterProp: 'title' }}
                  styles={{ popup: { root: { maxHeight: 600, overflow: 'auto' } } }}
                  virtual={false}
                  onChange={handleLinkedParametersChange}
                  disabled={isAdminLocked}
                  onOpenChange={(open) => setIsTreeSelectOpen(open)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && isTreeSelectOpen) {
                      e.stopPropagation();
                    }
                  }}
                />
              </Form.Item>
            )}

            {/* selected parameter info for manual or autimatic */}
            {['manual', 'linked'].includes(transformationType) && linkedParams.length > 0 && (
              <div
                style={{
                  marginBottom: '8px',
                  padding: '6px',
                  backgroundColor: 'rgba(24, 144, 255, 0.1)',
                  borderRadius: '4px',
                }}
              >
                <Typography.Text strong style={{ fontSize: '11px' }}>
                  {transformationType.charAt(0).toUpperCase() + transformationType.slice(1)}{' '}
                  Transformation Source:
                </Typography.Text>
                <div style={{ marginTop: '2px' }}>
                  {linkedParams.map((paramId: string) => {
                    // finf the parameter title
                    const findNodeTitle = (nodes: any[], targetValue: string): string => {
                      if (!nodes || nodes.length === 0) return targetValue;
                      for (const node of nodes) {
                        if (node?.value === targetValue) {
                          return node.title || targetValue;
                        }
                        if (node?.children && node.children.length > 0) {
                          const childTitle = findNodeTitle(node.children, targetValue);
                          if (childTitle !== targetValue) return childTitle;
                        }
                      }
                      return targetValue;
                    };

                    const paramName = findNodeTitle(parametersTree, paramId);
                    return (
                      <Tag key={paramId} color="blue">
                        {paramName}
                      </Tag>
                    );
                  })}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                  {transformationType === 'manual' &&
                    "Manual:  When the linked parameter's value is updated, this value will be cleared and can be manually set again."}
                  {transformationType === 'linked' &&
                    "Linked: The value is always identical to the linked parameter's value. Any linked value change will be copied over."}
                </Typography.Text>
              </div>
            )}

            {/* formula input field for algorith, type */}
            {transformationType === 'algorithm' && (
              <Form.Item
                name={[index, 'formula']}
                label="Formula"
                rules={[{ required: true, message: 'Please enter a formula' }]}
                style={{ marginBottom: '0' }}
              >
                <TextArea
                  rows={2}
                  placeholder="Enter formula using variable names (e.g., $IN1 + $IN2 * 0.5)"
                  disabled={isAdminLocked}
                />
              </Form.Item>
            )}
          </Card>
        </Col>
      )}

      {/* Advanced Section TODO */}
      <Col span={24} style={{ marginTop: '16px' }}>
        <Collapse
          items={[
            {
              key: 'advanced',
              label: 'Advanced Settings',
              forceRender: true,
              children: (
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      name={[index, 'parameterType']}
                      label="Parameter Type"
                      initialValue="none"
                    >
                      <Select
                        options={[
                          { label: 'None', value: 'none' },
                          { label: 'Meta', value: 'meta' },
                          { label: 'Content', value: 'content' },
                        ]}
                        disabled={isAdminLocked}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={[index, 'structureVisible']}
                      label="Structure Visible"
                      initialValue="yes"
                    >
                      <Select
                        options={[
                          { label: 'Yes', value: 'yes' },
                          { label: 'No', value: 'no' },
                        ]}
                        disabled={isAdminLocked}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={[index, 'valueTemplateSource']}
                      label="Template Source for Value"
                      initialValue="none"
                    >
                      <Select
                        options={[
                          { label: 'None', value: 'none' },
                          { label: 'Name', value: 'name' },
                          { label: 'Short Name', value: 'shortName' },
                          { label: 'Category', value: 'category' },
                          { label: 'Description', value: 'description' },
                        ]}
                        disabled={isAdminLocked}
                        onChange={handleValueTemplateSourceChange}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Col>
    </Row>
  );
};

export default AasCreateParameterModal;
