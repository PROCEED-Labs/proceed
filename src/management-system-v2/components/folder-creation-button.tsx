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
      try {
        const folderInput = parseInput({ ...values, parentId: folderId, environmentId: spaceId });
        if (!folderInput) throw new Error();

        const response = await serverCreateFolder(folderInput);
        if (response && 'error' in response) throw new Error();

        router.refresh();
        message.open({ type: 'success', content: 'Folder Created' });
        props.close();
      } catch (e) {
        message.open({ type: 'error', content: 'Something went wrong' });
      }
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
