'use client';

import { FC, ReactNode, useState, useTransition } from 'react';
import { App, Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { FolderUserInput, FolderUserInputSchema } from '@/lib/data/folder-schema';
import { createFolder as serverCreateFolder } from '@/lib/data/folders';
import FolderModal from './folder-modal';
import useParseZodErrors from '@/lib/useParseZodErrors';
import { wrapServerCall } from '@/lib/wrap-server-call';

type FolderCreationButtonProps = ButtonProps & {
  wrapperElement?: ReactNode;
};

const FolderCreationButton: FC<FolderCreationButtonProps> = ({ wrapperElement, ...props }) => {
  const app = App.useApp();
  const router = useRouter();
  const spaceId = useEnvironment().spaceId;
  const folderId = useParams<{ folderId: string }>().folderId ?? '';
  const [isLoading, startTransition] = useTransition();
  const [errors, parseInput] = useParseZodErrors(FolderUserInputSchema);
  const [modalOpen, setModalOpen] = useState(false);

  const createFolder = (values: FolderUserInput) => {
    startTransition(async () => {
      await wrapServerCall({
        fn: () => {
          const folderInput = parseInput({ ...values, parentId: folderId, environmentId: spaceId });
          if (!folderInput) throw new Error();

          return serverCreateFolder(folderInput);
        },
        onSuccess: () => {
          router.refresh();
          app.message.open({ type: 'success', content: 'Folder Created' });
          setModalOpen(false);
        },
        app,
      });
    });
  };

  return (
    <>
      {wrapperElement ? (
        <div onClick={() => setModalOpen(true)}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => setModalOpen(true)}>
          Create Folder
        </Button>
      )}

      <FolderModal
        open={modalOpen}
        close={() => setModalOpen(false)}
        spaceId={spaceId}
        parentId={folderId}
        onSubmit={createFolder}
        modalProps={{
          title: 'Create Folder',
          okButtonProps: { loading: isLoading },
        }}
      />
    </>
  );
};

export default FolderCreationButton;
