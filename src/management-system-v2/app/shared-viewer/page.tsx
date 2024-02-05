import jwt from 'jsonwebtoken';
import { getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/processes';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';
import BPMNSharedViewer from '@/app/shared-viewer/bpmn-shared-viewer';

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

  const key = process.env.JWT_SHARE_SECRET!;
  let processData;
  let iframeMode;
  try {
    const { processId, embeddedMode } = jwt.verify(token, key!) as TokenPayload;
    processData = await getProcess(processId as string);
    iframeMode = embeddedMode;
  } catch (err) {
    console.error('error while verifying token... ', err);
  }

  if (processData.shared && processData.sharedAs === 'protected' && !session?.user.id) {
    const callbackUrl = `/shared-viewer?token=${searchParams.token}`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginPath);
  }

  return (
    <>
      <div>
        <BPMNSharedViewer processData={processData} embeddedMode={iframeMode} />
      </div>
    </>
  );
};

export default SharedViewer;
