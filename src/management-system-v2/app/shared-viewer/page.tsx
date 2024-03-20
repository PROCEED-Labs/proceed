import jwt from 'jsonwebtoken';
import { getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/processes';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer from '@/app/shared-viewer/bpmn-shared-viewer';
import { Process } from '@/lib/data/process-schema';
import ErrorMessage from '../../components/error-message';

interface PageProps {
  searchParams: {
    [key: string]: string[] | string | undefined;
  };
}

const SharedViewer = async ({ searchParams }: PageProps) => {
  const token = searchParams.token;
  const { session } = await getCurrentUser();
  if (typeof token !== 'string') {
    return <ErrorMessage message="Invalid Token " />;
  }

  const key = process.env.JWT_SHARE_SECRET!;
  let processData: Process;
  let iframeMode;
  try {
    const { processId, embeddedMode, timestamp } = jwt.verify(token, key!) as TokenPayload;
    iframeMode = embeddedMode;
    processData = await getProcess(processId as string);

    if (!processData) {
      return <ErrorMessage message="Process no longer exists" />;
    }

    if (processData.shareTimeStamp === 0) {
      return <ErrorMessage message="Process is not shared" />;
    }

    if (
      (embeddedMode && timestamp !== processData.allowIframeTimestamp) ||
      (!embeddedMode && timestamp !== processData.shareTimeStamp)
    ) {
      return <ErrorMessage message="Token expired" />;
    }
  } catch (err) {
    console.error('error while verifying token... ', err);
  }
  if (
    processData!.shareTimeStamp > 0 &&
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
        <BPMNSharedViewer processData={processData!} embeddedMode={iframeMode} />
      </div>
    </>
  );
};

export default SharedViewer;
