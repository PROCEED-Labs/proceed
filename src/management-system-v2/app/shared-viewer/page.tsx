import jwt from 'jsonwebtoken';
import { getCurrentUser } from '@/components/auth';
import { getSharedProcessWithBpmn } from '@/lib/data/processes';
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
  let processData: Process | null = null;
  let iframeMode;
  try {
    const { processId, embeddedMode, timestamp } = jwt.verify(token, key!) as TokenPayload;
    iframeMode = embeddedMode;
    const res = await getSharedProcessWithBpmn(processId as string);
    if ('error' in res) {
      return <ErrorMessage message={res.error.message as string} />;
    } else {
      processData = res;
    }
    if (!processData) {
      return <ErrorMessage message="Process no longer exists" />;
    }

    if (
      (embeddedMode && timestamp !== processData.allowIframeTimestamp) ||
      (!embeddedMode && timestamp !== processData.shareTimestamp)
    ) {
      return <ErrorMessage message="Token expired" />;
    }
  } catch (err) {
    return <ErrorMessage message="Invalid Token" />;
  }
  if (
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
      <div>
        <BPMNSharedViewer processData={processData!} embeddedMode={iframeMode} />
      </div>
    </>
  );
};

export default SharedViewer;
