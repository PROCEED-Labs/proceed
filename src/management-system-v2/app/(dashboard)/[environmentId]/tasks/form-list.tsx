'use client';

import { useEnvironment } from '@/components/auth-can';
import Bar from '@/components/bar';
import ConfirmationButton from '@/components/confirmation-button';
import ElementList from '@/components/item-list-view';
import SelectionActions from '@/components/selection-actions';
import { spaceURL } from '@/lib/utils';
import {
  Button,
  Cascader,
  Divider,
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

import { UserOutlined } from '@ant-design/icons';

import styles from '@/components/item-list-view.module.scss';
import useFuzySearch from '@/lib/useFuzySearch';
import { HtmlForm } from '@prisma/client';
import { addHtmlForm, getHtmlFormHtml, removeHtmlForm } from '@/lib/data/html-forms';
import { defaultForm } from '@/components/html-form-editor/utils';
import usePotentialOwnerStore, {
  useInitialisePotentialOwnerStore,
} from '../processes/[processId]/use-potentialOwner-store';
import { generateOptions } from '../processes/[processId]/potential-owner';
import { DefaultOptionType } from 'antd/es/cascader';
import { addUserTasks } from '@/lib/data/user-tasks';

import { v4 } from 'uuid';
import { truthyFilter } from '@/lib/typescript-utils';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { inlineScript } from '@proceed/user-task-helper';

type FormListProps = {
  data: HtmlForm[];
};

const filter = (inputValue: string, path: DefaultOptionType[]) =>
  path.some((option) => `${option?.value}`.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

const FormList: React.FC<FormListProps> = ({ data }) => {
  const [selectedForms, setSelectedForms] = useState<HtmlForm[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [initialData, setInitialData] = useState({ name: '', userDefinedId: '', description: '' });

  const [openUserAssignmentModal, setOpenUserAssignmentModal] = useState(false);

  const [selectedOwners, setSelectedOwners] = useState<string[][]>([]);

  const { user, roles } = usePotentialOwnerStore();
  useInitialisePotentialOwnerStore();

  const options = generateOptions(user, roles);

  const breakpoint = Grid.useBreakpoint();

  const space = useEnvironment();
  const router = useRouter();

  const [form] = Form.useForm();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: data ?? [],
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const columns: TableColumnsType<HtmlForm> = useMemo(() => {
    return [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'Name',
        ellipsis: true,
        sorter: (a, b) => a.name!.localeCompare(b.name!),
        // render: (_, record: HtmlForm) => (
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
      {
        title: 'ID',
        dataIndex: 'userDefinedId',
        key: 'ID',
        sorter: (a, b) => (a.userDefinedId ?? '').localeCompare(b.userDefinedId ?? ''),
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        sorter: (a, b) => a.description.localeCompare(b.description),
      },
    ];
  }, []);

  async function deleteItems(forms: HtmlForm[]) {
    for (const form of forms) {
      await removeHtmlForm(form.id);
    }
    setSelectedForms([]);
    router.refresh();
  }

  async function handleTaskAssignment() {
    const resourceIds = selectedOwners
      .map((v) => v[v.length - 1])
      .reduce(
        (acc, value) => {
          if (value === 'all-user') {
            acc.user = Object.keys(user);
          } else if (value === 'all-roles') {
            acc.roles = Object.keys(roles);
          } else {
            const [type, ...id] = value.split('|') as ['user' | 'roles', string];
            acc[type].push(id.join('|'));
          }
          return acc;
        },
        { user: [], roles: [] } as { user: string[]; roles: string[] },
      );

    let forms = selectedForms
      .map(({ id }) => {
        const d = data.find((f) => f.id === id);
        if (d) {
          return { ...d, html: '' };
        }
      })
      .filter(truthyFilter);

    const userTasks = await asyncMap(forms, async (task) => {
      let html = await getHtmlFormHtml(task.id);
      html = inlineScript(html, '', '', JSON.parse(task.variables));
      return {
        id: v4(),
        name: task.name,
        taskId: '',
        instanceID: '',
        fileName: '',
        state: 'READY',
        machineId: 'ms-local',
        actualOwner: [],
        potentialOwners: resourceIds,
        priority: 1,
        progress: 0,
        startTime: Date.now(),
        html,
        milestones: [],
        initialVariables: {},
      };
    });

    await addUserTasks(userTasks);
  }

  async function createNewForm() {
    const data: typeof initialData = await form.validateFields();
    await addHtmlForm({
      id: v4(),
      html: '<html><head></head> <body>Hello World</body> </html>',
      json: defaultForm,
      variables: '[]',
      milestones: '[]',
      environmentId: space.spaceId,
      ...data,
    });
    setOpenCreateModal(false);
    setInitialData({ name: '', userDefinedId: '', description: '' });
    router.refresh();
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
                    Create Html Form
                  </Button>
                </Space>
              )}

              {/* DIVIDER BLOCK */}
              <SelectionActions count={selectedForms.length} readOnly={false}>
                <Space split={<Divider type="vertical" />}>
                  {selectedForms.length === 1 && (
                    <div>
                      <Tooltip placement="top" title={'Open Editor'}>
                        <Button
                          type="text"
                          icon={<PiNotePencil className={styles.Icon} />}
                          onClick={() => {
                            const url = spaceURL(space, `/tasks/${selectedForms[0].id}`);
                            router.push(url);
                          }}
                        />
                      </Tooltip>
                      <Tooltip placement="top" title={'Open Editor in new Tab'}>
                        <Button
                          type="text"
                          icon={<IoOpenOutline className={styles.Icon} />}
                          onClick={() => {
                            const url = spaceURL(space, `/tasks/${selectedForms[0].id}`);
                            window.open(url, '_blank');
                          }}
                        />
                      </Tooltip>
                      <Tooltip placement="top" title="Assign Task">
                        <Button
                          type="text"
                          icon={<UserOutlined className={styles.Icon} />}
                          onClick={() => setOpenUserAssignmentModal(true)}
                        />
                      </Tooltip>
                      <Modal
                        title="Assign Task"
                        open={openUserAssignmentModal}
                        onOk={async () => {
                          await handleTaskAssignment();
                          setOpenUserAssignmentModal(false);
                        }}
                        onCancel={() => setOpenUserAssignmentModal(false)}
                        onClose={() => setOpenUserAssignmentModal(false)}
                      >
                        <Cascader
                          options={options}
                          placeholder="Select User or Roles that can claim this task"
                          style={{ width: '100%' }}
                          multiple
                          showSearch={{ filter }}
                          // @ts-ignore
                          onChange={setSelectedOwners}
                          value={selectedOwners}
                        />
                      </Modal>
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
                          title="Delete Html Form"
                          externalOpen={openDeleteModal}
                          onExternalClose={() => setOpenDeleteModal(false)}
                          description="Are you sure you want to delete the selected processes?"
                          onConfirm={() => deleteItems(selectedForms)}
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
        data={filteredData.map((d) => ({
          ...d,
          name: d.name.highlighted,
          description: d.description.highlighted,
        }))}
        columns={columns}
        elementSelection={{
          selectedElements: selectedForms,
          setSelectionElements: setSelectedForms,
        }}
        tableProps={{
          onRow: (element) => ({
            onClick: () => {
              const url = spaceURL(space, `/tasks/${element.id}`);
              router.push(url);
            },
          }),
        }}
      />
      <Modal
        open={openCreateModal}
        title="Create Html Form"
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

          <Form.Item
            name={'userDefinedId'}
            label="ID"
            rules={[
              { max: 50, message: 'ID can be max 50 characters long' },
              {
                required: false,
                message: 'Please enter a unique ID for the form.',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={'description'}
            label="Html Form Description"
            rules={[
              { max: 1000, message: 'Form description can be max 1000 characters long' },
              { required: false, message: 'Please fill out the Form description' },
            ]}
          >
            <Input.TextArea showCount rows={4} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FormList;
