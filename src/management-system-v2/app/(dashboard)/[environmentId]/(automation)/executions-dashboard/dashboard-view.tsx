'use client';

import { useMemo, Fragment } from 'react';
import useDeployments from './use-deployments';
import { Card, Col, Row, Skeleton, Statistic } from 'antd';

const DashboardView: React.FC = () => {
  const { engines, deployments } = useDeployments(
    'definitionId,instances(processInstanceId,instanceState)',
  );

  const stats = useMemo(() => {
    if (!engines || !deployments) return;
    const stats = {
      numEngines: 0,
      numDeployments: 0,
      numInstances: 0,
      numRunningInstances: 0,
      numFailedInstances: 0,
      numCompletedInstances: 0,
    };

    const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
    const failedStates = [
      'ABORTED',
      'FAILED',
      'ERROR-SEMANTIC',
      'ERROR-TECHNICAL',
      'ERROR-CONSTRAINT-UNFULFILLED',
      'ERROR-UNKNOWN',
    ];

    stats.numEngines = engines.length;

    const knownDeployments: Record<string, boolean> = {};
    const knownInstances: Record<string, string[]> = {};

    for (const { definitionId, instances } of deployments) {
      if (!knownDeployments[definitionId]) {
        stats.numDeployments++;
        knownDeployments[definitionId] = true;
      }

      for (const { processInstanceId, instanceState } of instances) {
        if (!knownDeployments[processInstanceId]) {
          knownInstances[processInstanceId] = instanceState;
        } else {
          knownInstances[processInstanceId].push(...instanceState);
        }
      }

      for (const instanceState of Object.values(knownInstances)) {
        stats.numInstances++;

        if (instanceState.some((state) => activeStates.includes(state))) {
          stats.numRunningInstances++;
        } else if (instanceState.some((state) => failedStates.includes(state))) {
          stats.numFailedInstances++;
        } else {
          stats.numCompletedInstances++;
        }
      }
    }

    return {
      Engines: [
        {
          name: 'Online',
          amount: stats.numEngines,
        },
      ],
      Deployments: [
        {
          name: 'Processes Deployed',
          amount: stats.numDeployments,
        },
      ],
      Instances: [
        {
          name: 'Running',
          amount: stats.numRunningInstances,
        },
        {
          name: 'Failed',
          amount: stats.numFailedInstances,
        },
        {
          name: 'Completed',
          amount: stats.numCompletedInstances,
        },
      ],
    };
  }, [engines, deployments]);

  if (!stats) return <Skeleton active />;

  return (
    <>
      {Object.entries(stats).map(([name, entries]) => (
        <Fragment key={name}>
          <h3>{name}</h3>
          <Row key={name} gutter={16}>
            {entries.map((entry) => (
              <Col key={entry.name} span={8}>
                <Card style={{ marginBottom: '24px' }}>
                  <Statistic title={entry.name} value={entry.amount} />
                </Card>
              </Col>
            ))}
          </Row>
        </Fragment>
      ))}
    </>
  );
};

export default DashboardView;
