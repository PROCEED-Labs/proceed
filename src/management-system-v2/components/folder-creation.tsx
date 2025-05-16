'use client';

import { ComponentProps, FC, useTransition } from 'react';
import { App } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { FolderUserInput } from '@/lib/data/folder-schema';
import { createFolder as serverCreateFolder } from '@/lib/data/folders';
import FolderModal from './folder-modal';
import { wrapServerCall } from '@/lib/wrap-server-call';

export const FolderCreationModal: FC<
  Partial<ComponentProps<typeof FolderModal>> & {
    open: boolean;
    close: () => void;
    parentFolderId?: string;
  }
> = (props) => {
  const { message } = App.useApp();
  const router = useRouter();
  const spaceId = useEnvironment().spaceId;
  const folderId = useParams<{ folderId: string }>().folderId ?? '';
  const selectedFolderId = props.parentFolderId || folderId;
  const [isLoading, startTransition] = useTransition();

  const createFolder = (values: FolderUserInput) => {
    startTransition(async () => {
      await wrapServerCall({
        fn: async () => serverCreateFolder(values),
        onSuccess() {
          router.refresh();
          message.open({ type: 'success', content: 'Folder Created' });
          props.close();
        },
      });
    });
  };

  return (
    <FolderModal
      {...props}
      open={props.open}
      close={props.close}
      spaceId={spaceId}
      parentId={selectedFolderId}
      onSubmit={createFolder}
      modalProps={{
        title: 'Create Folder',
        okButtonProps: { loading: isLoading },
      }}
    />
  );
};
