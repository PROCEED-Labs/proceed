'use client';

import { useEnvironment } from '@/components/auth-can';
import Bar from '@/components/bar';
import ConfirmationButton from '@/components/confirmation-button';
import ElementList from '@/components/item-list-view';
import SelectionActions from '@/components/selection-actions';
import { UserTask } from '@/lib/user-task-schema';
import { generateDateString, generateTableDateString, spaceURL } from '@/lib/utils';
import {
  Button,
  Divider,
  Dropdown,
  Form,
  Grid,
  Input,
  Modal,
  Space,
  TableColumnsType,
  Tooltip,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { IoOpenOutline } from 'react-icons/io5';
import { PiNotePencil } from 'react-icons/pi';
import { DeleteOutlined } from '@ant-design/icons';

import styles from '@/components/item-list-view.module.scss';
import useFuzySearch from '@/lib/useFuzySearch';

type TaskListProps = {
  data: UserTask[];
};

const TaskList: React.FC<TaskListProps> = ({ data }) => {
  const [selectedTasks, setSelectedTasks] = useState<UserTask[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [initialData, setInitialData] = useState({ name: '' });

  const breakpoint = Grid.useBreakpoint();

  const space = useEnvironment();
  const router = useRouter();

  const [form] = Form.useForm();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data ?? [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const columns: TableColumnsType<UserTask> = useMemo(() => {
    return [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'Name',
        ellipsis: true,
        sorter: (a, b) => a.name!.localeCompare(b.name!),
        // render: (_, record: UserTask) => (
        //   <ListEntryLink
        //     data={record}
        //     style={{
        //       color: record.id === folder.parentId ? 'grey' : undefined,
        //       fontStyle: record.id === folder.parentId ? 'italic' : undefined,
        //     }}
        //   >
        //     <ProcessListItemIcon item={record} /> {record.name.highlighted}
        //   </ListEntryLink>
        // ),
        // responsive: ['xs', 'sm'],
      },
    ];
  }, []);

  function deleteItems(tasks: UserTask[]) {
    console.log('Delete');
  }

  function createNewForm() {
    console.log('Create');
    setOpenCreateModal(false);
  }

  return (
    <>
      <Bar
        leftNode={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {!breakpoint.xs && (
                <Space>
                  <Button type="primary" onClick={() => setOpenCreateModal(true)}>
                    Create Task Form
                  </Button>
                </Space>
              )}

              {/* DIVIDER BLOCK */}
              <SelectionActions count={selectedTasks.length} readOnly={false}>
                <Space split={<Divider type="vertical" />}>
                  {selectedTasks.length === 1 && (
                    <div>
                      <Tooltip placement="top" title={'Open Editor'}>
                        <Button
                          type="text"
                          icon={<PiNotePencil className={styles.Icon} />}
                          onClick={() => {
                            const url = spaceURL(space, `/tasks/${selectedTasks[0].id}`);
                            router.push(url);
                          }}
                        />
                      </Tooltip>
                      <Tooltip placement="top" title={'Open Editor in new Tab'}>
                        <Button
                          type="text"
                          icon={<IoOpenOutline className={styles.Icon} />}
                          onClick={() => {
                            const url = spaceURL(space, `/tasks/${selectedTasks[0].id}`);
                            window.open(url, '_blank');
                          }}
                        />
                      </Tooltip>
                      {/* {canEditSelected && ( */}
                      {/*   <Tooltip placement="top" title={'Change Meta Data'}> */}
                      {/*     <Button */}
                      {/*       type="text" */}
                      {/*       icon={<LuNotebookPen className={styles.Icon} />} */}
                      {/*       onClick={() => { */}
                      {/*         editItem(selectedRowElements[0]); */}
                      {/*       }} */}
                      {/*     /> */}
                      {/*   </Tooltip> */}
                      {/* )} */}
                    </div>
                  )}

                  {
                    <div>
                      {/* {canCreateProcess && ( */}
                      {/*   <Tooltip placement="top" title={'Copy'}> */}
                      {/*     <Button */}
                      {/*       type="text" */}
                      {/*       icon={<IoMdCopy className={styles.Icon} />} */}
                      {/*       onClick={() => { */}
                      {/*         setCopySelection(selectedRowElements); */}
                      {/*         setOpenCopyModal(true); */}
                      {/*       }} */}
                      {/*     /> */}
                      {/*   </Tooltip> */}
                      {/* )} */}
                      {
                        <ConfirmationButton
                          tooltip="Delete"
                          title="Delete Task Form"
                          externalOpen={openDeleteModal}
                          onExternalClose={() => setOpenDeleteModal(false)}
                          description="Are you sure you want to delete the selected processes?"
                          onConfirm={() => deleteItems(selectedTasks)}
                          buttonProps={{
                            icon: <DeleteOutlined className={styles.Icon} />,
                            type: 'text',
                          }}
                        />
                      }
                    </div>
                  }
                </Space>
              </SelectionActions>
            </span>
          </span>
        }
        searchProps={{
          onChange: (e) => setSearchTerm(e.target.value),
          onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
          placeholder: 'Search Task Forms ...',
        }}
      />
      <ElementList
        data={filteredData.map((d) => ({ ...d, name: d.name.value }))}
        columns={columns}
        elementSelection={{
          selectedElements: selectedTasks,
          setSelectionElements: setSelectedTasks,
        }}
      />
      <Modal
        open={openCreateModal}
        title="Create Process Form"
        onClose={() => setOpenCreateModal(false)}
        onCancel={() => setOpenCreateModal(false)}
        onOk={createNewForm}
      >
        <Form
          form={form}
          layout="vertical"
          name="html_creation_form"
          initialValues={initialData}
          autoComplete="off"
          // This resets the fields when the modal is opened again. (apparently
          // doesn't work in production, that's why we use the useEffect above)
          preserve={false}
        >
          <Form.Item
            name={'name'}
            label="Process Form Name"
            validateDebounce={1000}
            hasFeedback
            rules={[
              { max: 100, message: 'Form name can be max 100 characters long' },
              { required: true, message: '' },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TaskList;
