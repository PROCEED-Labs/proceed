'use client';

import styles from './page.module.scss';
import { Children, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';
import Content from '@/components/content';
import Overlay from './overlay';
import {
  BreadcrumbProps,
  Button,
  Divider,
  Input,
  Select,
  SelectProps,
  Space,
  theme,
  Typography,
} from 'antd';
import { PlusOutlined, LeftOutlined, EditOutlined } from '@ant-design/icons';
import useModelerStateStore from './use-modeler-state-store';
import useMobileModeler from '@/lib/useMobileModeler';
import ProcessCreationButton from '@/components/process-creation-button';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';

import { is as bpmnIs, isAny as bpmnIsAny } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';
import { isPlane } from 'bpmn-js/lib/util/DrilldownUtil';
import { Root } from 'bpmn-js/lib/model/Types';
import { spaceURL } from '@/lib/utils';
import { updateProcess } from '@/lib/data/processes';

type SubprocessInfo = {
  id?: string;
  name?: string;
};

type WrapperProps = PropsWithChildren<{
  processName: string;
  processes: { id: string; name: string }[];
  timelineViewFeatureEnabled: boolean;
}>;

const Wrapper = ({
  children,
  processName,
  processes,
  timelineViewFeatureEnabled,
}: WrapperProps) => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  const { processId } = useParams();
  const { spaceId } = useEnvironment();
  const pathname = usePathname();
  const environment = useEnvironment();
  const [closed, setClosed] = useState(false);
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const rootElement = useModelerStateStore((state) => state.rootElement);
  const [editingName, setEditingName] = useState<null | string>(null);
  const [timelineViewActive, setTimelineViewActive] = useState(false);

  const {
    token: { fontSizeHeading1 },
  } = theme.useToken();

  /// Derived State
  const minimized = !decodeURIComponent(pathname).includes(processId as string);

  // update the subprocess breadcrumb information if the visible layer in the modeler is changed
  const subprocessChain = useMemo(() => {
    const newSubprocessChain = [] as SubprocessInfo[];

    if (isPlane(rootElement)) {
      let element = rootElement!.businessObject;
      while (bpmnIs(element, 'bpmn:SubProcess')) {
        const shape = modeler?.getElement(element.id);
        // ignore expanded sub-processes that might be in the hierarchy chain
        if (shape && !isExpanded(shape)) {
          newSubprocessChain.unshift({ id: element.id, name: element.name });
        }
        element = element.$parent;
      }
    }

    // push a dummy element that represents the root process to generalize the subprocess handling to all possible layers in the modeler
    newSubprocessChain.unshift({
      id: undefined,
      name: undefined,
    });

    return newSubprocessChain;
  }, [rootElement, modeler]);

  useEffect(() => {
    // Reset closed state when page is not minimized anymore.
    if (!minimized) {
      setClosed(false);
    }
  }, [minimized]);

  const showMobileView = useMobileModeler();

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const breadcrumbItems: BreadcrumbProps['items'] = showMobileView
    ? [] // avoid unnecessary work in the mobile view
    : [
        /* Processes: */
        {
          title: (
            <Select
              variant="borderless"
              popupMatchSelectWidth={false}
              placeholder="Select Process"
              showSearch
              filterOption={filterOption}
              value={{
                value: processId,
                label: 'Process List',
              }}
              // prevents a warning caused by the label for the select element being different from the selected option (https://github.com/ant-design/ant-design/issues/34048#issuecomment-1225491622)
              optionLabelProp="children"
              onSelect={(_, option) => {
                router.push(spaceURL(environment, `/processes/${option.value}`));
              }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <AuthCan create Process>
                    <Divider style={{ margin: '4px 0' }} />
                    <Space style={{ display: 'flex', justifyContent: 'center' }}>
                      <ProcessCreationButton type="text" icon={<PlusOutlined />}>
                        Create new process
                      </ProcessCreationButton>
                    </Space>
                  </AuthCan>
                </>
              )}
              options={processes?.map(({ id, name }) => ({
                value: id,
                label: name,
              }))}
            />
          ),
        },
        /* (Process/Sub-Process)-Layers */
        ...subprocessChain.slice(0, -1).map(({ id, name }) => {
          const label = id ? name || id : processName || processId || '[Root Layer]';
          return {
            title: (
              <Typography.Text style={{ maxWidth: '8rem' }} ellipsis={{ tooltip: label }}>
                {label}
              </Typography.Text>
            ),
            onClick: async () => {
              if (!modeler) {
                return;
              }

              // Move to the view of another subprocess or the one of the root
              // process.
              const canvas = modeler.getCanvas();

              if (id) {
                // a specific subprocess is supposed to be displayed
                const subprocessPlane = canvas
                  .getRootElements()
                  .find((el) => el.businessObject.id === id);
                if (!subprocessPlane) {
                  return;
                }
                canvas.setRootElement(subprocessPlane);
              } else {
                // no id => show the root process
                const processPlane = canvas
                  .getRootElements()
                  .find((el) => bpmnIsAny(el, ['bpmn:Process', 'bpmn:Collaboration']));
                if (!processPlane) {
                  return;
                }
                canvas.setRootElement(processPlane);
              }

              modeler.fitViewport();
            },
          };
        }),
      ];

  // add a trailing slash if the name that is displayed in the center of the header is of a subprocess
  if (subprocessChain.length > 1) {
    breadcrumbItems.push({ title: '' });
  }

  if (closed) {
    return null;
  }

  // the name that is displayed in the center of the header
  let currentLayerName = processName || (processId as string);
  // the name of the previous layer or 'Process List' if already in the root layer (only used in the mobile view)
  let backButtonLabel = 'Process List';

  if (subprocessChain.length > 1) {
    const lastEntryIndex = subprocessChain.length - 1;
    // get the name of the last subprocess in the chain (that is the one currently shown in the modeler)
    currentLayerName =
      subprocessChain[lastEntryIndex].name || subprocessChain[lastEntryIndex].id || '[Root Layer]';

    const previousSubprocess = subprocessChain.slice(-2, -1)[0];
    backButtonLabel =
      previousSubprocess?.name || previousSubprocess?.id || processName || '[Root Layer]';
  }

  const currentSubprocess = subprocessChain.slice(-1)[0];

  const handleNameChange = async () => {
    if (editingName) {
      await updateProcess(processId as string, spaceId, undefined, undefined, editingName);
      setEditingName(null);
      router.refresh();
    }
  };

  const handleBackButtonClick = () => {
    if (!modeler) {
      return;
    }

    if (currentSubprocess.id) {
      const canvas = modeler.getCanvas();
      canvas.setRootElement(canvas.findRoot(currentSubprocess.id) as Root);
      modeler.fitViewport();
    } else {
      router.push(spaceURL(environment, `/processes`));
    }
  };

  const childrenArray = Children.toArray(children);

  return (
    <Content
      headerLeft={
        <div style={{ flex: 1, padding: '0 5px' }} className={styles.HeaderLeftContent}>
          {showMobileView ? (
            <Button icon={<LeftOutlined />} type="text" onClick={handleBackButtonClick}>
              <Typography.Text
                ellipsis={{ tooltip: backButtonLabel }}
                style={{ maxWidth: '10rem' }}
              >
                {backButtonLabel}
              </Typography.Text>
            </Button>
          ) : (
            <EllipsisBreadcrumb
              keepInFront={2}
              keepInBack={2}
              className={styles.ProcessBreadcrumb}
              style={{ fontSize: fontSizeHeading1, color: 'black' }}
              separator={<span style={{ fontSize: '20px' }}>/</span>}
              items={breadcrumbItems}
            />
          )}
          {timelineViewFeatureEnabled && (
            <button onClick={() => setTimelineViewActive(!timelineViewActive)}>switch mode</button>
          )}
        </div>
      }
      headerCenter={
        <div style={{ flex: 1, padding: '0 5px' }}>
          {editingName ? (
            <>
              <Input
                autoFocus
                variant="borderless"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleNameChange()}
                onPressEnter={() => handleNameChange()}
              ></Input>
            </>
          ) : (
            <span
              className={styles.Name}
              onClick={() => {
                setEditingName(currentLayerName);
              }}
            >
              <Typography.Text strong style={{ marginRight: '0.25rem' }}>
                {currentLayerName}
              </Typography.Text>
              <EditOutlined></EditOutlined>
            </span>
          )}
        </div>
      }
      compact
      wrapperClass={cn(styles.Wrapper, { [styles.minimized]: minimized })}
      headerClass={cn(styles.HF, { [styles.minimizedHF]: minimized })}
    >
      {timelineViewActive ? childrenArray[1] : childrenArray[0]}
      {minimized ? (
        <Overlay processId={processId as string} onClose={() => setClosed(true)} />
      ) : null}
    </Content>
  );
};

export default Wrapper;
