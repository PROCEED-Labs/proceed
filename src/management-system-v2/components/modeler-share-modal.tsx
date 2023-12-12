import { FC, useState } from 'react';

import { Modal, Button, Tooltip, Space, Card, Divider } from 'antd';

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
import ModelerShareModalOptionProps from './modeler-share-modal-option';
import ModelerShareModalOptionPublicLink from './modeler-share-modal-option-public-link';
import ModelerShareModalOptionEmdedInWeb from './modeler-share-modal-option-embed-in-web';

type ShareModalProps = {
  onExport: () => void;
};

const ModelerShareModalButton: FC<ShareModalProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  const [isSharePublicLinkSelected, setIsSharePublicLinkSelected] = useState(false);

  const [isEmbedInWebsiteSelected, setIsEmebdInWebsiteSelected] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCopyXMLToClipboard = async () => {
    if (modeler) {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml) navigator.clipboard.writeText(xml);
    }
  };

  const handleSharePublicLinkClick = () => {
    setIsSharePublicLinkSelected(!isSharePublicLinkSelected);
    setIsEmebdInWebsiteSelected(false);
  };

  const handleEmbedInWebsiteClick = () => {
    setIsSharePublicLinkSelected(false);
    setIsEmebdInWebsiteSelected(!isEmbedInWebsiteSelected);
  };

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
          <ModelerShareModalOptionProps
            optionIcon={<LinkOutlined style={{ fontSize: '24px' }} />}
            optionName={'Share Public Link'}
            optionOnClick={handleSharePublicLinkClick}
            /* TODO  */
          />
          <ModelerShareModalOptionProps
            optionIcon={
              <span>
                <LeftOutlined style={{ fontSize: '24px' }} />
                <RightOutlined style={{ fontSize: '24px' }} />
              </span>
            }
            optionName={'Embed in Website'}
            optionOnClick={handleEmbedInWebsiteClick} /* TODO  */
          />
          <ModelerShareModalOptionProps
            optionIcon={<CopyOutlined style={{ fontSize: '24px' }} />}
            optionName={'Copy Diagram to Clipboard (PNG)'}
            optionOnClick={() => copyProcessImage(modeler)}
          />
          <ModelerShareModalOptionProps
            optionIcon={<CopyOutlined style={{ fontSize: '24px' }} />}
            optionName={'Copy BPMN to Clipboard (XML)'}
            optionOnClick={handleCopyXMLToClipboard}
          />
          <ModelerShareModalOptionProps
            optionIcon={<ExportOutlined style={{ fontSize: '24px' }} />}
            optionName={'Export as file'}
            optionOnClick={onExport}
          />
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
