'use client';

import DynamicTable from '@atlaskit/dynamic-table';
import Button from '@atlaskit/button/new';
import { ButtonGroup } from '@atlaskit/button';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Form, {
  FormHeader,
  FormSection,
  FormFooter,
  RequiredAsterisk,
  Field,
  HelperMessage,
  ErrorMessage,
  CheckboxField,
  ValidMessage,
  useFormState,
} from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Tag from '@atlaskit/tag';
import { Fragment, useEffect, useState } from 'react';
import Checkbox from '@atlaskit/checkbox';
import SearchIcon from '@atlaskit/icon/glyph/search';
import '@atlaskit/css-reset';
import { CheckboxSelect } from '@atlaskit/select';
import { Col, Input, Row, Space } from 'antd';
import styles from './process-list.module.scss';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import { updateProcess, deleteProcesses } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useRouter } from 'next/navigation';

const SubmitButton = ({ submit }: { submit: (values: any) => void }) => {
  const formState = useFormState<{ name: string; description: string }>({
    values: true,
    pristine: true,
    dirty: true,
    valid: true,
  });
  console.log('formState', formState);
  return (
    <Button
      appearance="primary"
      isDisabled={!formState || !formState.valid}
      onClick={() => {
        submit(formState!.values);
      }}
    >
      Submit
    </Button>
  );
};
const ProcessModal = ({
  title,
  open,
  close,
  processData,
}: {
  title: string;
  open: boolean;
  close: (values?: { name: string; description: string }) => void;
  processData: Process | ConfluenceProcess | null;
}) => {
  const submit = (values: { name: string; description: string }) => {
    close(values);
  };
  console.log('processData', processData);
  return (
    <ModalTransition>
      {open && (
        <Modal onClose={() => close()}>
          <Form onSubmit={submit}>
            {({ formProps, getState }) => (
              <form id="form-with-id" {...formProps}>
                <ModalHeader>
                  <ModalTitle>{title}</ModalTitle>
                </ModalHeader>

                <ModalBody>
                  <p aria-hidden="true" style={{ marginBottom: '24px' }}>
                    Required fields are marked with an asterisk <RequiredAsterisk />
                  </p>

                  <Field
                    label="Name"
                    name="name"
                    isRequired
                    defaultValue={processData?.name}
                    validate={(value) => {
                      const res = !value || value.length < 3 ? 'TOO_SHORT' : undefined;
                      return res;
                    }}
                  >
                    {({ fieldProps }) => <TextField {...fieldProps} />}
                  </Field>

                  <Field
                    label="Description"
                    name="description"
                    defaultValue={processData?.description}
                    validate={(value) => (value && value.length < 3 ? 'TOO_SHORT' : undefined)}
                  >
                    {({ fieldProps }: any) => (
                      <TextArea
                        defaultValue={processData?.description}
                        id="area"
                        resize="auto"
                        maxHeight="20vh"
                        name="area"
                        onPointerEnterCapture={undefined}
                        onPointerLeaveCapture={undefined}
                        {...fieldProps}
                      />
                    )}
                  </Field>
                </ModalBody>
                <ModalFooter>
                  <Button onClick={() => close()} appearance="subtle">
                    Cancel
                  </Button>
                  <SubmitButton submit={submit}></SubmitButton>
                </ModalFooter>
              </form>
            )}
          </Form>
        </Modal>
      )}
    </ModalTransition>
  );
};

interface ConfluenceProcess {
  id: string;
  name: string;
  description: string;
  origin: string;
  container: string;
  lastEdited: number;
  createdOn: number;
}

const ProcessList = ({ processes: initialProcesses }: { processes: Process[] }) => {
  const confluenceMockProcesses = [
    {
      id: '1',
      name: 'Process A',
      description: 'This is a process',
      origin: 'Confluence',
      container: 'Test Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
    {
      id: '2',
      name: 'Process B',
      description: 'This is a process',
      origin: 'Confluence',
      container: 'Process Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
    {
      id: '3',
      name: 'Process C',
      description: 'This is another process',
      origin: 'Confluence',
      container: 'Test Page',
      lastEdited: 1715543462411,
      createdOn: 1715543462411,
    },
  ];

  const { spaceId } = useEnvironment();
  const router = useRouter();

  useEffect(() => {
    setProcesses([...initialProcesses, ...confluenceMockProcesses]);
  }, [initialProcesses]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | ConfluenceProcess | null>(null);
  const [isModelerOpen, setIsModelerOpen] = useState(false);
  const [processes, setProcesses] = useState([...initialProcesses, ...confluenceMockProcesses]);

  const closeEditModal = (values?: { name: string; description: string }) => {
    if (values) {
      if ('origin' in editingProcess!) {
        console.log('changed confluence process');
      } else {
        updateProcess(editingProcess!.id, spaceId, undefined, values.description, values.name).then(
          () => router.refresh(),
        );
      }
    }

    setIsEditModalOpen(false);
    setEditingProcess(null);
  };

  const closeModeler = () => {
    setIsModelerOpen(false);
  };

  const deleteProcess = (id: string) => {
    deleteProcesses([id], spaceId).then(() => router.refresh());
  };

  // applied as rows in the form
  const rows = processes.map((process, index) => ({
    key: `row-${index}-${process.name}`,
    cells: [
      {
        key: process.name,
        content: process.name,
      },
      {
        key: 'description' + process.description + process.id,
        content: process.description,
      },
      {
        key: 'origin' + process.id,
        content: 'origin' in process ? process.origin : 'PROCEED',
      },
      {
        key: 'container' + process.id,
        content: 'container' in process ? <a href="">{process.container}</a> : '',
      },
      {
        key: 'lastEdited' + process.lastEdited + process.id,
        content: new Date(process.lastEdited).toLocaleString(),
      },
      {
        key: 'createdOn' + process.createdOn + process.id,
        content: new Date(process.createdOn).toLocaleDateString(),
      },
      {
        key: 'action' + process.id,
        content: (
          <ButtonGroup>
            <Button
              onClick={() => {
                setIsModelerOpen(true);
              }}
              appearance="primary"
            >
              Open
            </Button>
            <Button
              onClick={() => {
                setEditingProcess(process);
                setIsEditModalOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              onClick={() => {
                deleteProcess(process.id);
              }}
            >
              Delete
            </Button>
          </ButtonGroup>
        ),
      },
    ],
  }));

  const head = {
    cells: [
      {
        key: 'name',
        content: 'Name',
        isSortable: true,
      },
      {
        key: 'description',
        content: 'Description',
        shouldTruncate: true,
        isSortable: true,
      },
      {
        key: 'origin',
        content: 'Origin',
        isSortable: true,
      },
      {
        key: 'container',
        content: 'Container',
        isSortable: true,
      },
      {
        key: 'lastEdited',
        content: 'Last Edited',
        isSortable: true,
      },
      {
        key: 'createdOn',
        content: 'Created On',
        isSortable: true,
      },
      {
        key: 'actions',
        content: '',
        width: 10,
      },
    ],
  };

  const onSearch = (value: string, _e: any, info?: { source?: 'input' | 'clear' | undefined }) => {
    console.log(info?.source, value);
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: '1rem' }}>
        <Col span={8}>
          <TextField
            appearance="standard"
            placeholder="Search for Process"
            style={{ width: '200px' }}
            elemAfterInput={<SearchIcon label="Search" size="medium"></SearchIcon>}
          ></TextField>
        </Col>
        <Col span={4}>
          <CheckboxSelect
            isClearable={false}
            placeholder="Filter for Processes"
            options={[
              { label: 'PROCEED', value: 'PROCEED' },
              { label: 'This Space', value: 'space' },
              { label: 'Own', value: 'own' },
            ]}
          ></CheckboxSelect>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <DynamicTable
            head={head}
            rows={rows}
            rowsPerPage={5}
            defaultPage={1}
            loadingSpinnerSize="large"
          />
        </Col>
      </Row>
      <ProcessModal
        title="Edit Process"
        processData={editingProcess}
        open={isEditModalOpen}
        close={closeEditModal}
      ></ProcessModal>
    </>
  );
};

export default ProcessList;
