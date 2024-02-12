import { ComponentProps, FC, PropsWithChildren, ReactNode, forwardRef, useState } from 'react';
import { Button, Modal, Tooltip, Typography } from 'antd';

type ConfirmationModalProps = PropsWithChildren<{
  onConfirm: () => Promise<any> | any;
  title: string;
  description: ReactNode;
  canCloseWhileLoading?: boolean;
  modalProps?: Omit<
    ComponentProps<typeof Modal>,
    'open' | 'title' | 'onOk' | 'confirmLoading' | 'onCancel'
  >;
  buttonProps?: ComponentProps<typeof Button>;
  tooltip?: string;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}>;

const ConfirmationButton = forwardRef<HTMLElement, ConfirmationModalProps>(
  (
    {
      children,
      onConfirm,
      title,
      description,
      canCloseWhileLoading = false,
      modalProps,
      buttonProps,
      tooltip,
      externalOpen,
      onExternalClose,
    },
    ref,
  ) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const clearModal = () => {
      setModalOpen(false);
      onExternalClose?.();
      setLoading(false);
    };

    const onConfirmWrapper = async () => {
      setLoading(true);

      try {
        await onConfirm();
      } catch (err) {}

      clearModal();
    };

    return (
      <>
        <Modal
          closeIcon={null}
          {...modalProps}
          title={title}
          open={externalOpen || modalOpen}
          onOk={onConfirmWrapper}
          confirmLoading={loading}
          onCancel={() =>
            ((canCloseWhileLoading || !loading) && setModalOpen(false)) || onExternalClose?.()
          }
          cancelButtonProps={{ disabled: !canCloseWhileLoading && loading }}
          destroyOnClose={true}
        >
          {typeof description === 'string' ? (
            <Typography.Text>{description}</Typography.Text>
          ) : (
            description
          )}
        </Modal>

        <Tooltip title={tooltip}>
          <Button
            ref={ref}
            {...buttonProps}
            onClick={() => setModalOpen(true)}
            disabled={modalOpen || buttonProps?.disabled}
            loading={loading}
          >
            {children}
          </Button>
        </Tooltip>
      </>
    );
  },
);

ConfirmationButton.displayName = 'ConfirmationButton';

export default ConfirmationButton;
