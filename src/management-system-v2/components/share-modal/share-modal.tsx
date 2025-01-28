'use client';
import { FC, useEffect, useRef, useState } from 'react';
import { Modal, Button, Tooltip, Divider, Grid, App, Spin, Typography, Tabs } from 'antd';
import {
  ShareAltOutlined,
  LinkOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import ModelerShareModalOptionPublicLink from './public-link';
import ModelerShareModalOptionEmdedInWeb from './embed-in-web';
import { useParams } from 'next/navigation';
import { ProcessExportOptions } from '@/lib/process-export/export-preparation';
import { getProcess } from '@/lib/data/processes';
import { Process } from '@/lib/data/process-schema';
import { useEnvironment } from '@/components/auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { updateShare } from './share-helpers';
import useModelerStateStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import {
  copyProcessImage,
  shareProcessImage,
  shareProcessImageFromXml,
} from '@/lib/process-export/copy-process-image';

type ShareModalProps = {
  onExport: () => void;
  onExportMobile: (type: ProcessExportOptions['type']) => void;
  process: { name: string; id: string; bpmn: string };
  versions: Process['versions'];
};
type SharedAsType = 'public' | 'protected';

const ModelerShareModalButton: FC<ShareModalProps> = ({
  onExport,
  onExportMobile,
  versions: processVersions,
  process,
}) => {
  const processId = useParams().processId as string;
  const environment = useEnvironment();
  const app = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const modeler = useModelerStateStore((state) => state.modeler);

  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const openShareModal = () => setIsOpen(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const isSharing = useRef(false);

  const [sharedAs, setSharedAs] = useState<SharedAsType>('public');
  const [shareToken, setShareToken] = useState('');
  const [shareTimestamp, setShareTimestamp] = useState(0);
  const [allowIframeTimestamp, setAllowIframeTimestamp] = useState(0);

  const [checkingIfProcessShared, setCheckingIfProcessShared] = useState(false);
  const checkIfProcessShared = async () => {
    try {
      setCheckingIfProcessShared(true);
      const res = await getProcess(processId as string, environment.spaceId);
      if (!('error' in res)) {
        const { sharedAs, allowIframeTimestamp, shareTimestamp } = res;
        setSharedAs(sharedAs as SharedAsType);
        setShareToken(shareToken);
        setShareTimestamp(shareTimestamp);
        setAllowIframeTimestamp(allowIframeTimestamp);
      }
    } catch (_) {}
    setCheckingIfProcessShared(false);
  };

  const handleCopyXMLToClipboard = async () => {
    const xml = await modeler?.getXML();
    if (xml) {
      navigator.clipboard.writeText(xml);
      app.message.success('Copied to clipboard');
    }
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
    let url: string | null = null;
    await updateShare(
      {
        processId,
        spaceId: environment.spaceId,
        sharedAs,
      },
      {
        app,
        onSuccess: (_url) => (url = _url ?? null),
      },
    );
    isSharing.current = false;

    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${process.name} | PROCEED`,
          text: 'Here is a shared process for you',
          url,
        });
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(url);
      app.message.success('Copied to clipboard');
    }

    checkIfProcessShared();
  };

  const mobileShareProcessImage = async () => {
    const result = modeler
      ? await shareProcessImage(modeler)
      : await shareProcessImageFromXml(process.bpmn);

    if (typeof result === 'string') app.message.success(result);
    else if (result === false) app.message.error('Error sharing process as image');
  };

  useAddControlCallback('modeler', 'shift+enter', openShareModal, {
    dependencies: [],
  });

  useEffect(() => {
    checkIfProcessShared();
  }, []);

  const optionsMobile = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process with Public Link',
      optionTitle: 'Share Process with Public Link',
      key: 'share-public-link',
      children: null,
      onClick: () => mobileShareWrapper(shareProcess, ['public']),
    },
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process for Registered Users',
      optionTitle: 'Share Process for Registered Users',
      key: 'share-protected-link',
      onClick: () => mobileShareWrapper(shareProcess, ['protected']),
    },
    {
      optionIcon: <FileImageOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Process as Image',
      optionTitle: 'Share Process as Image',
      key: 'share-process-as-image',
      children: null,
      onClick: () => mobileShareWrapper(mobileShareProcessImage),
    },
  ];

  // TODO
  // useAddControlCallback(
  //   'modeler',
  //   'control+enter',
  //   () => {
  //     if (isOpen && activeIndex != null) actionClickOptions[activeIndex]();
  //   },
  //   { dependencies: [isOpen, activeIndex], level: 2, blocking: isOpen },
  // );
  // useAddControlCallback(
  //   'modeler',
  //   'left',
  //   () => {
  //     if (isOpen) {
  //       setActiveIndex((prev) => (prev == null || prev == 0 ? 0 : prev - 1));
  //     }
  //   },
  //   { dependencies: [isOpen, activeIndex] },
  // );
  // useAddControlCallback(
  //   'modeler',
  //   'right',
  //   () => {
  //     if (isOpen) {
  //       setActiveIndex((prev) =>
  //         prev == null || prev == optionsDesktop.length - 1 ? optionsDesktop.length - 1 : prev + 1,
  //       );
  //     }
  //   },
  //   { dependencies: [isOpen, activeIndex] },
  // );

  const optionsDesktop = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      label: 'Share Public Link',
      optionTitle: 'Share Public Link',
      key: 'share-public-link',
      children: (
        <ModelerShareModalOptionPublicLink
          sharedAs={sharedAs as SharedAsType}
          shareTimestamp={shareTimestamp}
          refresh={checkIfProcessShared}
          processVersions={processVersions}
        />
      ),
    },
    {
      optionIcon: (
        <span>
          <LeftOutlined style={{ fontSize: '24px' }} />
          <RightOutlined style={{ fontSize: '24px' }} />
        </span>
      ),
      label: 'Embed in Website',
      optionTitle: 'Embed in Website',
      key: 'embed-in-website',
      children: (
        <ModelerShareModalOptionEmdedInWeb
          sharedAs={sharedAs as SharedAsType}
          allowIframeTimestamp={allowIframeTimestamp}
          refresh={checkIfProcessShared}
          processVersions={processVersions}
        />
      ),
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionTitle: 'Copy Diagram to Clipboard (PNG)',
      label: 'Copy Diagram as PNG',
      key: 'copy-diagram-as-png',
      children: null,
      onClick: async () => {
        try {
          if (await copyProcessImage(modeler!)) app.message.success('Copied to clipboard');
          else
            app.message.info(
              'ClipboardAPI not supported in your browser, download the image instead',
            );
        } catch (err) {
          app.message.error(`${err}`);
        }
      },
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      label: 'Copy Diagram as XML',
      optionTitle: 'Copy BPMN to Clipboard (XML)',
      key: 'copy-diagram-as-xml',
      children: null,
      onClick: handleCopyXMLToClipboard,
    },
    {
      optionIcon: <ExportOutlined style={{ fontSize: '24px' }} />,
      label: 'Export as file',
      optionTitle: 'Export as file',
      key: 'export-as-file',
      onClick: onExport,
    },
  ];

  const tabs = breakpoint.lg ? optionsDesktop : optionsMobile;

  return (
    <>
      <Modal
        title={<div style={{ textAlign: 'center' }}>Share</div>}
        open={isOpen}
        width={breakpoint.lg ? 750 : 320}
        closeIcon={false}
        onCancel={close}
        zIndex={200}
        footer={<Button onClick={close}>Close</Button>}
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
                      {option.optionIcon}
                      <Typography.Text
                        style={{
                          textAlign: 'center',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Tooltip title={breakpoint.lg ? option.optionTitle : ''}>
                          {option.label}
                        </Tooltip>
                      </Typography.Text>
                    </Button>
                  ))}
                </div>

                {breakpoint.lg && activeIndex !== null && optionsDesktop[activeIndex].children && (
                  <Divider />
                )}
              </>
            )}
            activeKey={activeIndex?.toString()}
          />
        </Spin>
      </Modal>
      <Tooltip title="Share">
        <Button icon={<ShareAltOutlined />} onClick={() => openShareModal()} />
      </Tooltip>
    </>
  );
};

export default ModelerShareModalButton;
