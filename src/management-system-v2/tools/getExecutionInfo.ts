import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getDeployment } from '@/lib/engines/server-actions';
import { omit, pick } from '@/lib/helpers/javascriptHelpers';
import { getRoles } from '@/lib/data/roles';
import { truthyFilter } from '@/lib/typescript-utils';
import { getFullMembersWithRoles } from '@/lib/data/db/iam/memberships';
import { getElementById, toBpmnObject } from '@proceed/bpmn-helper';
import { InstanceInfo } from '@/lib/engines/deployment';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  instanceId: z.string().describe('The id of the process execution to inspect.'),
});

// Define tool metadata
export const metadata = {
  name: 'get-execution-info',
  description:
    "Returns information about the current state of a process' execution in the form of a json file.",
  annotations: {
    title: 'Get execution info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function startExecutionInfo({
  userCode,
  instanceId,
}: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);
    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    let accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.executions'],
      [
        ['view', 'Execution'],
        ['view', 'Machine'],
      ],
    );

    if (!accessible)
      return 'Error: The user cannot access execution information in this space. This might be due to a space wide setting or due to the user not having the permission to view execution information.';

    const [definitionId] = instanceId.split('-_');

    const deployment = await getDeployment(environmentId, definitionId, ability);

    if (!deployment) return 'Could not find an execution with the given id.';

    const instance = deployment.instances.find((i) => i.processInstanceId === instanceId);

    if (!instance) return 'Could not find an execution with the given id.';

    const usersWithRoles = await getFullMembersWithRoles(environmentId, ability);

    let roles = await getRoles(environmentId, ability);
    if (isUserErrorResponse(roles)) roles = [];

    const users = Object.fromEntries(
      usersWithRoles.map((user) => [
        user.id,
        {
          ...pick(user, ['id', 'username', 'firstName', 'lastName', 'email']),
          roles: user.roles.map((r) => pick(r, ['id', 'name', 'description'])),
        },
      ]),
    );
    const roleMap = Object.fromEntries(
      roles.map((role) => [role.id, pick(role, ['id', 'name', 'description'])]),
    );

    const idToUser = (id: string) => {
      if (id in users) return { type: 'user', ...users[id] };
    };

    const idToRole = (id: string) => {
      if (id in roleMap) return { type: 'role', ...roleMap[id] };
    };

    const version = deployment.versions.find((v) => v.versionId === instance.processVersion);

    const bpmnObj = version ? await toBpmnObject(version.bpmn) : undefined;
    const idToName = (id: string) => {
      if (bpmnObj) {
        return (getElementById(bpmnObj, id) as any)?.name;
      }
    };

    const transformPerformerInfo = <
      T extends {
        actualOwner?: string[];
        performers?: InstanceInfo['tokens'][number]['performers'];
      },
    >(
      input: T,
    ) => {
      return {
        ...omit(input, ['actualOwner', 'performers']),
        actualPerformers: input.actualOwner
          ? input.actualOwner.map(idToUser).filter(truthyFilter)
          : undefined,
        potentialPerformers: input.performers
          ? {
            user: input.performers.user.map(idToUser).filter(truthyFilter),
            roles: input.performers.roles.map(idToRole).filter(truthyFilter),
          }
          : undefined,
      };
    };

    // extend the instance information object with data that might be useful to the user and the LLM
    // the most significant changes are mapping from user/role ids to actual user/role information
    // insertions of process element names alongside process element ids
    const mappedInstance = {
      // this information is not needed by/already known to the LLM
      ...omit(instance, ['managementSystemLocation', 'spaceIdOfProcessInitiator']),
      processInitiator: instance.processInitiator ? idToUser(instance.processInitiator) : undefined,
      tokens: instance.tokens.map((t) => ({
        ...transformPerformerInfo(t),
        // extend with user readable information
        currentFlowElementName: idToName(t.currentFlowElementId),
      })),
      variables: Object.fromEntries(
        Object.entries(instance.variables).map(([key, info]) => [
          key,
          {
            ...info,
            // add the name so the llm can show it instead of the id
            log: info.log.map((l) => ({ ...l, changedByElementName: idToName(l.changedBy) })),
          },
        ]),
      ),
      log: instance.log.map((l) => ({
        ...transformPerformerInfo(l),
        // add the name so the llm can show it instead of the id
        flowElementName: idToName(l.flowElementId),
        actualPerformers: l.actualOwner ? l.actualOwner.map(idToUser) : undefined,
        potentialPerformers: l.performers
          ? {
            user: l.performers.user.map(idToUser),
            roles: l.performers.roles.map(idToRole),
          }
          : undefined,
      })),
      // remove execution information needed by the engine
      processVersion: version ? omit(version, ['bpmn', 'needs']) : instance.processVersion,
      userTasks: instance.userTasks?.map((uT) => ({
        // remove execution information needed by the engine
        ...omit(transformPerformerInfo(uT), [
          'processInstance',
          'definitionVersion',
          '$type',
          'implementation',
          'attrs',
          'resources',
        ]),
        // unwrap the name of the file in which the html for the user task is saved
        fileName: uT.attrs?.['proceed:fileName'],
        // map engine internal information about potential owners to user readable information
        potentialPerformers: uT.resources
          ?.map((r: any) => {
            try {
              const { user, roles } = JSON.parse(r.resourceAssignmentExpression.expression.body);
              return [...user.map(idToUser), ...roles.map(idToRole)];
            } catch (err) { }

            return undefined;
          })
          .filter(truthyFilter)
          .flat(),
      })),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(mappedInstance) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
