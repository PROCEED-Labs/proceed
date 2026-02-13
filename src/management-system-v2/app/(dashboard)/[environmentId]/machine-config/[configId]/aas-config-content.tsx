'use client';

import {
  Config,
  Parameter,
  VirtualParameter,
  StoredParameter,
  LinkedParameter,
} from '@/lib/data/machine-config-schema';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Col, Row, Space, Tag, Table, Modal } from 'antd';
import { updateParameter } from '@/lib/data/db/machine-config';
import { buildLinkedInputParametersFromIds } from '../configuration-helper';
import AddButton from './add-button';
import AasCreateParameterModal, {
  CreateParameterModalReturnType,
} from './aas-create-parameter-modal';
import AasParamNests from './aas-parameter-nests';
import { Localization } from '@/lib/data/locale';
import ActionDropdown from './shared-action-dropdown';
import { getTableColumns } from './shared-table-columns';
import {
  getInitialTransformationData,
  hasNestedContent,
  useTreeExpansion,
  useParameterActions,
  moveParameterUp,
  moveParameterDown,
  editParameter as editParameterUtil,
} from './shared-parameter-utils';

type MachineDataViewProps = {
  // configId: string;
  // configType: 'config';
  data: Config['content'];
  parentConfig: Config;
  editingEnabled: boolean;
  // contentType: 'header' | 'target' | 'reference' | 'machine' | 'subParameters';
  hideSubParameters?: boolean;
  parentParameter?: Parameter;
  currentLanguage: Localization;
  searchSelectedParamId?: string | null;
};

const AasContent: React.FC<MachineDataViewProps> = ({
  // configId,
  // configType,
  data,
  parentConfig,
  editingEnabled: editable,
  // contentType,
  hideSubParameters = false,
  parentParameter,
  currentLanguage,
  searchSelectedParamId,
}) => {
  const router = useRouter();
  const tblRef: Parameters<typeof Table>[0]['ref'] = useRef(null);
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

  const { expandedKeys, addExpandedKey, removeExpandedKey } = useTreeExpansion({ parentConfig });
  const [targetParentForAdd, setTargetParentForAdd] = useState<Parameter | undefined>(undefined);

  const {
    currentParameter,
    setCurrentParameter,
    createFieldOpen,
    setCreateFieldOpen,
    editFieldOpen,
    setEditFieldOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    addParameter: baseAddParameter,
    handleDeleteConfirm,
  } = useParameterActions({
    parentConfig,
    onRefresh: () => router.refresh(),
    currentLanguage,
  });

  const moveRowUp = async (record: Parameter | VirtualParameter) => {
    await moveParameterUp(record, parentConfig, () => router.refresh());
  };

  const moveRowDown = async (record: Parameter | VirtualParameter) => {
    await moveParameterDown(record, parentConfig, () => router.refresh());
  };

  const actionBarGenerator = useCallback(
    (record: Parameter | VirtualParameter) => {
      const currentIndex = data.findIndex((item) => item.id === record.id);
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === data.length - 1;
      const dropdownId = `dropdown-${record.id}`;
      const isChangeable = record.changeableByUser ?? true;

      return (
        <ActionDropdown
          record={record}
          isFirst={isFirst}
          isLast={isLast}
          isOpen={openDropdowns.has(dropdownId)}
          isChangeable={isChangeable}
          onOpenChange={(open) => {
            setOpenDropdowns((prev) => {
              const newSet = new Set(prev);
              if (open) {
                newSet.add(dropdownId);
              } else {
                newSet.delete(dropdownId);
              }
              return newSet;
            });
          }}
          onMoveUp={() => moveRowUp(record)}
          onMoveDown={() => moveRowDown(record)}
          onEdit={() => {
            setCurrentParameter(record);
            setEditFieldOpen(true);
          }}
          onAddNested={() => {
            setTargetParentForAdd(record);
            setCreateFieldOpen(true);
          }}
          onDelete={() => {
            setCurrentParameter(record);
            setDeleteModalOpen(true);
          }}
        />
      );
    },
    [data, openDropdowns, setOpenDropdowns],
  );

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    // if from the dropdown
    if (targetParentForAdd) {
      await baseAddParameter(values, targetParentForAdd);
    } else if (parentParameter) {
      // otherwise use from prop
      await baseAddParameter(values, parentParameter);
    } else {
      // otherwise on root level
      await baseAddParameter(values);
    }
    // state reset
    setTargetParentForAdd(undefined);
  };

  const editParameter = async (values: CreateParameterModalReturnType[]) => {
    if (currentParameter) {
      await editParameterUtil(currentLanguage, currentParameter, values[0], parentConfig, () => {
        setEditFieldOpen(false);
        router.refresh();
        setCurrentParameter(undefined);
      });
    }
  };

  const closeDeleteModal = () => setDeleteModalOpen(false);

  const columns = useMemo(
    () =>
      getTableColumns({
        editable,
        parentConfig,
        actionBarGenerator,
        currentLanguage,
      }),
    [currentLanguage, editable, actionBarGenerator, parentConfig],
  );

  const expand = (record: Parameter) => (
    <div style={{ marginBottom: hasNestedContent(record) ? '10px' : '0' }}>
      {/* Linked Parameters */}
      {/* {(editable || !!Object.values(record.transformation?.linkedInputParameters || {}).length) && (
        <AasParamLinks
          parentConfig={parentConfig}
          key={record.name}
          keyId={record.name}
          parameter={record}
          editable={editable}
        />
      )} */}

      {/* Nested Parameters */}
      {record.subParameters && record.subParameters.length > 0 && !hideSubParameters && (
        <AasParamNests
          parentConfig={parentConfig}
          parameter={record}
          editable={editable}
          currentLanguage={currentLanguage}
        />
      )}
    </div>
  );

  const onExpand = (expanded: boolean, record: Parameter) => {
    if (expanded) {
      addExpandedKey(record.id!);
    } else {
      removeExpandedKey(record.id!);
    }
  };

  return (
    <>
      <style jsx global>{`
        .expanded-row-with-spacing {
          border-bottom: 8px solid transparent !important;
        }
        .search-highlighted-row {
          background-color: rgba(115, 209, 61, 0.15) !important;
          border: 2px solid #73d13d !important;
          box-shadow: 0 0 0 3px rgba(115, 209, 61, 0.15) !important;
        }
        .search-highlighted-row:hover {
          background-color: rgba(115, 209, 61, 0.26) !important;
        }
        .search-highlighted-row > td {
          background-color: transparent !important;
        }
      `}</style>

      <Space
        orientation="vertical"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* {contentType == 'header' && (
          // Category Tags
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            {parentConfig.category &&
              parentConfig.category.value.split(';').map((cat) => (
                <Space key={cat}>
                  <Tag color="orange">{cat}</Tag>
                </Space>
              ))}
          </Row>
        )} */}

        {data && data.length > 0 ? (
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              overflowX: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              boxSizing: 'border-box',
              margin: '0',
              padding: '0',
            }}
          >
            <Table<Parameter>
              style={{
                minWidth: '600px',
                width: '100%',
                tableLayout: 'fixed',
              }}
              bordered={false}
              virtual
              columns={columns}
              rowKey="id"
              dataSource={data}
              pagination={false}
              ref={tblRef}
              showHeader={true}
              rowSelection={undefined}
              rowClassName={(record) =>
                record.id === searchSelectedParamId ? 'search-highlighted-row' : ''
              }
              expandable={{
                columnWidth: 32,
                expandedRowRender: expand,
                expandedRowKeys: expandedKeys,
                rowExpandable: (record) => record.subParameters.length > 0 && !hideSubParameters,
                onExpand: onExpand,
              }}
              onRow={(record) => ({ id: 'scrollref_' + record.id })}
            />
          </div>
        ) : (
          <div></div>
        )}
      </Space>

      {/* Row: Add Meta/Parameter */}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ marginLeft: '4px', marginTop: '0px' }}>
          <Col span={21} className="gutter-row">
            {data.every(
              (param) =>
                !expandedKeys.includes(param.id!) ||
                !param.subParameters ||
                param.subParameters.length === 0,
            ) && (
              <AddButton
                label={'Add Parameter'}
                onClick={() => {
                  setTargetParentForAdd(undefined);
                  setCreateFieldOpen(true);
                }}
              />
            )}
          </Col>
        </Row>
      )}

      {/* Modals */}
      <AasCreateParameterModal
        // title={contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        title={'Create'}
        open={createFieldOpen}
        onCancel={() => {
          setCreateFieldOpen(false);
          setTargetParentForAdd(undefined);
        }}
        onSubmit={addParameter}
        okText="Create"
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />
      <AasCreateParameterModal
        title={'Edit Parameter'}
        open={editFieldOpen}
        onCancel={() => setEditFieldOpen(false)}
        onSubmit={editParameter}
        okText="Save"
        valueTemplateSource={
          currentParameter && 'valueTemplateSource' in currentParameter
            ? currentParameter.valueTemplateSource
            : undefined
        }
        initialData={
          currentParameter
            ? [
                {
                  name: currentParameter.name || '',
                  value:
                    'valueTemplateSource' in currentParameter
                      ? parentConfig[currentParameter.valueTemplateSource].value
                      : currentParameter.value || '',
                  unit: currentParameter.unitRef || '',
                  displayName: currentParameter.displayName || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  description: currentParameter.description || [
                    { text: '', language: currentLanguage || 'en' },
                  ],
                  // transformation fields
                  ...getInitialTransformationData(currentParameter),
                  // advanced settings with defaults
                  parameterType: currentParameter.parameterType || 'none',
                  structureVisible:
                    currentParameter.structureVisible !== undefined
                      ? currentParameter.structureVisible
                        ? 'yes'
                        : 'no'
                      : 'yes',
                  valueTemplateSource:
                    'valueTemplateSource' in currentParameter
                      ? currentParameter.valueTemplateSource
                      : 'none',
                },
              ]
            : []
        }
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />

      <Modal
        open={deleteModalOpen}
        title={'Deleting ' + currentParameter?.name}
        onOk={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      >
        <p>
          Are you sure you want to delete the parameter <b>{currentParameter?.name}</b> with ID{' '}
          <em>{currentParameter?.id}</em> ?
        </p>
      </Modal>
    </>
  );
};

export default AasContent;
