import EmbeddedModeler from '@/components/embedded-modeler';
import jwt from 'jsonwebtoken';
import { getCurrentUser } from '@/components/auth';
import { getProcess } from '@/lib/data/legacy/process';
import { TokenPayload } from '@/actions/actions';
import { redirect } from 'next/navigation';

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

  const key = process.env.JWT_KEY;

  const { processId, embeddedMode } = jwt.verify(token, key!) as TokenPayload;
  const processData = await getProcess(processId, true);

  if (processData.shared && processData.sharedAs === 'protected' && !session?.user.id) {
    const callbackUrl = `/shared-viewer?token=${searchParams.token}`;
    const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginPath);
  }

  if (!processData.shared) {
    return <h1 style={{ color: 'red', textAlign: 'center' }}>Process is no longer shared</h1>;
  }
  return (
    <div>
      <EmbeddedModeler processData={processData} embeddedMode={embeddedMode} />
    </div>
  );
};

export default SharedViewer;
