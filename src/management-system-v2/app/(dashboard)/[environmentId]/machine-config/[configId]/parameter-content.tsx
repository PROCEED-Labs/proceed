import { useEffect, useState } from 'react';

import { Button, Col, Flex, Input, Row, Select, Space, Tooltip, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
const { Text } = Typography;

import { ParameterContent } from '@/lib/data/machine-config-schema';
import { languageItemsSelect } from '@/lib/data/locale';

import ActionButtons from './action-buttons';

export const ParameterContentHeader: React.FC<{
  parameterContent: ParameterContent;
  editable: boolean;
  onDelete: () => void;
}> = ({ parameterContent, editable, onDelete }) => (
  <Space.Compact block size="small">
    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
      <Space>
        <Text>{parameterContent.displayName}: </Text>
        <Text>{parameterContent.value}</Text>
        <Text>{parameterContent.unit}</Text>
        {parameterContent.language && <Text type="secondary">({parameterContent.language})</Text>}
      </Space>
      <ActionButtons
        editable={editable}
        options={[/* 'copy', 'edit',  //TODO */ 'delete']}
        actions={{
          delete: onDelete,
        }}
      />
    </Flex>
  </Space.Compact>
);

type ParamContentProps = {
  indexInParameter: number;
  editable: boolean;
  content: ParameterContent;
  onUpdate: (index: number, newValue: ParameterContent) => Promise<void>;
};

export const ParamContent: React.FC<ParamContentProps> = ({
  indexInParameter,
  editable,
  content,
  onUpdate,
}) => {
  const [currentName, setCurrentName] = useState(content.displayName);
  const [currentValue, setCurrentValue] = useState(content.value);
  const [currentUnit, setCurrentUnit] = useState(content.unit);

  useEffect(() => {
    if (content.displayName !== currentName) setCurrentName(content.displayName);
    if (content.value !== currentValue) setCurrentValue(content.value);
    if (content.unit !== currentUnit) setCurrentUnit(content.unit);
  }, [content]);

  const handleNameChange = async () => {
    await onUpdate(indexInParameter, { ...content, displayName: currentName });
  };

  const handleValueChange = async () => {
    await onUpdate(indexInParameter, { ...content, value: currentValue });
  };

  const handleUnitChange = async () => {
    await onUpdate(indexInParameter, { ...content, unit: currentUnit });
  };

  return (
    <div>
      {editable && (
        <>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              Display Name
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterName"
                disabled={!editable}
                onChange={(e) => setCurrentName(e.target.value)}
                value={currentName}
                onBlur={handleNameChange}
              />
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              Value
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterValue"
                disabled={!editable}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleValueChange}
                value={currentValue}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Clear">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    onUpdate(indexInParameter, { ...content, value: '' });
                  }}
                  icon={<ClearOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              Unit
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterUnit"
                disabled={!editable}
                onChange={(e) => setCurrentUnit(e.target.value)}
                onBlur={handleUnitChange}
                value={currentUnit}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Clear">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    onUpdate(indexInParameter, { ...content, unit: undefined });
                  }}
                  icon={<ClearOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              Language
            </Col>
            <Col span={20} className="gutter-row">
              <Select
                showSearch
                disabled={!editable}
                value={content.language}
                style={{ minWidth: 250 }}
                placeholder="Search to Select"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? '')
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? '').toLowerCase())
                }
                onChange={(newValue) =>
                  onUpdate(indexInParameter, { ...content, language: newValue })
                }
                options={languageItemsSelect}
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
