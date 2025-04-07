import { Element } from '@craftjs/core';
import { Button as AntButton } from 'antd';
import React, { ReactNode } from 'react';

import { LuTextCursorInput, LuImage, LuTable, LuText } from 'react-icons/lu';
import { MdCheckBox, MdRadioButtonChecked, MdTitle, MdOutlineCheck } from 'react-icons/md';
import { RxGroup } from 'react-icons/rx';

import { useDraggable } from '@dnd-kit/core';

import styles from './index.module.scss';

import {
  Text,
  Container,
  Input,
  CheckBoxOrRadioGroup,
  Column,
  Table,
  EditImage as Image,
  SubmitButton,
} from '../elements';

import { createPortal } from 'react-dom';
import { useCanEdit } from '../../modeler';

type CreationButtonProps = React.PropsWithChildren<{
  title: string;
  icon: ReactNode;
}>;

const CreationButton: React.FC<CreationButtonProps> = ({ children, title, icon }) => {
  const editingEnabled = useCanEdit();

  const id = `create-${title}-button`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      element: <Column>{children}</Column>,
    },
  });

  return (
    <>
      <AntButton
        id={id}
        className={styles.CreationButton}
        disabled={!editingEnabled}
        ref={setNodeRef}
        icon={icon}
        {...attributes}
        {...listeners}
      >
        {title}
      </AntButton>
      {isDragging &&
        /** We want to render the indicator into the overlay that is set up in the CustomDnD component */
        document.getElementById('dnd-drag-overlay') &&
        createPortal(
          <AntButton className={styles.DraggedCreationButton} icon={icon}>
            {title}
          </AntButton>,
          document.getElementById('dnd-drag-overlay')!,
        )}
    </>
  );
};

const Toolbox = () => {
  return (
    <div className={styles.Toolbox}>
      <CreationButton title="Header" icon={<MdTitle />}>
        <Text text='<h1 class="text-style-heading" dir="ltr"><b><strong class="text-style-bold" style="white-space: pre-wrap;">New Title Element</strong></b></h1>' />
      </CreationButton>
      <CreationButton title="Text" icon={<LuText />}>
        <Text />
      </CreationButton>
      <CreationButton title="Input" icon={<LuTextCursorInput />}>
        <Input />
      </CreationButton>
      <CreationButton title="Radio" icon={<MdRadioButtonChecked />}>
        <CheckBoxOrRadioGroup
          type="radio"
          data={[{ label: 'New Radio Button', value: '', checked: false }]}
        />
      </CreationButton>
      <CreationButton title="Checkbox" icon={<MdCheckBox />}>
        <CheckBoxOrRadioGroup
          type="checkbox"
          data={[{ label: 'New Checkbox', value: '', checked: false }]}
        />
      </CreationButton>
      <CreationButton title="Table" icon={<LuTable />}>
        <Table />
      </CreationButton>
      <CreationButton title="Container" icon={<RxGroup />}>
        <Element is={Container} padding={20} canvas />
      </CreationButton>
      <CreationButton title="Image" icon={<LuImage />}>
        <Image />
      </CreationButton>
      <CreationButton title="Submit" icon={<MdOutlineCheck />}>
        <SubmitButton />
      </CreationButton>
    </div>
  );
};

export default Toolbox;
