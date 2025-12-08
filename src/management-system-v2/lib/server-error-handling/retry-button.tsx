'use client';

import { Button, ButtonProps } from 'antd';
import { useRouter } from 'next/navigation';

export default function RetryButton(props: ButtonProps) {
  const router = useRouter();

  return <Button type="primary" {...props} onClick={() => router.refresh()} />;
}
