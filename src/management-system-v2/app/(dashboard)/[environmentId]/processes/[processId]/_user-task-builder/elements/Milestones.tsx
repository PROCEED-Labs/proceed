import { UserComponent, useNode } from '@craftjs/core';
import useModelerStateStore from '../../use-modeler-state-store';
import { getMilestonesFromElement } from '@proceed/bpmn-helper';
import { Button } from 'antd';
import { Setting } from './utils';

type MilestonesProps = {
  milestones: { id: string; name: string; description?: string }[];
};

export const ExportMilestones: UserComponent<MilestonesProps> = ({ milestones }) => {
  return (
    <div className="user-task-form-milestones">
      <p>Update your Milestones:</p>
      {milestones &&
        milestones.map((milestone) => {
          return (
            <div className="user-task-form-milestone" key={milestone.id}>
              <label>
                Milestone ID: {milestone.id} | Name: {milestone.name} | Description:{' '}
                {milestone.description}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={`{if ${milestone.id}}{${milestone.id}}{else}0{/if}`}
                  className={`milestone-${milestone.id}`}
                  onChange={() => { }}
                />
                <output
                  name={`fulfillment_${milestone.id}`}
                >{`{if ${milestone.id}}{${milestone.id}}%{else}0%{/if}`}</output>
              </label>
            </div>
          );
        })}
    </div>
  );
};

const Milestones: UserComponent<MilestonesProps> = ({ milestones }) => {
  const {
    connectors: { connect },
  } = useNode();

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
                  onChange={() => { }}
                />
                <output>0%</output>
              </label>
            </div>
          );
        })}
    </div>
  );
};

export const MilestonesSettings = () => {
  const {
    actions: { setProp },
  } = useNode();

  const { selectedElementId, modeler } = useModelerStateStore((state) => ({
    selectedElementId: state.selectedElementId,
    modeler: state.modeler,
  }));

  function loadMilestones() {
    if (modeler && selectedElementId) {
      const userTask = modeler.getElement(selectedElementId);

      if (userTask) {
        const ms = getMilestonesFromElement(userTask.businessObject);
        setProp((props: MilestonesProps) => {
          props.milestones = ms;
        });
      }
    }
  }

  return <Setting label="Refresh" control={<Button onClick={loadMilestones}>Refresh</Button>} />;
};

Milestones.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: MilestonesSettings,
  },
  props: {
    milestones: [],
  },
};

export default Milestones;
