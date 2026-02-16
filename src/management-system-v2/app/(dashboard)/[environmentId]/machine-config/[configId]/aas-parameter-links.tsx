'use client';

import { Space, Select, Tag, SelectProps, Divider, Flex } from 'antd';
import {
  Config,
  LinkedParameter,
  Parameter,
  VirtualParameter,
} from '@/lib/data/machine-config-schema';
import {
  buildLinkedInputParametersFromIds,
  findParameter,
  getAllParameters,
} from '../configuration-helper';
import { useMemo } from 'react';
import { updateParameter } from '@/lib/data/db/machine-config';
import { useRouter } from 'next/navigation';

type TagRender = SelectProps['tagRender'];

const linkedParametersTagRender: TagRender = ({ label, closable, onClose }) => {
  const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      color="purple"
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{ marginInlineEnd: 4 }}
    >
      {label}
    </Tag>
  );
};

type CustomFieldProps = {
  keyId: string;
  parameter: Parameter;
  editable: boolean;
  parentConfig: Config;
};

const AasParamLinks: React.FC<CustomFieldProps> = ({
  keyId,
  parameter,
  editable,
  parentConfig,
}) => {
  const router = useRouter();

  const [parametersList, paramIdToName] = useMemo(() => {
    let paramIdToName: { [key: string]: string } = {};
    const parametersList: { label: string; value: string }[] = getAllParameters(
      parentConfig,
      'config',
      '',
    ).map((item: { key: string; value: Parameter }) => {
      paramIdToName[item.value.id ?? ''] = item.key;
      return { label: item.key, value: item.value.id ?? '' };
    });
    return [parametersList, paramIdToName];
  }, [parentConfig]);

  const updateBacklinks = async (
    idListFilter: (LinkedParameter | undefined)[],
    field: Parameter,
    operation: 'remove' | 'add',
  ) => {
    if (!field.id) return;
    let fieldPath = buildLinkedInputParametersFromIds([field.id], parentConfig)[0].path;
    for (let element of idListFilter) {
      if (element) {
        let ref = findParameter(element.id, parentConfig, 'config')?.selection;
        if (ref) {
          if (operation === 'remove') {
            await updateParameter(
              ref.id!,
              {
                usedAsInputParameterIn: ref.usedAsInputParameterIn.filter((item) => {
                  return item.id !== field.id;
                }),
              },
              parentConfig.id,
            );
          } else {
            if (!ref.usedAsInputParameterIn?.map(({ id, path }) => id).includes(field.id))
              if (ref.usedAsInputParameterIn) {
                await updateParameter(
                  ref.id!,
                  {
                    usedAsInputParameterIn: [
                      ...ref.usedAsInputParameterIn,
                      { id: field.id, path: fieldPath },
                    ],
                  },
                  parentConfig.id,
                );
              } else {
                await updateParameter(
                  ref.id!,
                  {
                    usedAsInputParameterIn: [{ id: field.id, path: fieldPath }],
                  },
                  parentConfig.id,
                );
              }
          }
        }
      }
    }
  };

  const linkedParametersChange = async (
    paramIdList: string[],
    field: Parameter | VirtualParameter,
  ) => {
    let linkedInputParametersArray: LinkedParameter[] = buildLinkedInputParametersFromIds(
      paramIdList,
      parentConfig,
    );
    const linkedInputParameters = linkedInputParametersArray.reduce(
      (acc: Record<string, LinkedParameter>, curr, index) => {
        acc[`$IN${index + 1}`] = curr;
        return acc;
      },
      {},
    );
    // make sure to set backlinks
    await updateBacklinks(linkedInputParametersArray, field, 'add');

    // make sure to remove backlinks from unlinked parameters
    let linkIds = parameter.transformation
      ? Object.values(parameter.transformation?.linkedInputParameters).map(({ id, path }) => id)
      : [];
    const removedIds = linkIds.filter((id) => !paramIdList.includes(id));

    let removedLinkedInputParametersArray: LinkedParameter[] = buildLinkedInputParametersFromIds(
      removedIds,
      parentConfig,
    );
    await updateBacklinks(removedLinkedInputParametersArray, field, 'remove');

    // save the updated linked parameters

    await updateParameter(
      parameter.id!,
      {
        transformation: { transformationType: 'none', linkedInputParameters, action: '' },
      },
      parentConfig.id,
    );

    router.refresh();
  };

  const linkIds = parameter.transformation
    ? Object.values(parameter.transformation?.linkedInputParameters).map(({ id, path }) => id)
    : [];

  return (
    <>
      <>
        <Divider
          style={{ margin: '0px 0px 10px 0px', fontSize: '0.8rem' }}
          orientation="horizontal"
          titlePlacement="left"
        >
          Linked Parameters
        </Divider>
        {editable && (
          <Space style={{ margin: '0px 0px 0px 2.5rem' }}>
            <Select
              mode="multiple"
              allowClear={false}
              tagRender={linkedParametersTagRender}
              style={{ minWidth: 250 }}
              placeholder="Select to Add"
              value={linkIds}
              onChange={(idList: string[]) => linkedParametersChange(idList, parameter)}
              options={parametersList}
            />
          </Space>
        )}
      </>
      {!editable && (
        <Space style={{ margin: '0px 0px 0px 2.5rem' }}>
          {linkIds.map((paramId: string) => (
            <Tag color="purple">{paramIdToName[paramId]}</Tag>
          ))}
        </Space>
      )}
    </>
  );
};

export default AasParamLinks;
