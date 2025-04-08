import { UserComponent, useNode } from '@craftjs/core';
import useModelerStateStore from '../../use-modeler-state-store';
import { getMilestonesFromElement } from '@proceed/bpmn-helper';
import { useMemo } from 'react';

export const ExportMilestones: UserComponent = () => {
  return (
    <div className="user-task-form-milestones">
      <p>Update your Milestones:</p>
      {'{for milestone in milestones}'}
      <div className="user-task-form-milestone">
        <label>
          Milestone ID: {'{milestone.id}'} | Name: {'{milestone.name}'} | Description:{' '}
          {'{milestone.description}'}
          <input
            type="range"
            min="0"
            max="100"
            value={'{milestone.value}'}
            className={`milestone-{milestone.id}`}
            onChange={() => {}}
          />
          <output name={`fulfillment_{milestone.id}`}>{'{milestone.value}'}%</output>
        </label>
      </div>
      {'{/for}'}
    </div>
  );
};

const Milestones: UserComponent = () => {
  const {
    connectors: { connect },
  } = useNode();

  const { selectedElementId, modeler } = useModelerStateStore((state) => ({
    selectedElementId: state.selectedElementId,
    modeler: state.modeler,
  }));

  const milestones = useMemo(() => {
    if (selectedElementId && modeler) {
      const selectedElement = modeler.getElement(selectedElementId);

      if (selectedElement) return getMilestonesFromElement(selectedElement.businessObject);
    }

    return [];
  }, [selectedElementId, modeler]);

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-milestones"
    >
      <p>Update your Milestones:</p>
      {milestones &&
        milestones.map((milestone) => {
          return (
            <div className="user-task-form-milestone" key={milestone.id}>
              <label>
                Milestone ID: {milestone.id} | Name: {milestone.name} | Description:{' '}
                {milestone.description}
                <input
                  disabled={true}
                  type="range"
                  min="0"
                  max="100"
                  value={0}
                  onChange={() => {}}
                />
                <output>0%</output>
              </label>
            </div>
          );
        })}
    </div>
  );
};

Milestones.craft = {
  rules: {
    canDrag: () => false,
  },
};

export default Milestones;
