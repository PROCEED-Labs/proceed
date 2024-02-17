import jwt from 'jsonwebtoken';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/processes';
import { getProcesses, getProcessVersionBpmn } from '@/lib/data/legacy/process';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer from '@/app/shared-viewer/bpmn-shared-viewer';
import { Process } from '@/lib/data/process-schema';
import TokenExpired from './token-expired';

interface PageProps {
  searchParams: {
    [key: string]: string[] | string | undefined;
  };
}

const SharedViewer = async ({ searchParams }: PageProps) => {
  const token = searchParams.token;
  const { session } = await getCurrentUser();
  if (typeof token !== 'string') {
    return <h1>Invalid Token</h1>;
  }

  let isOwner = false;

  const key = process.env.JWT_SHARE_SECRET!;
  let processData: Process;
  let iframeMode;
  try {
    const { processId, version, embeddedMode, timestamp } = jwt.verify(token, key!) as TokenPayload;
    processData = await getProcess(processId as string);

    if (session) {
      // check if the current user is the owner of the process => if yes give access regardless of sharing status
      const { ability } = await getCurrentEnvironment(session?.user.id);
      const ownedProcesses = await getProcesses(ability);
      isOwner = ownedProcesses.some((process) => process.id === processId);
    }

    if (version) {
      processData.bpmn = await getProcessVersionBpmn(processId as string, parseInt(version));
    }

    iframeMode = embeddedMode;

    if (!isOwner && processData.shareTimeStamp && timestamp! < processData.shareTimeStamp) {
      return <TokenExpired />;
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

  return (
    <>
      <div>
        <BPMNSharedViewer isOwner={isOwner} processData={processData!} embeddedMode={iframeMode} />
      </div>
    </>
  );
};

export default SharedViewer;
