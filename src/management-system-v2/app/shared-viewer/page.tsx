import jwt from 'jsonwebtoken';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcess, getSharedProcessWithBpmn } from '@/lib/data/processes';
import { getProcesses, getProcessVersionBpmn, getProcessBpmn } from '@/lib/data/legacy/process';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer, { ImportsInfo } from '@/app/shared-viewer/documentation-page';
import BPMNCanvas from '@/components/bpmn-canvas';
import { Process } from '@/lib/data/process-schema';
import ErrorMessage from '../../components/error-message';

import styles from './page.module.scss';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '@/lib/data/legacy/iam/memberships';

import { getDefinitionsAndProcessIdForEveryCallActivity } from '@proceed/bpmn-helper';

import { SettingsOption } from './settings-modal';

interface PageProps {
  searchParams: {
    [key: string]: string[] | string | undefined;
  };
}

/**
 * Will return the process meta data and bpmn for the requested process if possible (process is shared or it is accessible by the logged in user)
 *
 * @param definitionId
 * @param timestamp the share/embed timestamp known to the user
 * @param embeddedMode if the process is requested in an embed (requires the correct embed timestamp)
 * @param isImport if the process is requested as part of the information about another process (will bypass the specific timestamp check)
 * @param versionId a specific version of the process to get (otherwise it will return the latest version)
 * @returns
 */
const getProcessInfo = async (
  definitionId: string,
  timestamp: number,
  embeddedMode: boolean,
  isImport: boolean,
  versionId?: number,
) => {
  const { session } = await getCurrentUser();

  let spaceId;
  let isOwner = false;
  let processData;

  // check if there is a session (=> the user is already logged in)
  if (session) {
    const { ability, activeEnvironment } = await getCurrentEnvironment(session?.user.id);
    ({ spaceId } = activeEnvironment);
    // get all the processes the user has access to
    const ownedProcesses = await getProcesses(ability);
    // check if the current user is the owner of the process(/has access to the process) => if yes give access regardless of sharing status
    isOwner = ownedProcesses.some((process) => process.id === definitionId);
  }

  if (isOwner) {
    // the user has access to the process so just get the necessary data from the appropiate/regular api
    const processMetaData = await getProcess(definitionId, spaceId!);

    if (processMetaData && !('error' in processMetaData)) {
      const bpmn = versionId
        ? await getProcessVersionBpmn(definitionId, versionId)
        : await getProcessBpmn(definitionId);

      processData = { ...processMetaData, bpmn };
    }
  } else {
    // the user has no regular access to the process so get the process data from the sharing api
    const res = await getSharedProcessWithBpmn(definitionId, versionId);
    if ('error' in res) {
      return <ErrorMessage message={res.error.message as string} />;
    } else {
      processData = res;

      if (
        // bypass the timestamp check for imports
        !isImport &&
        ((embeddedMode && timestamp !== processData.allowIframeTimestamp) ||
          (!embeddedMode && timestamp !== processData.shareTimestamp))
      ) {
        return <ErrorMessage message="Token expired" />;
      }
    }
  }

  return { isOwner, processData };
};

/**
 * Will get the bpmns of all the imports of a process that are available to the current user and put them in the given object
 *
 * @param bpmn the bpmn of the process to get the imports for
 * @param knownInfos the object to put the bpmns into
 */
const getImportInfos = async (bpmn: string, knownInfos: ImportsInfo) => {
  // information which tasks reference which processes
  const taskImportMap = await getDefinitionsAndProcessIdForEveryCallActivity(bpmn, true);

  for (const taskId in taskImportMap) {
    const { definitionId, version } = taskImportMap[taskId];

    if (!(knownInfos[definitionId] && knownInfos[definitionId][version])) {
      const processInfo = await getProcessInfo(definitionId, 0, false, true, version);

      // check if the return value is a valid process info (might also be a react component that signals an error => no isOwner)
      if ('isOwner' in processInfo && processInfo.processData) {
        const { bpmn: importBpmn } = processInfo.processData;

        if (!knownInfos[definitionId]) knownInfos[definitionId] = {};
        knownInfos[definitionId][version] = importBpmn;

        // recursively get the imports of the imports
        await getImportInfos(importBpmn, knownInfos);
      }
    }
  }
};

const SharedViewer = async ({ searchParams }: PageProps) => {
  const { token, version, settings } = searchParams;
  const { session, userId } = await getCurrentUser();
  if (typeof token !== 'string') {
    return <ErrorMessage message="Invalid Token " />;
  }

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnviroments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  let isOwner = false;

  const key = process.env.JWT_SHARE_SECRET!;
  let processData: Process | undefined;
  let iframeMode;
  let defaultSettings = settings as SettingsOption;
  try {
    const { processId, embeddedMode, timestamp } = jwt.verify(token, key!) as TokenPayload;

    const versionId = version === undefined ? version : parseInt(version as string);

    const processInfo = await getProcessInfo(
      processId as string,
      timestamp,
      embeddedMode || false,
      false,
      versionId,
    );

    // the return value of getProcessInfo might be an error that should just be returned to the user
    if (!('isOwner' in processInfo)) {
      return processInfo;
    }

    ({ isOwner, processData } = processInfo);

    if (!processData) {
      return <ErrorMessage message="Process no longer exists" />;
    }

    iframeMode = embeddedMode;
  } catch (err) {
    return <ErrorMessage message="Invalid Token" />;
  }

  let availableImports: ImportsInfo = {};
  if (!iframeMode) {
    try {
      await getImportInfos(processData.bpmn, availableImports);
    } catch (err) {
      console.error('Failed to resolve the information for process imports: ', err);
    }
  }

  // make the user log in if the process is shared only for logged in users
  if (
    !isOwner &&
    processData!.shareTimestamp > 0 &&
    processData!.sharedAs === 'protected' &&
    !session?.user.id
  ) {
    const callbackUrl = `/shared-viewer?token=${searchParams.token}`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginPath);
  }

  return (
    <>
      <div style={{ height: '100vh' }}>
        {iframeMode ? (
          <BPMNCanvas type="viewer" bpmn={{ bpmn: processData.bpmn }} />
        ) : (
          <div className={styles.ProcessOverview}>
            <Layout
              hideSider={true}
              loggedIn={!!userId}
              layoutMenuItems={[]}
              userEnvironments={userEnvironments}
              activeSpace={{ spaceId: userId || '', isOrganization: false }}
            >
              <BPMNSharedViewer
                isOwner={isOwner}
                processData={processData!}
                defaultSettings={defaultSettings}
                availableImports={availableImports}
              />
            </Layout>
          </div>
        )}
      </div>
    </>
  );
};

export default SharedViewer;
