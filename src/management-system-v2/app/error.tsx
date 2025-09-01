'use client';

import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { SpaceNotFoundError } from '@/lib/errors';
import { UIError } from '@/lib/ui-error';
import { Button, Result } from 'antd';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  let title = 'Something went wrong!';
  if (error.message.startsWith(UnauthorizedError.prefix)) {
    return <UnauthorizedFallback />;
  } else if (error.message.startsWith(UIError.prefix)) {
    title = error.message.substring(UIError.prefix.length + 2);
  }

  const retryButton = (
    <Button type="primary" onClick={() => reset()}>
      Try again
    </Button>
  );

  let feedback = (
    <Result
      status="warning"
      title={title}
      subTitle={`Digest: ${error.digest}`}
      extra={retryButton}
    />
  );

  if (error.message.startsWith(SpaceNotFoundError.prefix)) {
    <Result status="404" title="Space not found" subTitle={`Digest: ${error.digest}`} />;
  }

  return <Content>{feedback}</Content>;
}
