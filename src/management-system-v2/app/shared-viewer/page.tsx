import jwt from 'jsonwebtoken';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/processes';
import { getProcesses, getProcessVersionBpmn } from '@/lib/data/legacy/process';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer from '@/app/shared-viewer/documentation-page';
import BPMNCanvas from '@/components/bpmn-canvas';
import { Process } from '@/lib/data/process-schema';
import ErrorMessage from '../../components/error-message';

import { SettingsOption } from './settings-modal';

interface PageProps {
  searchParams: {
    [key: string]: string[] | string | undefined;
  };
}

const SharedViewer = async ({ searchParams }: PageProps) => {
  const { token, version, settings } = searchParams;
  const { session } = await getCurrentUser();
  if (typeof token !== 'string') {
    return <ErrorMessage message="Invalid Token " />;
  }

  let isOwner = false;

  const key = process.env.JWT_SHARE_SECRET!;
  let processData: Process | undefined = undefined;
  let iframeMode;
  let defaultSettings = settings as SettingsOption;
  try {
    let { processId, embeddedMode, timestamp } = jwt.verify(token, key!) as TokenPayload;
    processData = (await getProcess(processId as string)) as Process;

    if (session) {
      // check if the current user is the owner of the process => if yes give access regardless of sharing status
      const { ability } = await getCurrentEnvironment(session?.user.id);
      const ownedProcesses = await getProcesses(ability);
      isOwner = ownedProcesses.some((process) => process.id === processId);
    }

    if (version) {
      processData.bpmn = await getProcessVersionBpmn(
        processId as string,
        parseInt(version as string),
      );
    }

    iframeMode = embeddedMode;

    if (!processData) {
      return <ErrorMessage message="Process no longer exists" />;
    }

    if (!isOwner) {
      if (!processData.shared) {
        return <ErrorMessage message="Process is not shared" />;
      }

      if (processData.shareTimestamp !== timestamp) {
        return <ErrorMessage message="Token Expired" />;
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
