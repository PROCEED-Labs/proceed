'use client';

import {
  Config,
  LinkedParameter,
  Parameter,
  StoredParameter,
  StoredVirtualParameter,
  VirtualParameter,
} from '@/lib/data/machine-config-schema';
import { Divider, Modal, Row, Table, Col } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { updateConfigMetadata, updateParameter } from '@/lib/data/db/machine-config';
import { buildLinkedInputParametersFromIds, findParameter } from '../configuration-helper';
import { useRouter } from 'next/navigation';
import { Localization } from '@/lib/data/locale';
import AasCreateParameterModal, {
  CreateParameterModalReturnType,
} from './aas-create-parameter-modal';
import AddButton from './add-button';
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
  editable: boolean;
  parameter: Parameter;
  parentConfig: Config;
  currentLanguage: Localization;
};

const AasParamNests: React.FC<MachineDataViewProps> = ({
  editable,
  parameter,
  parentConfig,
  currentLanguage,
}) => {
  const router = useRouter();
  const tblRef: Parameters<typeof Table>[0]['ref'] = useRef(null);
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

  const { expandedKeys, addExpandedKey, removeExpandedKey } = useTreeExpansion({ parentConfig });

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
      const currentIndex = parameter.subParameters.findIndex(
        (item: { id: string }) => item.id === record.id,
      );
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === parameter.subParameters.length - 1;
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
            setCurrentParameter(record);
            setCreateFieldOpen(true);
          }}
          onDelete={() => {
            setCurrentParameter(record);
            setDeleteModalOpen(true);
          }}
        />
      );
    },
    [parameter.subParameters, openDropdowns, setOpenDropdowns],
  );

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    await baseAddParameter(values);
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

  const expand = (parameter: Parameter) => (
    <div style={{ marginBottom: hasNestedContent(parameter) ? '10px' : '0' }}>
      {/* Linked Parameters - Moved to create modal */}
      {/* {(editable ||
        !!Object.values(parameter.transformation?.linkedInputParameters || {}).length) && (
        <AasParamLinks
          parentConfig={parentConfig}
          key={parameter.name}
          keyId={parameter.name}
          parameter={parameter}
          editable={editable}
        />
      )} */}
      {/* Nested Parameters */}
      {parameter.subParameters && parameter.subParameters.length > 0 && (
        <AasParamNests
          parentConfig={parentConfig}
          parameter={parameter}
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
      <Divider
        style={{ margin: '10px 0px', fontSize: '0.8rem' }}
        orientation="horizontal"
        titlePlacement="left"
      >
        Nested Parameters
      </Divider>
      <Table<Parameter>
        style={{ marginBlock: '-0.75rem', marginInline: '2.5rem -0.5rem' }}
        bordered={false}
        virtual
        columns={columns}
        rowKey="id"
        dataSource={parameter.subParameters}
        pagination={false}
        ref={tblRef}
        showHeader={true}
        rowSelection={undefined}
        expandable={{
          columnWidth: 32,
          expandedRowRender: expand,
          expandedRowKeys: expandedKeys,
          rowExpandable: (parameter) =>
            // editable ||
            // !!parameter.transformation?.linkedInputParameters?.length ||
            parameter.subParameters.length > 0,
          onExpand: onExpand,
          expandIconColumnIndex: 0,
        }}
        onRow={(record) => ({ id: 'scrollref_' + record.id })}
      />
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ marginTop: '20px', marginLeft: '25px' }}>
          <Col span={21} className="gutter-row">
            {/* show only if all nested parameters are collapsed orr all expanded ones have no furthar nessting */}
            {parameter.subParameters.every(
              (param: { id: string; subParameters: string | any[] }) =>
                !expandedKeys.includes(param.id!) ||
                !param.subParameters ||
                param.subParameters.length === 0,
            ) && (
              <AddButton
                label={'Add Parameter'}
                disabled={!parameter.changeableByUser}
                onClick={() => {
                  setCurrentParameter(parameter);
                  setCreateFieldOpen(true);
                }}
              />
            )}
          </Col>
        </Row>
      )}
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

      <AasCreateParameterModal
        title="Create Parameter"
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
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
                  name: currentParameter!.name || '',
                  value:
                    'valueTemplateSource' in currentParameter
                      ? parentConfig[currentParameter.valueTemplateSource].value
                      : currentParameter.value || '',
                  unit: currentParameter!.unitRef || '',
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
                  origin: currentParameter.origin || '',
                },
              ]
            : []
        }
        showKey
        parentConfig={parentConfig}
        currentLanguage={currentLanguage}
      />
    </>
  );
};

export default AasParamNests;
