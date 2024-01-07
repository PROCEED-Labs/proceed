import React, { FC, useState } from 'react';
import { Modal, Button, Tooltip, Space, Divider, message, Grid } from 'antd';
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
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import ModelerShareModalOptionPublicLink from './modeler-share-modal-option-public-link';
import ModelerShareModalOptionEmdedInWeb from './modeler-share-modal-option-embed-in-web';
import Image from 'next/image';
import { generateToken, updateProcessGuestAccessRights } from '@/actions/actions';
import { useParams } from 'next/navigation';
import { shareProcessImage } from '@/lib/process-export/share-process-image-webshare-api';
import ModelerShareModalOption from './modeler-share-modal-option';
import { ProcessExportOptions } from '@/lib/process-export/export-preparation';

type ShareModalProps = {
  onExport: () => void;
  onExportMobile: (type: ProcessExportOptions['type']) => void;
};

const ModelerShareModalButton: FC<ShareModalProps> = ({ onExport, onExportMobile }) => {
  const { processId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const modeler = useModelerStateStore((state) => state.modeler);
  const breakpoint = Grid.useBreakpoint();
  const [token, setToken] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleCopyXMLToClipboard = async () => {
    if (modeler) {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml) {
        navigator.clipboard.writeText(xml);
        message.success('Copied to clipboard');
      }
    }
  };

  const handleOptionClick = (index: number) => {
    setActiveIndex(index);
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
    if (navigator.share) {
      try {
        const { token, processData } = await generateToken({ processId });
        await navigator.share({
          title: `${processData.definitionName} | PROCEED`,
          text: 'Here is a shared process for you',
          url: `${window.location.origin}/shared-viewer?token=${token}`,
        });
        await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: sharedAs });
      } catch (err: any) {
        if (!err.toString().includes('AbortError')) {
          throw new Error('Error: ', { cause: err });
        }
      }
    } else {
      message.error('Web Share API not supported. Implement your own fallback here.');
    }
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
      optionOnClick: () => shareWrapper(handleShareMobile, 'protected'),
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
    {
      optionIcon: (
        <Image priority src="/proceed-icon.png" height={24} width={40} alt="proceed logo" />
      ),
      optionName: 'Share Process as BPMN File',
      optionTitle: 'Share Process as BPMN File',
      optionOnClick: () => onExportMobile('bpmn'),
    },
  ];

  const optionsDesktop = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Public Link',
      optionTitle: 'Share Public Link',
      optionOnClick: () => handleOptionClick(0),
      subOption: <ModelerShareModalOptionPublicLink />,
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
        handleOptionClick(1);
        const { token } = await generateToken({ processId });
        setToken(token);
        updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
      },

      subOption: <ModelerShareModalOptionEmdedInWeb accessToken={token} />,
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionTitle: 'Copy Diagram to Clipboard (PNG)',
      optionName: 'Copy Diagram as PNG',
      optionOnClick: () => {
        handleOptionClick(2);
        copyProcessImage(modeler);
        setActiveIndex(null);
      },
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Copy Diagram as XML',
      optionTitle: 'Copy BPMN to Clipboard (XML)',
      optionOnClick: () => {
        handleOptionClick(3);
        handleCopyXMLToClipboard();
        setActiveIndex(null);
      },
    },
    {
      optionIcon: <ExportOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Export as file',
      optionTitle: 'Export as file',
      optionOnClick: () => {
        handleOptionClick(4);
        onExport();
        setActiveIndex(null);
      },
    },
  ];

  return (
    <>
      <Modal
        title={<div style={{ textAlign: 'center' }}>Share</div>}
        open={isOpen}
        width={750}
        closeIcon={false}
        onCancel={handleClose}
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
            gap: 15,
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
        <Button icon={<ShareAltOutlined />} onClick={() => setIsOpen(true)} />
      </Tooltip>
    </>
  );
};

export default ModelerShareModalButton;
