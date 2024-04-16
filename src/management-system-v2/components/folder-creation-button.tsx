'use client';

import { FC, ReactNode, useTransition } from 'react';
import { App, Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { FolderUserInput, FolderUserInputSchema } from '@/lib/data/folder-schema';
import { createFolder as serverCreateFolder } from '@/lib/data/folders';
import useFolderModal from './folder-modal';
import useParseZodErrors from '@/lib/useParseZodErrors';

type FolderCreationButtonProps = ButtonProps & {
  wrapperElement?: ReactNode;
};

const FolderCreationButton: FC<FolderCreationButtonProps> = ({ wrapperElement, ...props }) => {
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
        close();
      } catch (e) {
        message.open({ type: 'error', content: 'Something went wrong' });
      }
    });
  };

  const { modal, open, close } = useFolderModal({
    spaceId,
    parentId: folderId,
    onSubmit: createFolder,
    modalProps: {
      title: 'Create Folder',
      okButtonProps: { loading: isLoading },
    },
  });

  return (
    <>
      {wrapperElement ? (
        <div onClick={open}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={open}>
          Create Folder
        </Button>
      )}
      {modal}
    </>
  );
};

export default FolderCreationButton;
