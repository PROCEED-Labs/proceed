import jwt from 'jsonwebtoken';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/processes';
import { getProcesses, getProcessVersionBpmn } from '@/lib/data/legacy/process';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer from '@/app/shared-viewer/documentation-page';
import BPMNCanvas from '@/components/bpmn-canvas';
import { Process } from '@/lib/data/process-schema';
import TokenExpired from './token-expired';
import InvalidShareToken from './invalid-token';
import ProcessNoLongerShared from './process-no-longer-shared';
import ProcessDoesNotExist from './process-does-not-exist';

import { SettingsOption } from './settings-modal';

interface PageProps {
  searchParams: {
    [key: string]: string[] | string | undefined;
  };
}

const SharedViewer = async ({ searchParams }: PageProps) => {
  const token = searchParams.token;
  const { session } = await getCurrentUser();
  if (typeof token !== 'string') {
    return <InvalidShareToken />;
  }

  let isOwner = false;

  const key = process.env.JWT_SHARE_SECRET!;
  let processData: Process | undefined = undefined;
  let iframeMode;
  let defaultSettings: SettingsOption | undefined;
  try {
    let { processId, version, embeddedMode, timestamp, settings } = jwt.verify(
      token,
      key!,
    ) as TokenPayload;
    defaultSettings = settings;
    processData = (await getProcess(processId as string)) as Process;

    if (session) {
      // check if the current user is the owner of the process => if yes give access regardless of sharing status
      const { ability } = await getCurrentEnvironment(session?.user.id);
      const ownedProcesses = await getProcesses(ability);
      isOwner = ownedProcesses.some((process) => process.id === processId);
    }
    if (version) {
      version = typeof version === 'number' ? version : parseInt(version);
      processData.bpmn = await getProcessVersionBpmn(processId as string, version);
    }

    iframeMode = embeddedMode;

    if (!processData) {
      return <ProcessDoesNotExist />;
    }

    if (!isOwner) {
      if (!processData.shared) {
        return <ProcessNoLongerShared />;
      }

      if (processData.shareTimeStamp && timestamp! < processData.shareTimeStamp) {
        return <TokenExpired />;
      }
    }
  } catch (err) {
    console.error('error while verifying token... ', err);
  }
  if (
    !isOwner &&
    processData!.shared &&
    processData!.sharedAs === 'protected' &&
    !session?.user.id
  ) {
    const callbackUrl = `/shared-viewer?token=${searchParams.token}`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginPath);
  }

  if (!processData) return <></>;

  return (
    <>
      <div style={{ height: '100vh' }}>
        {iframeMode ? (
          <BPMNCanvas type="viewer" bpmn={{ bpmn: processData.bpmn }} />
        ) : (
          <BPMNSharedViewer
            isOwner={isOwner}
            processData={processData!}
            defaultSettings={defaultSettings}
          />
        )}
      </div>
    </>
  );
};

export default SharedViewer;
