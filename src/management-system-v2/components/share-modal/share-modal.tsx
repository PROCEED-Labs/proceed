import { FC, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Button,
  Tooltip,
  Divider,
  Grid,
  App,
  Spin,
  Typography,
  Tabs,
  TabsProps,
} from 'antd';
import {
  ShareAltOutlined,
  LinkOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { getProcess } from '@/lib/data/processes';
import { ProcessMetadata } from '@/lib/data/process-schema';
import { useEnvironment } from '@/components/auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { updateShare } from './share-helpers';
import useModelerStateStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import {
  shareProcessImage,
  shareProcessImageFromXml,
} from '@/lib/process-export/copy-process-image';

import ModelerShareModalOptionPublicLink from './public-link';
import ModelerShareModalOptionEmdedInWeb from './embed-in-web';
import {
  ProcessExportOption,
  ProcessExportSubmitButton,
  useExportOptionsState,
  useExportProcess,
} from './export';

type ShareModalProps = {
  processes: {
    id: string;
    name: string;
    environmentId: string;
    bpmn?: string;
    versions: ProcessMetadata['versions'];
  }[];
  open: boolean;
  close: () => void;
  defaultOpenTab?: 'export-as-file' | 'share-public-link';
};
type SharedAsType = 'public' | 'protected';

export const ShareModal: FC<ShareModalProps> = ({ processes, open, close, defaultOpenTab }) => {
  const environment = useEnvironment();
  const app = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const modeler = useModelerStateStore((state) => state.modeler);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const isSharing = useRef(false);

  const [sharedAs, setSharedAs] = useState<SharedAsType>('public');
  const [shareToken, setShareToken] = useState('');
  const [shareTimestamp, setShareTimestamp] = useState(0);
  const [allowIframeTimestamp, setAllowIframeTimestamp] = useState(0);

  // The easiest way to have the submit button of the export options in the modal footer, is to keep
  // the state here and pass it down to the components
  const [exportState, selectedVersionIdsState] = useExportOptionsState(processes[0]?.versions);
  const [isExporting, exportProcesses] = useExportProcess(
    processes.map((p) => ({ definitionId: p.id })),
    exportState[0],
    selectedVersionIdsState,
  );

  const [checkingIfProcessShared, setCheckingIfProcessShared] = useState(false);
  const checkIfProcessShared = async () => {
    if (processes.length !== 1) return;
    try {
      setCheckingIfProcessShared(true);
      const res = await getProcess(processes[0].id, processes[0].environmentId);
      if (!('error' in res)) {
        const { sharedAs, allowIframeTimestamp, shareTimestamp } = res;
        setSharedAs(sharedAs as SharedAsType);
        setShareToken(shareToken);
        setShareTimestamp(shareTimestamp);
        setAllowIframeTimestamp(allowIframeTimestamp);
      }
    } catch (_) { }
    setCheckingIfProcessShared(false);
  };

  const mobileShareWrapper = async <T extends (...args: any[]) => any>(
    fn: T,
    args?: Parameters<T>,
  ) => {
    // Avoid two simultaneous shares
    if (isSharing.current) return;
    isSharing.current = true;
    await fn(...(args ? args : []));
    isSharing.current = false;
  };

  const shareProcess = async (sharedAs: 'public' | 'protected') => {
    if (processes.length !== 1) return;
    let url: string | null = null;
    await updateShare(
      {
        processId: processes[0].id,
        spaceId: environment.spaceId,
        sharedAs,
      },
      {
        app,
        onSuccess: (_url) => (url = _url ?? null),
      },
    );

    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${processes[0].name} | PROCEED`,
          text: 'Here is a shared process for you',
          url,
        });
      } catch (_) { }
    } else {
      navigator.clipboard.writeText(url);
      app.message.success('Copied to clipboard');
    }

    checkIfProcessShared();
  };

  const mobileShareProcessImage = async () => {
    // NOTE: If a modeler happened to be open and the share modal was opened for another process,
    // this would export the wrong process image, however this is currently not possible in the UI
    let result;
    if (modeler) result = await shareProcessImage(modeler);
    else if (processes[0]?.bpmn) await shareProcessImageFromXml(processes[0].bpmn);

    if (typeof result === 'string') app.message.success(result);
    else if (result === false) app.message.error('Error sharing process as image');
  };

  useEffect(() => {
    checkIfProcessShared();
  }, []);

  const optionsMobile = [
    {
      icon: <LinkOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process with Public Link',
      key: 'share-public-link',
      children: null,
      onClick: () => mobileShareWrapper(shareProcess, ['public']),
    },
    {
      icon: <LinkOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process for Registered Users',
      key: 'share-protected-link',
      onClick: () => mobileShareWrapper(shareProcess, ['protected']),
    },
    {
      icon: <FileImageOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process as Image',
      key: 'share-process-as-image',
      children: null,
      onClick: () => mobileShareWrapper(mobileShareProcessImage),
    },
  ];

  const optionsDesktop: (NonNullable<TabsProps['items']>[number] & {
    onClick?: () => void;
  })[] = [
      {
        icon: <LinkOutlined style={{ fontSize: '24px' }} />,
        label: 'Share Public Link',
        key: 'share-public-link',
        children: (
          <ModelerShareModalOptionPublicLink
            sharedAs={sharedAs as SharedAsType}
            shareTimestamp={shareTimestamp}
            refresh={checkIfProcessShared}
            process={processes[0]}
          />
        ),
      },
      {
        icon: (
          <span>
            <LeftOutlined style={{ fontSize: '24px' }} />
            <RightOutlined style={{ fontSize: '24px' }} />
          </span>
        ),
        label: 'Embed in Website',
        key: 'embed-in-website',
        children: (
          <ModelerShareModalOptionEmdedInWeb
            sharedAs={sharedAs as SharedAsType}
            allowIframeTimestamp={allowIframeTimestamp}
            refresh={checkIfProcessShared}
            process={processes[0]}
          />
        ),
      },
      {
        icon: <CopyOutlined style={{ fontSize: '24px' }} />,
        label: 'Download Diagram as PDF',
        key: 'pdf',
        children: (
          <ProcessExportOption
            type="pdf"
            active
            exportOptionsState={exportState}
            versionIdState={selectedVersionIdsState}
            processes={processes}
          />
        ),
      },
      {
        icon: <CopyOutlined style={{ fontSize: '24px' }} />,
        label: 'Download Diagram as PNG',
        key: 'png',
        children: (
          <ProcessExportOption
            type="png"
            active
            exportOptionsState={exportState}
            versionIdState={selectedVersionIdsState}
            processes={processes}
          />
        ),
      },
      {
        icon: <CopyOutlined style={{ fontSize: '24px' }} />,
        label: 'Download Diagram as SVG',
        key: 'svg',
        children: (
          <ProcessExportOption
            type="svg"
            active
            exportOptionsState={exportState}
            versionIdState={selectedVersionIdsState}
            processes={processes}
          />
        ),
      },
      {
        icon: <CopyOutlined style={{ fontSize: '24px' }} />,
        label: 'Download Diagram as BPMN',
        key: 'bpmn',
        children: (
          <ProcessExportOption
            type="bpmn"
            active
            exportOptionsState={exportState}
            versionIdState={selectedVersionIdsState}
            processes={processes}
          />
        ),
      },
    ];

  const tabs = breakpoint.lg ? optionsDesktop : optionsMobile;

  useEffect(() => {
    const tabIdx = tabs.findIndex((tab) => tab.key === defaultOpenTab);
    if (tabIdx !== -1) setActiveIndex(tabIdx);
  }, [defaultOpenTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // block controls when modal is open
  useAddControlCallback(
    ['process-list', 'modeler'],
    [
      'selectall',
      'esc',
      'del',
      'copy',
      'paste',
      'enter',
      'cut',
      'export',
      'import',
      'shift+enter',
      'new',
    ],
    (e) => {
      // e.preventDefault();
    },
    { level: 1, blocking: open },
  );

  useAddControlCallback(
    'modeler',
    'control+enter',
    () => {
      const option = tabs[activeIndex];
      if (open && option?.onClick) option.onClick();
    },
    { dependencies: [open, activeIndex], level: 2, blocking: open },
  );
  useAddControlCallback(
    'modeler',
    'left',
    () => {
      if (open) {
        setActiveIndex((prev) =>
          prev - 1 < 0 ? tabs.length - 1 : Math.min(prev - 1, tabs.length),
        );
      }
    },
    { dependencies: [open, activeIndex] },
  );
  useAddControlCallback(
    'modeler',
    'right',
    () => {
      if (open) {
        setActiveIndex((prev) => (prev + 1) % tabs.length);
      }
    },
    { dependencies: [open, activeIndex] },
  );

  return (
    <Modal
      title={<div style={{ textAlign: 'center' }}>Share</div>}
      open={open}
      width={breakpoint.lg ? 750 : 320}
      closeIcon={false}
      onCancel={close}
      zIndex={200}
      footer={
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'end' }}>
          <Button onClick={close} key="close">
            Close
          </Button>
          {['bpmn', 'svg', 'png', 'pdf'].includes(tabs[activeIndex]?.key) && (
            <ProcessExportSubmitButton
              type={tabs[activeIndex]?.key as any}
              exportProcesses={exportProcesses}
              isExporting={isExporting}
              moreThanOne={processes.length > 1}
              state={exportState[0]}
            />
          )}
        </div>
      }
    >
      <Spin spinning={checkingIfProcessShared}>
        {/* The Tabs might seem unnecessary, but they keep the state of the components avoiding unnecessary fetches */}
        <Tabs
          items={tabs.map((t, idx) => ({ ...t, key: idx.toString() }))}
          renderTabBar={() => (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: breakpoint.lg ? 'row' : 'column',
                  flexWrap: breakpoint.lg ? 'nowrap' : 'wrap',
                  alignItems: '',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                }}
              >
                {tabs.map((option, index) => (
                  <Button
                    key={index}
                    style={{
                      flex: breakpoint.lg ? '1 1 0' : '', // evenly fill container
                      height: 'auto', // Allow for vertical stretching
                      minHeight: 'min-content',
                      padding: '.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                      textOverflow: 'ellipsis',
                    }}
                    color={index === activeIndex ? 'primary' : 'default'}
                    variant="outlined"
                    onClick={() => {
                      setActiveIndex(index);
                      if ('onClick' in option && option.onClick) option.onClick();
                    }}
                  >
                    {option.icon}
                    <Typography.Text
                      style={{
                        textAlign: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      <Tooltip title={breakpoint.lg ? option.label : ''}>{option.label}</Tooltip>
                    </Typography.Text>
                  </Button>
                ))}
              </div>

              {breakpoint.lg && activeIndex !== null && tabs[activeIndex].children && <Divider />}
            </>
          )}
          activeKey={activeIndex?.toString()}
        />
      </Spin>
    </Modal>
  );
};

export const ShareModalButton = (props: Omit<ShareModalProps, 'open' | 'close'>) => {
  const [open, setOpen] = useState(false);

  useAddControlCallback('modeler', 'shift+enter', () => setOpen(true), {
    dependencies: [],
  });

  return (
    <>
      <ShareModal {...props} open={open} close={() => setOpen(false)} />
      <Tooltip title="Share">
        <Button icon={<ShareAltOutlined />} onClick={() => setOpen(true)} />
      </Tooltip>
    </>
  );
};
