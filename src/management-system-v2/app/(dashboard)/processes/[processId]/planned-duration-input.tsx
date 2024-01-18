'use client';

import React, { useEffect, useState } from 'react';

import { Button, Col, Form, Grid, Input, InputNumber, Modal, Row, Space } from 'antd';

import { ClockCircleOutlined } from '@ant-design/icons';
import FormSubmitButton from '@/components/form-submit-button';
import { calculateTimeFormalExpression, parseISODuration } from '@proceed/bpmn-helper/src/getters';

type DurationValues = {
  years: number | null;
  months: number | null;
  days: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
};

type PlannedDurationModalProperties = {
  durationValues: DurationValues;
  show: boolean;
  close: (values?: DurationValues) => void;
};
const PlannedDurationModal: React.FC<PlannedDurationModalProperties> = ({
  durationValues,
  show,
  close,
}) => {
  const [form] = Form.useForm();

  // TODO: Create generic Modal using these widths for different viewport sizes
  const breakpoint = Grid.useBreakpoint();
  const getModalWidth = () => {
    if (breakpoint.xl) {
      return '33vw';
    }

    if (breakpoint.xs) {
      return '66vw';
    }

    return '50vw';
  };

  return (
    <Modal
      title="Edit Planned Duration"
      className="planned-duration-modal"
      width={getModalWidth()}
      centered
      open={show}
      onCancel={() => close()}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>,
        <FormSubmitButton
          key="submit"
          form={form}
          onSubmit={close}
          submitText="Save"
        ></FormSubmitButton>,
      ]}
    >
      <Form
        layout="inline"
        form={form}
        initialValues={durationValues}
        style={{ marginBlock: '1.5rem' }}
      >
        <Row gutter={16}>
          {Object.keys(durationValues).map((key) => {
            return (
              <Col span={24}>
                <Form.Item name={key} style={{ marginBottom: '0.2rem' }}>
                  <InputNumber
                    addonBefore={key.charAt(0).toUpperCase() + key.slice(1)}
                    min={0}
                  ></InputNumber>
                </Form.Item>
              </Col>
            );
          })}
        </Row>
      </Form>
    </Modal>
  );
};
type PlannedDurationInputProperties = {
  timePlannedDuration: string;
  onChange: (changedTimePlannedDuration: string) => void;
};

const PlannedDurationInput: React.FC<PlannedDurationInputProperties> = ({
  timePlannedDuration,
  onChange,
}) => {
  const [isPlannedDurationModalOpen, setIsPlannedDurationModalOpen] = useState(false);

  const durationValues = parseISODuration(timePlannedDuration);

  return (
    <>
      <Input
        addonBefore={<ClockCircleOutlined className="clock-icon" />}
        placeholder="Planned Duration"
        value={timePlannedDuration}
        onClick={() => {
          setIsPlannedDurationModalOpen(true);
        }}
      />
      <PlannedDurationModal
        durationValues={durationValues}
        show={isPlannedDurationModalOpen}
        close={(values) => {
          if (values) {
            const timeFormalExpression = calculateTimeFormalExpression(values);
            onChange(timeFormalExpression);
          }
          setIsPlannedDurationModalOpen(false);
        }}
      ></PlannedDurationModal>
    </>
  );
};

export default PlannedDurationInput;
