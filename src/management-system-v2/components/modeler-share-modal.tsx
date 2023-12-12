import { FC, useState } from 'react';
import { Modal, Button, Tooltip, Space, Card, Divider, message } from 'antd';
import {
  ShareAltOutlined,
  LinkOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import ModelerShareModalOptionPublicLink from './modeler-share-modal-option-public-link';
import ModelerShareModalOptionEmdedInWeb from './modeler-share-modal-option-embed-in-web';
import ModelerShareModalOption from './modeler-share-modal-option';

type ShareModalProps = {
  onExport: () => void;
};

const ModelerShareModalButton: FC<ShareModalProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSharePublicLinkSelected, setIsSharePublicLinkSelected] = useState(false);
  const [isEmbedInWebsiteSelected, setIsEmbedInWebsiteSelected] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const modeler = useModelerStateStore((state) => state.modeler);

  const handleClose = () => {
    setIsOpen(false);
    setIsSharePublicLinkSelected(false);
    setIsEmbedInWebsiteSelected(false);
    setActiveIndex(null);
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
    setIsSharePublicLinkSelected(index === 0);
    setIsEmbedInWebsiteSelected(index === 1);
  };

  const options = [
    {
      optionIcon: <LinkOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Share Public Link',
      optionOnClick: () => handleOptionClick(0),
    },
    {
      optionIcon: (
        <span>
          <LeftOutlined style={{ fontSize: '24px' }} />
          <RightOutlined style={{ fontSize: '24px' }} />
        </span>
      ),
      optionName: 'Embed in Website',
      optionOnClick: () => handleOptionClick(1),
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Copy Diagram to Clipboard (PNG)',
      optionOnClick: () => {
        handleOptionClick(2);
        copyProcessImage(modeler);
      },
    },
    {
      optionIcon: <CopyOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Copy BPMN to Clipboard (XML)',
      optionOnClick: () => {
        handleOptionClick(3);
        handleCopyXMLToClipboard();
      },
    },
    {
      optionIcon: <ExportOutlined style={{ fontSize: '24px' }} />,
      optionName: 'Export as file',
      optionOnClick: () => {
        handleOptionClick(4);
        onExport();
      },
    },
  ];

  return (
    <>
      <Modal
        title={<div style={{ textAlign: 'center' }}>Share</div>}
        open={isOpen}
        width={800}
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
            justifyContent: 'space-evenly',
          }}
        >
          {options.map((option, index) => (
            <ModelerShareModalOption
              key={index}
              optionIcon={option.optionIcon}
              optionName={option.optionName}
              optionOnClick={option.optionOnClick}
              isActive={index === activeIndex}
            />
          ))}
        </Space>
        {isSharePublicLinkSelected ? (
          <>
            <Divider style={{ backgroundColor: '#000' }} />
            <ModelerShareModalOptionPublicLink />
          </>
        ) : null}
        {isEmbedInWebsiteSelected ? (
          <>
            <Divider style={{ backgroundColor: 'black' }} />
            <ModelerShareModalOptionEmdedInWeb />
          </>
        ) : null}
      </Modal>
      <Tooltip title="Share">
        <Button icon={<ShareAltOutlined />} onClick={() => setIsOpen(true)} />
      </Tooltip>
    </>
  );
};

export default ModelerShareModalButton;
