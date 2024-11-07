'use client';

import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { Button, Result } from 'antd';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (error.message.startsWith(UnauthorizedError.prefix)) return <UnauthorizedFallback />;

  return (
    <Content>
      <Result
        status="warning"
        title="Something went wrong!"
        subTitle={`Digest: ${error.digest}`}
        extra={
          <Button type="primary" onClick={() => reset()}>
            Try again
          </Button>
        }
      />
    </Content>
  );
}
