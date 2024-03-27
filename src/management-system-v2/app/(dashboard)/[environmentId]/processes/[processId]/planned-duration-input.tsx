'use client';

import React, { useEffect, useState } from 'react';
import styles from './planned-duration-input.module.scss';

import { Button, Col, Form, Grid, Input, InputNumber, Modal, Row } from 'antd';

import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import FormSubmitButton from '@/components/form-submit-button';
import { parseISODuration } from '@proceed/bpmn-helper/src/getters';
import { calculateTimeFormalExpression } from '@/lib/helpers/timeHelper';
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

  useEffect(() => {
    const { years, months, days, hours, minutes, seconds } = durationValues;
    form.setFieldsValue({
      years: years || 0,
      months: months || 0,
      days: days || 0,
      hours: hours || 0,
      minutes: minutes || 0,
      seconds: seconds || 0,
    });
  }, [form, durationValues]);

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
      className={styles.PlannedDurationModal}
      width={getModalWidth()}
      style={{ maxWidth: '400px' }}
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
              <Col span={24} key={key}>
                <Form.Item name={key} style={{ marginBottom: '0.2rem' }}>
                  <InputNumber
                    name={key}
                    defaultValue={0}
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

  const durationString = ((durationValues: DurationValues) => {
    const { years, months, days, hours, minutes, seconds } = durationValues;

    const numberOfDefinedDurationValues = Object.values(durationValues).filter(
      (val) => typeof val === 'number',
    ).length;

    let durationString = '';

    if (numberOfDefinedDurationValues < 4) {
      durationString =
        (years ? `${years} Years, ` : '') +
        (months ? `${months} Months, ` : '') +
        (days ? `${days} Days, ` : '') +
        (hours ? `${hours} Hours, ` : '') +
        (minutes ? `${minutes} Minutes, ` : '') +
        (seconds ? `${seconds} Seconds ` : '');
    } else {
      durationString =
        (years ? `${years} Y, ` : '') +
        (months ? `${months} M, ` : '') +
        (days ? `${days} D, ` : '') +
        (hours ? `${hours} H, ` : '') +
        (minutes ? `${minutes} M, ` : '') +
        (seconds ? `${seconds} S ` : '');
    }

    return durationString.replace(/,\s*$/, ''); // if string ends with a comma, remove that
  })(durationValues);

  return (
    <>
      <Input
        addonBefore={<ClockCircleOutlined className="clock-icon" />}
        readOnly
        value={durationString}
        placeholder="Planned Duration"
        suffix={
          <EditOutlined
            onClick={() => {
              setIsPlannedDurationModalOpen(true);
            }}
            data-testid="plannedDurationInputEdit"
          ></EditOutlined>
        }
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
