import React, { FC, useEffect, useState } from 'react';
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
  generateProcessShareToken,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useParams } from 'next/navigation';
import { shareProcessImage } from '@/lib/process-export/copy-process-image';
import ModelerShareModalOption from './modeler-share-modal-option';
import { ProcessExportTypes } from '@/components/process-export';
import { getProcess } from '@/lib/data/processes';
import { Process } from '@/lib/data/process-schema';
import { error } from 'console';

type ShareModalProps = {
  onExport: () => void;
  onExportMobile: (type: ProcessExportTypes) => void;
};

const ModelerShareModalButton: FC<ShareModalProps> = ({ onExport, onExportMobile }) => {
  const { processId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const modeler = useModelerStateStore((state) => state.modeler);
  const breakpoint = Grid.useBreakpoint();
  const [shared, setShared] = useState(false);
  const [sharedAs, setSharedAs] = useState<'public' | 'protected'>('public');
  const [isSharing, setIsSharing] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const { message } = App.useApp();
  const [processData, setProcessData] = useState<Process | undefined>();

  const checkIfProcessShared = async () => {
    const { shared, sharedAs, shareToken } = await getProcess(processId as string);
    setShared(shared);
    setSharedAs(sharedAs);
    setShareToken(shareToken);
  };

  const getProcessData = () => {
    return getProcess(processId as string)
      .then((processData) => {
        setProcessData(processData);
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
    const { token } = await generateProcessShareToken({ processId });
    await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: sharedAs });

    const shareObject = {
      title: `${processData?.name} | PROCEED`,
      text: 'Here is a shared process for you',
      url: `${window.location.origin}/shared-viewer?token=${token}`,
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
  };

  const handleShareButtonClick = async () => {
    setIsOpen(true);
    getProcessData();
    checkIfProcessShared();
  };

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
      optionIcon: <FilePdfOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Process as PDF',
      optionTitle: 'Share Process as PDF',
      optionOnClick: () => onExportMobile('pdf'),
    },
    {
      optionIcon: <FileImageOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Process as Image',
      optionTitle: 'Share Process as Image',
      optionOnClick: () => shareWrapper(shareProcessImage, modeler),
    },
  ];

  const optionsDesktop = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Public Link',
      optionTitle: 'Share Public Link',
      optionOnClick: async () => {
        setActiveIndex(0);
      },
      subOption: (
        <ModelerShareModalOptionPublicLink
          shared={shared}
          sharedAs={sharedAs}
          shareToken={shareToken}
          refresh={checkIfProcessShared}
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
      optionOnClick: async () => {
        setActiveIndex(1);
      },
      subOption: (
        <ModelerShareModalOptionEmdedInWeb
          shared={shared}
          sharedAs={sharedAs}
          refresh={checkIfProcessShared}
        />
      ),
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionTitle: 'Copy Diagram to Clipboard (PNG)',
      optionName: 'Copy Diagram as PNG',
      optionOnClick: async () => {
        setActiveIndex(2);
        if (await copyProcessImage(modeler!)) {
          message.success('Copied to clipboard');
        } else {
          message.error('Error while copying');
        }
        setActiveIndex(null);
      },
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Copy Diagram as XML',
      optionTitle: 'Copy BPMN to Clipboard (XML)',
      optionOnClick: () => {
        setActiveIndex(3);
        handleCopyXMLToClipboard();
        setActiveIndex(null);
      },
    },
    {
      optionIcon: <ExportOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Export as file',
      optionTitle: 'Export as file',
      optionOnClick: () => {
        setActiveIndex(4);
        onExport();
        handleClose();
      },
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
