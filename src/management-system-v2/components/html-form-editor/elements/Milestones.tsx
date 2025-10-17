import { UserComponent, useNode } from '@craftjs/core';
import useEditorStateStore from '../use-editor-state-store';

export const ExportMilestones: UserComponent = () => {
  return (
    <div className="user-task-form-milestones">
      <p>Update your Milestones:</p>
      {'{{for milestone in milestones}}'}
      <div className="user-task-form-milestone">
        <label>
          Milestone ID: {'{{milestone.id}}'} | Name: {'{{milestone.name}}'} | Description:{' '}
          {'{{milestone.description}}'}
          <input
            type="range"
            min="0"
            max="100"
            value={'{{milestone.value}}'}
            className={`milestone-{{milestone.id}}`}
            onChange={() => {}}
          />
          <output name={`fulfillment_{{milestone.id}}`}>{'{{milestone.value}}'}%</output>
        </label>
      </div>
      {'{{/for}}'}
    </div>
  );
};

const Milestones: UserComponent = () => {
  const {
    connectors: { connect },
  } = useNode();

  const { milestones } = useEditorStateStore();

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
