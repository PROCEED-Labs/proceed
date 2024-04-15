import React, { use, useEffect, useRef, useState } from 'react';

import { Modal, Grid, Row, Col, Divider } from 'antd';
import { LuFormInput } from 'react-icons/lu';
import { IoMdCheckboxOutline } from 'react-icons/io';

import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 } from 'uuid';

import styles from './user-task-builder.module.scss';

const EditorJSImport: Promise<any> =
  typeof window !== 'undefined'
    ? new Promise(async (res) => {
        const Editor = (await import('@editorjs/editorjs')).default;
        const DragDrop = (await import('editorjs-drag-drop')).default;
        const Undo = (await import('editorjs-undo')).default;
        const Header = (await import('@editorjs/header')).default;
        const Embed = (await import('@editorjs/embed')).default;
        const Image = (await import('@editorjs/image')).default;
        const Table = (await import('@editorjs/table')).default;
        const List = (await import('@editorjs/nested-list')).default;

        res([Editor, DragDrop, Undo, Header, Embed, Image, Table, List]);
      })
    : (null as any);

type BuilderProps = {
  open: boolean;
  onClose: () => void;
};

const options = [
  { label: 'Input', type: 'text', icon: <LuFormInput /> },
  { label: 'Checkbox', type: 'checkbox', icon: <IoMdCheckboxOutline /> },
];

// type Option = (typeof options)[number];
// type FormElement = Option & { id: string };

// const FormElementOption: React.FC<{ option: Option }> = ({ option }) => {
//   const [{ isDragging }, drag] = useDrag(() => ({
//     type: 'element',
//     item: option,
//     end: () => {},
//     collect: (monitor) => ({ isDragging: monitor.isDragging(), handlerId: monitor.getHandlerId() }),
//   }));

//   const opacity = isDragging ? 0.4 : 1;

//   return (
//     <div ref={drag} style={{ opacity }} className={styles.FormElement}>
//       {option.icon}
//       {option.label}
//     </div>
//   );
// };

// const InputElement: React.FC<{ element: FormElement }> = ({ element }) => {
//   const [{ isDragging }, drag] = useDrag(() => ({
//     type: 'element',
//     item: element,
//     end: () => {},
//     collect: (monitor) => ({ isDragging: monitor.isDragging(), handlerId: monitor.getHandlerId() }),
//   }));

//   return <input type={element.type} ref={drag} />;
// };

// const FormContainer: React.FC = () => {
//   const [formElements, setFormElements] = useState<FormElement[]>([]);
//   const [{ canDrop, isOver }, drop] = useDrop(() => ({
//     accept: 'element',
//     drop: (_, monitor) => {
//       const item = monitor.getItem<FormElement | Option>();

//       if ('id' in item) {
//       } else {
//         setFormElements((curr) => curr.concat([{ ...item, id: v4() }]));
//       }
//     },
//     collect: (monitor) => ({
//       isOver: monitor.isOver(),
//       canDrop: monitor.canDrop(),
//     }),
//   }));

//   return (
//     <div style={{ width: '100%', height: '100%' }} ref={drop}>
//       {formElements.map((element) => (
//         <div style={{ padding: '20px 10px' }} key={element.id}>
//           <InputElement element={element} />
//         </div>
//       ))}
//     </div>
//   );
// };

const UserTaskBuilder: React.FC<BuilderProps> = ({ open, onClose }) => {
  const breakpoint = Grid.useBreakpoint();
  const editorContainer = useRef<HTMLDivElement>(null);

  const EditorJS = use(EditorJSImport);

  const onChange = (data: any) => console.log(data);

  useEffect(() => {
    console.log('A');
    if (open && editorContainer.current) {
      console.log('test');

      const [Editor, DragDrop, Undo, Header, Embed, Image, Table, List] = EditorJS;

      const editor = new Editor({
        holder: editorContainer.current,
        onChange: console.log,
        inlineToolbar: true,
        onReady: () => {
          new Undo({ editor });
          new DragDrop(editor);
        },
        tools: {
          header: {
            class: Header,
            inlineToolbar: true,
            config: {
              placeholder: 'Enter a header',
              defaultLevel: 1,
              levels: [1, 2, 3, 4],
            },
          },
          embed: Embed,
          image: Image,
          table: Table,
          list: List,
        },
      });

      return () => {
        editor.destroy();
      };
    }
  }, [EditorJS, open]);

  return (
    <Modal
      width={breakpoint.xs ? '100vw' : '75vw'}
      style={{ maxWidth: '1200px' }}
      centered
      styles={{ body: { height: '75vh' } }}
      open={open}
      title="Edit User Task"
      okText="Save"
      onCancel={onClose}
    >
      <div ref={editorContainer}></div>
      {/* <Row className={styles.BuilderUI}>
        <DndProvider backend={HTML5Backend}>
          <Col className={styles.HtmlCanvas} span={18}>
            <FormContainer />
          </Col>
          <Col className={styles.ElementSelection} span={6}>
            {options.map((option) => (
              <FormElementOption option={option} key={option.type} />
            ))}
          </Col>
        </DndProvider>
      </Row> */}
    </Modal>
  );
};

export default UserTaskBuilder;
