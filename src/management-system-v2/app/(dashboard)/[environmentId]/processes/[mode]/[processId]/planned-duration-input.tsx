'use client';

import React, { useEffect, useState } from 'react';
import styles from './planned-duration-input.module.scss';

import { Button, Col, Form, Grid, Input, InputNumber, Modal, Row, Tooltip } from 'antd';

import { ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import FormSubmitButton from '@/components/form-submit-button';
import { parseISODuration } from '@proceed/bpmn-helper/src/getters';
import { calculateTimeFormalExpression } from '@/lib/helpers/timeHelper';
import { Element } from 'bpmn-js/lib/model/Types';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { hasEventDefinition } from 'bpmn-js/lib/util/DiUtil';
import useModelerStateStore from './use-modeler-state-store';
import { updateMetaData } from './properties-panel';

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
export const PlannedDurationModal: React.FC<PlannedDurationModalProperties> = ({
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
      <Form form={form} initialValues={durationValues} style={{ marginBlock: '1.5rem' }}>
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
  readOnly?: boolean;
};

const PlannedDurationInput: React.FC<PlannedDurationInputProperties> = ({
  timePlannedDuration,
  onChange,
  readOnly = false,
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
        (hours ? `${hours} h, ` : '') +
        (minutes ? `${minutes} m, ` : '') +
        (seconds ? `${seconds} s ` : '');
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
        onClick={() => setIsPlannedDurationModalOpen(true)}
        disabled={readOnly}
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

export function isTimerEvent(element?: Element) {
  if (!element) return false;

  if (!bpmnIs(element, 'bpmn:Event')) return false;

  const eventDefinitions = element.businessObject.eventDefinitions;
  return eventDefinitions?.some((definition: any) =>
    bpmnIs(definition, 'bpmn:TimerEventDefinition'),
  );
}

function getTimer(element?: Element): string {
  if (!isTimerEvent(element)) return '';

  const eventDefinitions = element!.businessObject.eventDefinitions;
  return (
    eventDefinitions!.find((definition: any) => bpmnIs(definition, 'bpmn:TimerEventDefinition'))
      ?.timeDuration?.body || ''
  );
}

type TimerEventButtonProps = {
  element?: Element;
};

export const TimerEventButton: React.FC<TimerEventButtonProps> = ({ element }) => {
  const [isPlannedDurationModalOpen, setIsPlannedDurationModalOpen] = useState(false);
  const [durationValues, setDurationValues] = useState(parseISODuration(''));

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (isTimerEvent(element)) {
      setDurationValues(parseISODuration(getTimer(element)));
    }
  }, [element]);

  return (
    <>
      <Tooltip title="Edit Timer Event Duration">
        <Button
          icon={<ClockCircleOutlined />}
          onClick={() => setIsPlannedDurationModalOpen(true)}
        />
      </Tooltip>
      <PlannedDurationModal
        durationValues={durationValues}
        show={isPlannedDurationModalOpen}
        close={async (values) => {
          if (modeler && element && values) {
            const modeling = modeler.getModeling();
            const factory = modeler.getFactory();

            const eventDefinitions = element.businessObject.eventDefinitions.filter(
              (definition: any) => !bpmnIs(definition, 'bpmn:TimerEventDefinition'),
            );
            const newTimer = values ? calculateTimeFormalExpression(values) : '';
            const timeDuration = newTimer
              ? factory.create('bpmn:FormalExpression', { body: newTimer })
              : null;
            const timerEventDefinition = factory.create('bpmn:TimerEventDefinition', {
              timeDuration,
            });
            eventDefinitions.push(timerEventDefinition);

            await updateMetaData(modeler, element, 'timePlannedDuration', newTimer);
            modeling.updateProperties(element, {
              eventDefinitions,
            });
            setDurationValues({ ...values });
          }

          setIsPlannedDurationModalOpen(false);
        }}
      ></PlannedDurationModal>
    </>
  );
};

export default PlannedDurationInput;
