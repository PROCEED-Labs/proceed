import React from 'react';
import { DeleteOutlined } from '@ant-design/icons';

type DeleteButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  show: boolean;
};

export const DeleteButton: React.FC<DeleteButtonProps> = ({ onClick, show }) => {
  if (!show) return null;

  return (
    <button className="container-element-delete-button" onClick={onClick}>
      <DeleteOutlined />
    </button>
  );
};
