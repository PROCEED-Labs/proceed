'use client';

import { useEnvironment } from '@/components/auth-can';
import Bar from '@/components/bar';
import ConfirmationButton from '@/components/confirmation-button';
import ElementList, { ListEntryLink } from '@/components/item-list-view';
import SelectionActions from '@/components/selection-actions';
import { spaceURL } from '@/lib/utils';
import {
  App,
  Button,
  Cascader,
  Divider,
  Form,
  Grid,
  Input,
  Modal,
  Space,
  Table,
  Tooltip,
} from 'antd';
import { useRouter } from 'next/navigation';
import { ComponentProps, useMemo, useState } from 'react';
import { IoOpenOutline } from 'react-icons/io5';
import { PiNotePencil } from 'react-icons/pi';
import { DeleteOutlined } from '@ant-design/icons';

import { UserOutlined } from '@ant-design/icons';

import styles from '@/components/item-list-view.module.scss';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import {
  addHtmlForm,
  getHtmlFormHtml,
  removeHtmlForms,
  updateHtmlForm,
} from '@/lib/data/html-forms';
import { defaultForm } from '@/components/html-form-editor/utils';
import usePotentialOwnerStore, {
  useInitialisePotentialOwnerStore,
} from '../processes/[mode]/[processId]/use-potentialOwner-store';
import { generateOptions } from '../processes/[mode]/[processId]/potential-owner';
import { DefaultOptionType } from 'antd/es/cascader';
import { addUserTasks } from '@/lib/data/user-tasks';

import { v4 } from 'uuid';
import { truthyFilter } from '@/lib/typescript-utils';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { inlineScript } from '@proceed/user-task-helper';
import { LuNotebookPen } from 'react-icons/lu';
import { HtmlFormMetaData } from '@/lib/html-form-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';

type FormListProps = {
  data: HtmlFormMetaData[];
};

export type ListForm = ReplaceKeysWithHighlighted<HtmlFormMetaData, 'name' | 'description'>;
type Column = Exclude<ComponentProps<typeof Table<ListForm>>['columns'], undefined>;

const FormListEntryLink: React.FC<
  React.PropsWithChildren<{
    data: ListForm;
    style?: React.CSSProperties;
    className?: string;
  }>
> = ({ children, data, style, className }) => {
  return (
    <ListEntryLink path={'tasks'} data={data} style={style} className={className}>
      {children}
    </ListEntryLink>
  );
};

const filter = (inputValue: string, path: DefaultOptionType[]) =>
  path.some((option) => `${option?.value}`.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

const FormList: React.FC<FormListProps> = ({ data }) => {
  const [selectedForms, setSelectedForms] = useState<ListForm[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCreateOrUpdateModal, setOpenCreateOrUpdateModal] = useState(false);
  const [initialData, setInitialData] = useState<HtmlFormMetaData | undefined>();

  const [openUserAssignmentModal, setOpenUserAssignmentModal] = useState(false);

  const [selectedOwners, setSelectedOwners] = useState<string[][]>([]);

  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const { message } = App.useApp();

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

  const columns: Column = useMemo(() => {
    return [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'Name',
        ellipsis: true,
        sorter: (a, b) => a.name!.value.localeCompare(b.name!.value),
        render: (_, record: ListForm) => (
          <FormListEntryLink data={record}>{record.name.highlighted}</FormListEntryLink>
        ),
        responsive: ['xs', 'sm'],
      },
      {
        title: 'ID',
        dataIndex: 'userDefinedId',
        key: 'ID',
        sorter: (a, b) => (a.userDefinedId ?? '').localeCompare(b.userDefinedId ?? ''),
        render: (_, record: ListForm) => (
          <FormListEntryLink data={record}>{record.userDefinedId}</FormListEntryLink>
        ),
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        sorter: (a, b) => a.description.value.localeCompare(b.description.value),
        render: (_, record: ListForm) => (
          <FormListEntryLink data={record}>{record.description.highlighted}</FormListEntryLink>
        ),
      },
    ];
  }, []);

  async function deleteItems(forms: ListForm[]) {
    await wrapServerCall({
      fn: () => removeHtmlForms(forms.map((form) => form.id)),
      onSuccess: () => {
        setSelectedForms([]);
        router.refresh();
      },
    });
  }

  async function handleTaskAssignment() {
    setAssigning(true);
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
      let html = await wrapServerCall({
        fn: () => getHtmlFormHtml(task.id),
        onSuccess: false,
        onError: false,
      });

      if (html) {
        html = inlineScript(html, '', '', task.variables);
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
      } else {
        message.error(`Failed to get the form data for ${task.name}.`);
      }
    });

    const resolvedUserTasks = userTasks.filter(truthyFilter);
    if (userTasks.length === resolvedUserTasks.length) {
      message.success('Assigned the tasks to the selected users.');
      await addUserTasks(resolvedUserTasks);
    } else {
      message.error('Encountered errors when trying to assign the tasks.');
    }
    setAssigning(false);
  }

  async function handleCreateOrUpdateForm() {
    setAdding(true);
    const data: { name: string; description: string; userDefinedId: string } =
      await form.validateFields();

    let newId = '';

    await wrapServerCall({
      fn: async () => {
        if (initialData) {
          return updateHtmlForm(initialData.id, data);
        } else {
          newId = v4();

          return addHtmlForm({
            id: newId,
            html: '<html><head></head> <body>Hello World</body> </html>',
            json: defaultForm,
            variables: [],
            milestones: [],
            environmentId: space.spaceId,
            ...data,
          });
        }
      },
      onSuccess: () => {
        setOpenCreateOrUpdateModal(false);
        setInitialData(undefined);

        router.refresh();
        if (newId) {
          router.push(spaceURL(space, `/tasks/${newId}`));
        }
      },
    });

    setAdding(false);
  }

  const handleCloseCreateOrUpdateModal = () => {
    setInitialData(undefined);
    setOpenCreateOrUpdateModal(false);
  };

  return (
    <>
      <Bar
        leftNode={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {!breakpoint.xs && (
                <Space>
                  <Button type="primary" onClick={() => setOpenCreateOrUpdateModal(true)}>
                    Create Html Form
                  </Button>
                </Space>
              )}

              {/* DIVIDER BLOCK */}
              <SelectionActions count={selectedForms.length} readOnly={false}>
                <Space split={<Divider type="vertical" />}>
                  <div>
                    {selectedForms.length === 1 && (
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
                    )}
                    <Tooltip placement="top" title={'Open Editor in new Tab'}>
                      <Button
                        type="text"
                        icon={<IoOpenOutline className={styles.Icon} />}
                        onClick={() => {
                          selectedForms.forEach((form) => {
                            const url = spaceURL(space, `/tasks/${form.id}`);
                            window.open(url, '_blank');
                          });
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
                      okButtonProps={{ loading: assigning }}
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
                    {selectedForms.length === 1 && (
                      <Tooltip placement="top" title={'Change Meta Data'}>
                        <Button
                          type="text"
                          icon={<LuNotebookPen className={styles.Icon} />}
                          onClick={() => {
                            const [form] = selectedForms;
                            setInitialData({
                              ...form,
                              name: form.name.value,
                              description: form.description.value,
                            });
                            setOpenCreateOrUpdateModal(true);
                          }}
                        />
                      </Tooltip>
                    )}
                  </div>

                  {
                    <div>
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
        data={filteredData}
        columns={columns}
        elementSelection={{
          selectedElements: selectedForms,
          setSelectionElements: setSelectedForms,
        }}
      />
      <Modal
        open={openCreateOrUpdateModal}
        title={initialData ? 'Update Html Form' : 'Create Html Form'}
        onClose={() => handleCloseCreateOrUpdateModal()}
        onCancel={() => handleCloseCreateOrUpdateModal()}
        onOk={handleCreateOrUpdateForm}
        okButtonProps={{ loading: adding }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          name="html_meta_data_form"
          initialValues={initialData}
          autoComplete="off"
        >
          <Form.Item
            name={'name'}
            label="Process Form Name"
            validateDebounce={1000}
            hasFeedback
            rules={[
              { max: 100, message: 'Form name can be max 100 characters long' },
              { required: true, message: 'Form name cannot be empty' },
            ]}
            preserve={false}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name={'userDefinedId'}
            label="ID"
            initialValue={initialData ? undefined : ''}
            rules={[
              { max: 50, message: 'ID can be max 50 characters long' },
              {
                required: false,
                message: 'Please enter a unique ID for the form.',
              },
            ]}
            preserve={false}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={'description'}
            label="Html Form Description"
            initialValue={initialData ? undefined : ''}
            rules={[
              { max: 1000, message: 'Form description can be max 1000 characters long' },
              { required: false, message: 'Please fill out the Form description' },
            ]}
            preserve={false}
          >
            <Input.TextArea showCount rows={4} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FormList;
