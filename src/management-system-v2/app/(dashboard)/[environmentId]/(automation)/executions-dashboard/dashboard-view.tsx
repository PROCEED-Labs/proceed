'use client';

import { useMemo, Fragment } from 'react';
import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/components/auth-can';
import { getAvailableSpaceMachines } from '@/lib/data/engines';
import { getDeployments } from '@/lib/data/deployment';
import { isUserErrorResponse } from '@/lib/user-error';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { getInstance } from '@/lib/data/instance';

const DashboardView: React.FC = () => {
  const space = useEnvironment();

  const { data: engines } = useQuery({
    queryFn: async () => getAvailableSpaceMachines(space.spaceId),
    refetchInterval: 1000,
    queryKey: ['space', space.spaceId, 'engines'],
  });

  const { data } = useQuery({
    queryFn: async () => {
      let deployments = await getDeployments(space.spaceId);

      if (isUserErrorResponse(deployments))
        return { deployedProcesses: [] as string[], instances: [] };

      deployments = deployments.filter((d) => !d.deleted);

      const deployedProcessIds = new Set<string>();
      const instanceIds = new Set<string>();

      for (const deployment of deployments) {
        deployedProcessIds.add(deployment.processId);
        for (const instanceId of deployment.instances) {
          instanceIds.add(instanceId);
        }
      }

      const instances = await asyncMap([...instanceIds], async (id) => {
        const instance = await getInstance(space.spaceId, id);
        if (isUserErrorResponse(instance)) return undefined;
        return instance;
      }).nonNullable();

      return { deployedProcesses: [...deployedProcessIds], instances };
    },
    refetchInterval: 1000,
    queryKey: ['space', space.spaceId, 'deployments'],
  });

  const stats = useMemo(() => {
    if (!engines || !data) return;
    const stats = {
      numEngines: 0,
      numDeployments: data.deployedProcesses.length,
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

    for (const {
      state: { processInstanceId, instanceState },
    } of data.instances) {
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
  }, [engines, data]);

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
