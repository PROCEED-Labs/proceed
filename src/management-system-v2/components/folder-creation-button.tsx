'use client';

import { ComponentProps, FC, ReactNode, useState, useTransition } from 'react';
import { App, Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { FolderUserInput, FolderUserInputSchema } from '@/lib/data/folder-schema';
import { createFolder as serverCreateFolder } from '@/lib/data/folders';
import FolderModal from './folder-modal';
import useParseZodErrors from '@/lib/useParseZodErrors';
import { wrapServerCall } from '@/lib/wrap-server-call';

export const FolderCreationModal: FC<
  Partial<ComponentProps<typeof FolderModal>> & { open: boolean; close: () => void }
> = (props) => {
  const { message } = App.useApp();
  const router = useRouter();
  const spaceId = useEnvironment().spaceId;
  const folderId = useParams<{ folderId: string }>().folderId ?? '';
  const [isLoading, startTransition] = useTransition();
  const [errors, parseInput] = useParseZodErrors(FolderUserInputSchema);

  const createFolder = (values: FolderUserInput) => {
    startTransition(async () => {
      await wrapServerCall({
        fn: async () => {
          const folderInput = parseInput({ ...values, parentId: folderId, environmentId: spaceId });
          if (!folderInput) throw new Error();

          return await serverCreateFolder(folderInput);
        },
        onSuccess: () => {
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
      parentId={folderId}
      onSubmit={createFolder}
      modalProps={{
        title: 'Create Folder',
        okButtonProps: { loading: isLoading },
      }}
    />
  );
};

const FolderCreationButton: FC<
  ButtonProps & {
    wrapperElement?: ReactNode;
  }
> = ({ wrapperElement, ...props }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {wrapperElement ? (
        <div onClick={() => setModalOpen(true)}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => setModalOpen(true)}>
          Create Folder
        </Button>
      )}

      <FolderCreationModal open={modalOpen} close={() => setModalOpen(false)} />
    </>
  );
};

export default FolderCreationButton;
