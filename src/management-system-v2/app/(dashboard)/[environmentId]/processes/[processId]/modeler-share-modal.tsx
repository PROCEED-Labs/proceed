'use client';
import React, { FC, useState } from 'react';
import { Modal, Button, Tooltip, Space, Divider, message, Grid, App } from 'antd';
import {
  ShareAltOutlined,
  LinkOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
  FileImageOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import useModelerStateStore from './use-modeler-state-store';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import ModelerShareModalOptionPublicLink from './modeler-share-modal-option-public-link';
import ModelerShareModalOptionEmdedInWeb from './modeler-share-modal-option-embed-in-web';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useParams } from 'next/navigation';
import { shareProcessImage } from '@/lib/process-export/copy-process-image';
import ModelerShareModalOption from './modeler-share-modal-option';
import { ProcessExportOptions } from '@/lib/process-export/export-preparation';
import { getProcess } from '@/lib/data/processes';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import { useEnvironment } from '@/components/auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { set } from 'zod';

type ShareModalProps = {
  onExport: () => void;
  onExportMobile: (type: ProcessExportOptions['type']) => void;
  versions: Process['versions'];
};
type SharedAsType = 'public' | 'protected';

const ModelerShareModalButton: FC<ShareModalProps> = ({
  onExport,
  onExportMobile,
  versions: processVersions,
}) => {
  const { processId } = useParams();
  const environment = useEnvironment();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const modeler = useModelerStateStore((state) => state.modeler);
  const breakpoint = Grid.useBreakpoint();
  const [sharedAs, setSharedAs] = useState<SharedAsType>('public');
  const [isSharing, setIsSharing] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [shareTimestamp, setShareTimestamp] = useState(0);
  const [allowIframeTimestamp, setAllowIframeTimestamp] = useState(0);
  const { message } = App.useApp();
  const [processData, setProcessData] = useState<Omit<ProcessMetadata, 'bpmn'>>();

  const checkIfProcessShared = async () => {
    const res = await getProcess(processId as string, environment.spaceId);
    if ('error' in res) {
      console.log('Failed to fetch process');
    } else {
      const { sharedAs, allowIframeTimestamp, shareTimestamp } = res;
      setSharedAs(sharedAs as SharedAsType);
      setShareToken(shareToken);
      setShareTimestamp(shareTimestamp);
      setAllowIframeTimestamp(allowIframeTimestamp);
    }
  };

  const getProcessData = () => {
    return getProcess(processId as string, environment.spaceId)
      .then((res) => {
        if ('error' in res) {
        } else {
          setProcessData(res as any);
        }
      })
      .catch((error) => {
        console.error('Error fetching process data:', error);
      });
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleCopyXMLToClipboard = async () => {
    if (modeler) {
      const xml = await modeler.getXML();
      if (xml) {
        navigator.clipboard.writeText(xml);
        message.success('Copied to clipboard');
      }
    }
  };

  const shareWrapper = async (fn: (args: any) => Promise<void>, args: any) => {
    try {
      if (isSharing) return;
      setIsSharing(true);
      await fn(args);
    } catch (error) {
      console.error('Sharing failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareMobile = async (sharedAs: 'public' | 'protected') => {
    let link: string;
    try {
      let timestamp = shareTimestamp ? shareTimestamp : Date.now();

      link = await generateSharedViewerUrl({ processId, timestamp });
      await updateProcessGuestAccessRights(
        processId,
        {
          sharedAs: sharedAs,
          shareTimestamp: timestamp,
        },
        environment.spaceId,
      );
    } catch (err) {
      message.error('Failed to generate the sharing url for the process.');
      return;
    }

    const shareObject = {
      title: `${processData?.name} | PROCEED`,
      text: 'Here is a shared process for you',
      url: `${link}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareObject);
      } catch (err: any) {
        if (!err.toString().includes('AbortError')) {
          console.error(err);
        }
      }
    } else {
      navigator.clipboard.writeText(shareObject.url);
      message.success('Copied to clipboard');
    }
    checkIfProcessShared();
  };

  const handleShareButtonClick = async () => {
    setIsOpen(true);
    getProcessData();
    checkIfProcessShared();
  };

  useAddControlCallback('modeler', 'shift+enter', handleShareButtonClick, {
    dependencies: [],
  });

  const optionsMobile = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Process with Public Link',
      optionTitle: 'Share Process with Public Link',
      optionOnClick: () => shareWrapper(handleShareMobile, 'public'),
    },
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Process for Registered Users',
      optionTitle: 'Share Process for Registered Users',
      optionOnClick: () => handleShareMobile('protected'),
    },
    {
      optionIcon: <FileImageOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Process as Image',
      optionTitle: 'Share Process as Image',
      optionOnClick: () => shareWrapper(shareProcessImage, modeler),
    },
  ];

  const actionClickOptions = [
    async () => {
      setActiveIndex(0);
    },
    async () => {
      setActiveIndex(1);
    },
    async () => {
      setActiveIndex(2);
      try {
        if (await copyProcessImage(modeler!)) message.success('Copied to clipboard');
        else message.info('ClipboardAPI not supported in your browser');
      } catch (err) {
        message.error(`${err}`);
      }
      setActiveIndex(null);
    },
    () => {
      setActiveIndex(3);
      handleCopyXMLToClipboard();
      setActiveIndex(null);
    },
    () => {
      setActiveIndex(4);
      onExport();
      setActiveIndex(null);
    },
  ];

  useAddControlCallback(
    'modeler',
    'control+enter',
    () => {
      if (isOpen && activeIndex != null) actionClickOptions[activeIndex]();
    },
    { dependencies: [isOpen, activeIndex], level: 2, blocking: isOpen },
  );
  useAddControlCallback(
    'modeler',
    'left',
    () => {
      if (isOpen) {
        setActiveIndex((prev) => (prev == null || prev == 0 ? 0 : prev - 1));
      }
    },
    { dependencies: [isOpen, activeIndex] },
  );
  useAddControlCallback(
    'modeler',
    'right',
    () => {
      if (isOpen) {
        setActiveIndex((prev) =>
          prev == null || prev == optionsDesktop.length - 1 ? optionsDesktop.length - 1 : prev + 1,
        );
      }
    },
    { dependencies: [isOpen, activeIndex] },
  );

  // useAddControlCallback(
  //   'modeler',
  //   'left',
  //   () => {
  //     if (isOpen) {
  //       if (activeIndex === null || activeIndex === 0) {
  //         actionClickOptions[0]();
  //       } else {
  //         actionClickOptions[activeIndex - 1]();
  //       }
  //     }
  //   },
  //   { dependencies: [isOpen, activeIndex] },
  // );
  // useAddControlCallback(
  //   'modeler',
  //   'right',
  //   () => {
  //     if (isOpen) {
  //       if (activeIndex === null) {
  //         actionClickOptions[0]();
  //       } else if (activeIndex === actionClickOptions.length - 1) {
  //         actionClickOptions[actionClickOptions.length - 1]();
  //       } else {
  //         actionClickOptions[activeIndex + 1]();
  //       }
  //     }
  //   },
  //   { dependencies: [isOpen, activeIndex] },
  // );

  const optionsDesktop = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Public Link',
      optionTitle: 'Share Public Link',
      optionOnClick: actionClickOptions[0],
      subOption: (
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
      optionName: 'Embed in Website',
      optionTitle: 'Embed in Website',
      optionOnClick: actionClickOptions[1],
      subOption: (
        <ModelerShareModalOptionEmdedInWeb
          sharedAs={sharedAs as SharedAsType}
          allowIframeTimestamp={allowIframeTimestamp}
          refresh={checkIfProcessShared}
        />
      ),
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionTitle: 'Copy Diagram to Clipboard (PNG)',
      optionName: 'Copy Diagram as PNG',
      optionOnClick: actionClickOptions[2],
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Copy Diagram as XML',
      optionTitle: 'Copy BPMN to Clipboard (XML)',
      optionOnClick: actionClickOptions[3],
    },
    {
      optionIcon: <ExportOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Export as file',
      optionTitle: 'Export as file',
      optionOnClick: actionClickOptions[4],
    },
  ];

  return (
    <>
      <Modal
        title={<div style={{ textAlign: 'center' }}>Share</div>}
        open={isOpen}
        width={breakpoint.lg ? 750 : 320}
        closeIcon={false}
        onCancel={handleClose}
        zIndex={200}
        footer={
          <Button onClick={handleClose} style={{ border: '1px solid black' }}>
            Close
          </Button>
        }
      >
        <Space
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: breakpoint.lg ? 'center' : 'space-evenly',
            gap: 10,
          }}
        >
          {breakpoint.lg
            ? optionsDesktop.map((option, index) => (
                <ModelerShareModalOption
                  key={index}
                  optionIcon={option.optionIcon}
                  optionName={option.optionName}
                  optionTitle={option.optionTitle}
                  optionOnClick={option.optionOnClick}
                  isActive={index === activeIndex}
                />
              ))
            : optionsMobile.map((option, index) => (
                <ModelerShareModalOption
                  key={index}
                  optionIcon={option.optionIcon}
                  optionName={option.optionName}
                  optionTitle={option.optionTitle}
                  optionOnClick={option.optionOnClick}
                />
              ))}
        </Space>

        {breakpoint.lg && activeIndex !== null && optionsDesktop[activeIndex].subOption && (
          <>
            <Divider style={{ backgroundColor: '#000' }} />
            {optionsDesktop[activeIndex].subOption}
          </>
        )}
      </Modal>
      <Tooltip title="Share">
        <Button icon={<ShareAltOutlined />} onClick={() => handleShareButtonClick()} />
      </Tooltip>
    </>
  );
};

export default ModelerShareModalButton;
