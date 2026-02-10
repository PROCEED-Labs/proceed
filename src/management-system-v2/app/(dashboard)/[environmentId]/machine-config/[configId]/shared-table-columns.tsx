import React from 'react';
import { TableProps, Tooltip, Row } from 'antd';
import { Parameter, VirtualParameter, Config } from '@/lib/data/machine-config-schema';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Localization } from '@/lib/data/locale';
interface GetTableColumnsParams {
  editable: boolean;
  parentConfig: Config;
  currentLanguage: Localization;
  actionBarGenerator: (record: Parameter | VirtualParameter) => React.ReactNode;
}

// helper function to determine effective parameter type
const getEffectiveParameterType = (
  param: Parameter | VirtualParameter,
  parentConfig: Config,
): 'meta' | 'content' => {
  if (param.parameterType !== 'none') {
    return param.parameterType;
  }

  // find parent in the config
  const findParentInSubParameters = (searchId: string, param: Parameter): Parameter | null => {
    for (const sub of param.subParameters) {
      if (sub.id === searchId) {
        return param;
      }
      if (sub.subParameters.length > 0) {
        const found = findParentInSubParameters(searchId, sub);
        if (found) return found;
      }
    }
    return null;
  };

  const findParent = (
    searchId: string,
    parent: Config | Parameter,
    parentType: 'config' | 'parameter',
  ): Parameter | null => {
    if (parentType === 'config') {
      const configParent = parent as Config;
      for (const p of configParent.content) {
        if (p.subParameters.some((sub: { id: string }) => sub.id === searchId)) {
          return p;
        }
        const found = findParentInSubParameters(searchId, p);
        if (found) return found;
      }
    } else {
      return findParentInSubParameters(searchId, parent as Parameter);
    }
    return null;
  };

  const parent = findParent(param.id, parentConfig, 'config');

  if (parent) {
    return getEffectiveParameterType(parent, parentConfig);
  }

  return 'content';
};

export const getTableColumns = ({
  editable,
  parentConfig,
  actionBarGenerator,
  currentLanguage,
}: GetTableColumnsParams): TableProps<Parameter | VirtualParameter>['columns'] => [
  {
    title: '',
    render: (id, record) => <Row justify="end">{editable && actionBarGenerator(record)}</Row>,
    width: 60,
    align: 'right',
    hidden: !editable,
    fixed: editable ? 'right' : undefined, //keeing the action visible
  },
  {
    title: (
      <span>
        Name{' '}
        <Tooltip
          placement="top"
          title='This column shows the "Display Name" of a parameter. If it is not filled it shows the "Name" field of a parameter in italic.'
        >
          <QuestionCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c', cursor: 'help' }} />
        </Tooltip>
      </span>
    ),
    dataIndex: 'key',
    ellipsis: {
      showTitle: false,
    },
    render: (id, record) => {
      let displayNameText = record.displayName.find(
        (item) => item.language === currentLanguage,
      )?.text;
      const nameText = record.name;

      // If display name exists, show it; otherwise show name in italic
      const text = displayNameText || nameText || ' ';
      const isItalic = !displayNameText && nameText;
      const hasChanges = (record as any).hasChanges === true;

      // check if it Is a leaf parameter with no value; red takes priority
      const isLeafParameter = !record.subParameters || record.subParameters.length === 0;
      const isVirtualParameter =
        'valueTemplateSource' in record && (record as any).valueTemplateSource !== 'none';
      const effectiveType = getEffectiveParameterType(record, parentConfig);
      const shouldStyleAsEmpty =
        effectiveType === 'content' &&
        (!(record as Parameter).value || (record as Parameter).value === '') &&
        isLeafParameter &&
        !isVirtualParameter;

      return (
        <Tooltip placement="topLeft" title={text}>
          <span
            style={{
              ...(isItalic ? { fontStyle: 'italic' } : undefined),
              ...(shouldStyleAsEmpty && { color: '#8B0000' }),
              ...(!shouldStyleAsEmpty &&
                hasChanges &&
                parentConfig.templateId && { color: '#0d6efd' }),
            }}
          >
            {text}
          </span>
        </Tooltip>
      );
    },
    width: 120,
  },
  {
    title: 'Value',
    dataIndex: 'value',
    ellipsis: {
      showTitle: false,
    },
    render: (id, record) => {
      let displayValue = (record as Parameter).value || ' ';
      if ('valueTemplateSource' in record) {
        displayValue = parentConfig[(record as VirtualParameter).valueTemplateSource].value;
      }
      const hasChanges = (record as any).hasChanges === true;

      const isLeafParameter = !record.subParameters || record.subParameters.length === 0;
      const isVirtualParameter =
        'valueTemplateSource' in record && (record as any).valueTemplateSource !== 'none';
      const effectiveType = getEffectiveParameterType(record, parentConfig);
      const shouldStyleAsEmpty =
        effectiveType === 'content' &&
        (!(record as Parameter).value || (record as Parameter).value === '') &&
        isLeafParameter &&
        !isVirtualParameter;

      return (
        <Tooltip placement="topLeft" title={displayValue}>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
              ...(shouldStyleAsEmpty && { color: '#8B0000' }),
              ...(!shouldStyleAsEmpty &&
                hasChanges &&
                parentConfig.templateId && { color: '#0d6efd' }),
            }}
          >
            {displayValue || ' '}
          </div>
        </Tooltip>
      );
    },

    width: 100,
  },
  {
    title: 'Unit',
    dataIndex: 'unitRef',
    render: (unitRef, record) => {
      const hasChanges = (record as any).hasChanges === true;

      const isLeafParameter = !record.subParameters || record.subParameters.length === 0;
      const isVirtualParameter =
        'valueTemplateSource' in record && (record as any).valueTemplateSource !== 'none';
      const effectiveType = getEffectiveParameterType(record, parentConfig);
      const shouldStyleAsEmpty =
        effectiveType === 'content' &&
        (!(record as Parameter).value || (record as Parameter).value === '') &&
        isLeafParameter &&
        !isVirtualParameter;

      return (
        <span
          style={{
            ...(shouldStyleAsEmpty && { color: '#8B0000' }),
            ...(!shouldStyleAsEmpty &&
              hasChanges &&
              parentConfig.templateId && { color: '#0d6efd' }),
          }}
        >
          {unitRef || ' '}
        </span>
      );
    },
    width: 60,
  },
  {
    title: 'Parameter Description',
    dataIndex: 'description',
    ellipsis: {
      showTitle: false,
    },
    render: (entries, record) => {
      let text =
        entries.find((entry: { language: string }) => entry.language === currentLanguage)?.text ||
        ' ';
      const hasChanges = (record as any).hasChanges === true;

      const isLeafParameter = !record.subParameters || record.subParameters.length === 0;
      const isVirtualParameter =
        'valueTemplateSource' in record && (record as any).valueTemplateSource !== 'none';
      const effectiveType = getEffectiveParameterType(record, parentConfig);
      const shouldStyleAsEmpty =
        effectiveType === 'content' &&
        (!(record as Parameter).value || (record as Parameter).value === '') &&
        isLeafParameter &&
        !isVirtualParameter;

      //text = text || entries?.[0]?.text || ' ';
      return (
        <Tooltip placement="topLeft" title={text}>
          <span
            style={{
              ...(shouldStyleAsEmpty && { color: '#8B0000' }),
              ...(!shouldStyleAsEmpty &&
                hasChanges &&
                parentConfig.templateId && { color: '#0d6efd' }),
            }}
          >
            {text}
          </span>
        </Tooltip>
      );
    },
    width: 150,
  },
  {
    title: 'Transformation',
    ellipsis: {
      showTitle: false,
    },
    render: (record) => {
      const transformation = (record as any).transformation;
      const transformationType = transformation?.transformationType || 'none';
      const hasChanges = (record as any).hasChanges === true;

      const isLeafParameter = !record.subParameters || record.subParameters.length === 0;
      const isVirtualParameter =
        'valueTemplateSource' in record && (record as any).valueTemplateSource !== 'none';
      const effectiveType = getEffectiveParameterType(record, parentConfig);
      const shouldStyleAsEmpty =
        effectiveType === 'content' &&
        (!record.value || record.value === '') &&
        isLeafParameter &&
        !isVirtualParameter;

      const tooltipMessages: Record<string, string> = {
        none: 'Value can be set directly. It is not linked to any other input parameter and is never changed automatically.',
        manual:
          'Value can be set directly, but is linked to an input parameter. If this changes, Value is cleared and must be reset manually.',
        linked:
          'Value is linked to an input parameter, from which Value is automatically copied 1-to-1.',
        algorithm:
          'Value is linked to several input parameters, which are used to calculate a value using a formula.',
      };

      const linkedCount =
        transformation && transformationType !== 'none'
          ? Object.keys(transformation.linkedInputParameters).length
          : 0;

      const typeDisplay =
        transformationType === 'algorithm'
          ? 'Formula'
          : transformationType === 'none'
            ? 'None'
            : transformationType.charAt(0).toUpperCase() + transformationType.slice(1);

      const displayText =
        transformationType === 'none' ? typeDisplay : `${typeDisplay} (${linkedCount})`;

      const textStyle =
        transformationType === 'none'
          ? {
              color: shouldStyleAsEmpty
                ? '#8B0000'
                : hasChanges && parentConfig.templateId
                  ? '#0d6efd'
                  : '#8c8c8c',
              fontStyle: 'italic',
            }
          : {
              color: shouldStyleAsEmpty
                ? '#8B0000'
                : hasChanges && parentConfig.templateId
                  ? '#0d6efd'
                  : 'black',
            };
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={textStyle}>{displayText}</span>
          <Tooltip placement="top" title={tooltipMessages[transformationType]}>
            <QuestionCircleOutlined
              style={{
                fontSize: '12px',
                color: shouldStyleAsEmpty
                  ? '#8B0000'
                  : hasChanges && parentConfig.templateId
                    ? '#0d6efd'
                    : '#8c8c8c',
                cursor: 'help',
              }}
            />
          </Tooltip>
        </span>
      );
    },
    width: 100,
  },
];
