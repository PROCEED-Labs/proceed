import { UserComponent, useNode } from '@craftjs/core';
import useEditorStateStore from '../use-editor-state-store';
import { useContext } from 'react';
import { DragPreviewContext } from './Column';

export const ExportMilestones: UserComponent = () => {
  return (
    <div className="user-task-form-milestones">
      <p>Update your Milestones:</p>
      {'{%for milestone in milestones%}'}
      <div className="user-task-form-milestone">
        <label>
          Milestone ID: {'{%milestone.id%}'} | Name: {'{%milestone.name%}'} | Description:{' '}
          {'{%milestone.description%}'}
          <input
            type="range"
            min="0"
            max="100"
            value={'{%milestone.value%}'}
            className={`milestone-{%milestone.id%}`}
            onChange={() => {}}
          />
          <output name={`fulfillment_{%milestone.id%}`}>{'{%milestone.value%}'}%</output>
        </label>
      </div>
      {'{%/for%}'}
    </div>
  );
};

const Milestones: UserComponent = () => {
  const {
    connectors: { connect },
  } = useNode();

  const milestones = useEditorStateStore((state) => state.milestones);

  // prevent that a drag preview interacts with the drag and drop functionality of the original
  // object
  const isDragPreview = useContext(DragPreviewContext);

  return (
    <div
      ref={(r) => {
        !isDragPreview && r && connect(r);
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
